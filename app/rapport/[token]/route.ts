import { getRecord, updateRecord, deleteRecord } from "../../../lib/db";
import { generateRapport } from "../../../lib/franklin";
import { renderRapport } from "../../../lib/render";
import { rapportEnPdf } from "../../../lib/pdf";
import { sendReportEmail } from "../../../lib/email";

export const runtime = "nodejs";
export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* Bouton de téléchargement, injecté dans le rapport au moment de le servir.
 *
 *  Il déclenche l'impression du navigateur, qui propose « Enregistrer au
 *  format PDF ». Trois raisons de faire comme ça plutôt qu'une route serveur :
 *  ça marche sur les rapports déjà générés, ça ne demande aucun stockage
 *  supplémentaire, et le fichier obtenu est exactement la page que le client
 *  a sous les yeux.
 *
 *  Surtout : la livraison ne dépend plus de l'email. Quelqu'un qui a payé
 *  repart avec son rapport même si l'envoi échoue ou finit en indésirables. */
const BOUTON_PDF = `
<style>
  #fr-dl{position:fixed;right:22px;bottom:22px;z-index:9999;
    font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;font-size:13px;
    background:#2f4df0;color:#fff;border:2.5px solid #14161f;border-radius:11px;
    padding:13px 18px;cursor:pointer;box-shadow:4px 4px 0 #14161f;
    transition:transform .12s,box-shadow .12s}
  #fr-dl:hover{transform:translate(2px,2px);box-shadow:2px 2px 0 #14161f}
  #fr-dl svg{vertical-align:-2px;margin-right:7px}
  @media print{
    #fr-dl{display:none !important}
    .suppr,#suppr,[data-noprint]{display:none !important}
    body{background:#fff}
    @page{margin:14mm}
  }
  @media(max-width:620px){#fr-dl{right:14px;bottom:14px;padding:11px 15px;font-size:12px}}
</style>
<button id="fr-dl" onclick="window.print()">
  <svg width="13" height="14" viewBox="0 0 13 14" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6.5 1v8M3 6l3.5 3.5L10 6M1 12.5h11"/>
  </svg>TÉLÉCHARGER EN PDF
</button>`;


export async function GET(req: Request, { params }: { params: { token: string } }) {
  let rec = await getRecord(params.token);
  if (!rec) return new Response("Rapport introuvable ou supprimé.", { status: 404 });

  // retour de Stripe : le webhook peut arriver quelques secondes après la redirection
  const paidParam = new URL(req.url).searchParams.get("paid") === "1";
  for (let i = 0; rec.status === "preview_ready" && paidParam && i < 5; i++) {
    await sleep(2000);
    rec = (await getRecord(params.token))!;
  }
  if (rec.status === "preview_ready") return new Response("Rapport non payé.", { status: 402 });

  if (!rec.report_html) {
    const rapport = await generateRapport(rec.stats, rec.prenom);
    const date = new Date().toLocaleDateString("fr-FR");
    const html = renderRapport(rapport, rec.stats as Record<string, unknown>, rec.prenom, date);
    await updateRecord(params.token, { report_html: html, status: "ready" });
    rec.report_html = html;

    /* Le PDF ne peut être fabriqué qu'ici : c'est le seul endroit où l'on tient
       encore l'objet Rapport structuré (seul le HTML est stocké ensuite).
       On envoie donc l'email de livraison à ce moment, avec la pièce jointe —
       un seul email, et il contient le rapport. Ce bloc ne s'exécute qu'une
       fois, puisqu'il est gardé par l'absence de report_html.
       Si l'envoi échoue, on ne bloque pas l'affichage : le client a sa page. */
    try {
      const pdf = await rapportEnPdf(rapport, rec.prenom, date);
      await sendReportEmail(
        rec.email,
        rec.prenom,
        `https://www.franklinai.fr/rapport/${params.token}`,
        { filename: `rapport-franklin-${rec.prenom.toLowerCase()}.pdf`, content: pdf },
      );
    } catch (e) {
      console.error("pdf/email:", e);
    }
  }
  const page = (rec.report_html ?? "").includes("</body>")
    ? rec.report_html!.replace("</body>", BOUTON_PDF + "</body>")
    : (rec.report_html ?? "") + BOUTON_PDF;
  return new Response(page, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function DELETE(_req: Request, { params }: { params: { token: string } }) {
  await deleteRecord(params.token);
  return new Response(null, { status: 204 });
}
