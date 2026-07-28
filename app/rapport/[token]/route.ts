import { getRecord, updateRecord, deleteRecord } from "../../../lib/db";
import { generateRapport } from "../../../lib/franklin";
import { renderRapport } from "../../../lib/render";

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
    const html = renderRapport(rapport, rec.stats as Record<string, unknown>, rec.prenom, new Date().toLocaleDateString("fr-FR"));
    await updateRecord(params.token, { report_html: html, status: "ready" });
    rec.report_html = html;
  }
  return new Response(rec.report_html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function DELETE(_req: Request, { params }: { params: { token: string } }) {
  await deleteRecord(params.token);
  return new Response(null, { status: 204 });
}
