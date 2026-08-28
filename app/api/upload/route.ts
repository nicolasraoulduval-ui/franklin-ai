import { NextResponse } from "next/server";
import { parsePdf } from "../../../lib/vision";
import { enrich, selfPatternsFromHolder } from "../../../lib/enrich";
import { computeStats } from "../../../lib/stats";
import { calculerNote } from "../../../lib/note";
import { calculerSi } from "../../../lib/si";
import { buildPreview } from "../../../lib/preview";
import { createRecord } from "../../../lib/db";
import { ipDe, verifierDebit } from "../../../lib/ratelimit";
import { journaliserErreur } from "../../../lib/evt";
import type { RawTransaction } from "../../../lib/stats";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_SIZE = 12 * 1024 * 1024;
const MAX_FILES = 12;

/** Distingue une panne de NOTRE côté d'un fichier réellement illisible.
 *  Sans ça, on répond « vérifie ton fichier » à quelqu'un dont le relevé est
 *  parfait — il part et ne revient pas. */
function diagnostic(e: unknown): { error: string; status: number } {
  const msg = e instanceof Error ? e.message : String(e);
  const m = msg.toLowerCase();

  // crédit épuisé, clé absente ou invalide, quota, surcharge : notre problème
  if (
    /credit|quota|billing|payment required|insufficient/.test(m) ||
    /401|403|402|429|529/.test(m) ||
    /unauthorized|authentication|api[_ -]?key|rate.?limit|overloaded/.test(m)
  ) {
    return {
      error:
        "Franklin est momentanément indisponible — ça vient de nous, pas de ton relevé. " +
        "Réessaie dans quelques minutes. Ton fichier n'a pas été conservé.",
      status: 503,
    };
  }

  /* Extraction incohérente : le contrôle au centime a fait son travail, on a
     refusé de livrer des chiffres faux. Mais c'est NOTRE lecture qui a échoué,
     pas le document. Une cliente a reçu « vérifie que c'est bien un relevé
     bancaire, pas une photo » alors qu'elle avait envoyé un export PDF
     impeccable de sa banque. Elle n'est pas revenue. On ne renvoie plus jamais
     quelqu'un à son fichier quand la faute est chez nous. */
  if (/extraction incohérente|incoherente/.test(m)) {
    return {
      error:
        "Franklin a lu ton relevé mais n'est pas arrivé à faire tomber les totaux au " +
        "centime près — et il refuse de te livrer des chiffres dont il n'est pas sûr. " +
        "Ça vient de nous, pas de ton document. Réessaie : il repart de zéro à chaque " +
        "fois et y arrive le plus souvent. Si ça bloque encore, écris-nous, on le lira " +
        "à la main.",
      status: 503,
    };
  }

  // délai dépassé : gros relevé ou API lente
  if (/timeout|timed out|aborted|econnreset|fetch failed/.test(m)) {
    return {
      error:
        "L'analyse a mis trop de temps. Réessaie avec moins de relevés à la fois — " +
        "ton fichier n'a pas été conservé.",
      status: 504,
    };
  }

  // là seulement, le fichier est réellement en cause
  return {
    error:
      "Franklin n'a pas réussi à lire ce document. Vérifie que c'est bien un relevé " +
      "bancaire au format PDF, exporté depuis ton application bancaire (pas une photo " +
      "ni une capture d'écran).",
    status: 422,
  };
}

export async function POST(req: Request) {
  /* Le plafond passe avant tout le reste : chaque analyse coûte deux minutes de
     calcul et des appels facturés. Sans ça, un script trivial épuise le crédit
     API en quelques minutes et met le service à genoux. */
  const ip = ipDe(req);
  const debit = await verifierDebit(ip);
  if (!debit.autorise) {
    return NextResponse.json(
      { error: debit.message },
      { status: 429, headers: { "retry-after": String(debit.reessayerDans ?? 3600) } },
    );
  }

  /* La lecture du formulaire est isolée : si elle échoue, le problème est la
     requête elle-même, pas le contenu d'un fichier. Auparavant l'exception
     tombait dans diagnostic() et répondait « vérifie ton relevé » à quelqu'un
     qui n'en avait envoyé aucun. */
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "requête illisible" }, { status: 400 });
  }

  const email = String(form.get("email") ?? "").trim();
  const prenom = String(form.get("prenom") ?? "").trim() || "toi";
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  /* L'email n'est plus demandé avant l'aperçu : le rapport ne s'expédie plus,
     et Stripe le collecte au paiement. Le champ reste accepté si un appel plus
     ancien l'envoie encore, mais il ne bloque plus personne. */
  if (!files.length || files.length > MAX_FILES)
    return NextResponse.json({ error: `1 à ${MAX_FILES} relevés PDF` }, { status: 400 });
  for (const f of files)
    if (f.size > MAX_SIZE)
      return NextResponse.json({ error: `${f.name} dépasse 12 Mo` }, { status: 400 });

  try {
    /* Lecture en parallèle. En séquentiel, à 118 s mesurés par relevé, trois
       fichiers dépassaient déjà maxDuration = 300 s — alors que la page d'accueil
       encourage explicitement à en déposer six. Le client perdait cinq minutes
       puis une erreur. En parallèle, six relevés tiennent dans le même budget
       qu'un seul. */
    const lus = await Promise.all(
      files.map(async (f) => {
        const buf = Buffer.from(await f.arrayBuffer());
        return parsePdf(buf); // le fichier ne vit qu'ici — jamais écrit sur disque
      }),
    );

    const titulaire = lus.find((r) => r.titulaire)?.titulaire ?? "";
    let allTx: RawTransaction[] = [];
    for (const vr of lus) allTx = allTx.concat(enrich(vr));

    // aucune transaction : le PDF a été lu mais ne contient pas de relevé
    if (!allTx.length)
      return NextResponse.json(
        {
          error:
            "Aucune transaction trouvée dans ce document. Vérifie qu'il s'agit bien " +
            "d'un relevé de compte et non d'un RIB, d'une facture ou d'un récapitulatif annuel.",
        },
        { status: 422 },
      );

    const stats = computeStats(allTx, { selfPatterns: selfPatternsFromHolder(titulaire) });
    /* La note de gestion est calculée ici, par du code, jamais par le modèle.
       En vivant dans le stats.json, ses chiffres deviennent automatiquement
       autorisés par le validateur de chiffres orphelins. */
    stats.note_gestion = calculerNote(stats);
    /* Même principe pour les « Si… » : les montants et les équivalences sortent
       du code, le modèle n'écrira que l'introduction et la chute. */
    stats.si_alors = calculerSi(stats);

    const preview = buildPreview(stats as Record<string, unknown>);
    // purge : les transactions sortent du scope ici ; seules les stats agrégées sont conservées
    const rec = await createRecord({ email, prenom, status: "preview_ready", stats, preview });
    return NextResponse.json({ report_id: rec.token, preview, nb_releves: files.length });
  } catch (e) {
    const { error, status } = diagnostic(e);
    // 503 et 504 sont de notre côté : ils méritent une alerte, pas une ligne de log perdue.
    await journaliserErreur("api/upload", e, status >= 500);
    return NextResponse.json({ error }, { status });
  }
}
