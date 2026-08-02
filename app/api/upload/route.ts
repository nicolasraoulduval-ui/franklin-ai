import { NextResponse } from "next/server";
import { parsePdf } from "../../../lib/vision";
import { enrich, selfPatternsFromHolder } from "../../../lib/enrich";
import { computeStats } from "../../../lib/stats";
import { buildPreview } from "../../../lib/preview";
import { createRecord } from "../../../lib/db";
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
  try {
    const form = await req.formData();
    const email = String(form.get("email") ?? "").trim();
    const prenom = String(form.get("prenom") ?? "").trim() || "toi";
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return NextResponse.json({ error: "email invalide" }, { status: 400 });
    if (!files.length || files.length > MAX_FILES)
      return NextResponse.json({ error: `1 à ${MAX_FILES} fichiers PDF` }, { status: 400 });

    let allTx: RawTransaction[] = [];
    let titulaire = "";
    for (const f of files) {
      if (f.size > MAX_SIZE) return NextResponse.json({ error: `${f.name} dépasse 12 Mo` }, { status: 400 });
      const buf = Buffer.from(await f.arrayBuffer());
      const vr = await parsePdf(buf); // le fichier ne vit qu'ici — jamais écrit sur disque
      titulaire ||= vr.titulaire;
      allTx = allTx.concat(enrich(vr));
    }

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
    const preview = buildPreview(stats as Record<string, unknown>);
    // purge : les transactions sortent du scope ici ; seules les stats agrégées sont conservées
    const rec = await createRecord({ email, prenom, status: "preview_ready", stats, preview });
    return NextResponse.json({ report_id: rec.token, preview, nb_releves: files.length });
  } catch (e) {
    console.error("upload:", e);
    const { error, status } = diagnostic(e);
    return NextResponse.json({ error }, { status });
  }
}
