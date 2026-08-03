import { getRecord, updateRecord, deleteRecord } from "../../../lib/db";
import { generateRapport } from "../../../lib/franklin";
import { renderRapport } from "../../../lib/render";
import { rapportEnPdf } from "../../../lib/pdf";
import { sendReportEmail } from "../../../lib/email";

export const runtime = "nodejs";
export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  return new Response(rec.report_html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function DELETE(_req: Request, { params }: { params: { token: string } }) {
  await deleteRecord(params.token);
  return new Response(null, { status: 204 });
}
