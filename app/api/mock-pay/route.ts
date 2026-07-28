import { NextResponse } from "next/server";
import { getRecord, updateRecord } from "../../../lib/db";

export const runtime = "nodejs";

/** Paiement simulé (V1 sans Stripe). Marque la commande payée. */
export async function POST(req: Request) {
  if (process.env.STRIPE_SECRET_KEY)
    return NextResponse.json({ error: "paiement réel actif — mock désactivé" }, { status: 403 });
  const { report_id } = await req.json();
  const rec = await getRecord(report_id);
  if (!rec) return NextResponse.json({ error: "rapport introuvable" }, { status: 404 });
  if (rec.status === "preview_ready") await updateRecord(report_id, { status: "paid" });
  return NextResponse.json({ ok: true, url: `/rapport/${report_id}` });
}
