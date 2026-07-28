import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getRecord, updateRecord } from "../../../lib/db";

export const runtime = "nodejs";

/** Webhook Stripe : checkout.session.completed -> commande payée.
 * Signature vérifiée avec STRIPE_WEBHOOK_SECRET (whsec_…). */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const payload = await req.text();
  const sigHeader = req.headers.get("stripe-signature") ?? "";

  if (secret) {
    const parts = Object.fromEntries(sigHeader.split(",").map((p) => p.split("=") as [string, string]));
    const t = parts["t"], v1 = parts["v1"];
    if (!t || !v1) return NextResponse.json({ error: "signature absente" }, { status: 400 });
    const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
    const a = Buffer.from(expected), b = Buffer.from(v1);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      return NextResponse.json({ error: "signature invalide" }, { status: 400 });
    if (Math.abs(Date.now() / 1000 - Number(t)) > 300)
      return NextResponse.json({ error: "signature expirée" }, { status: 400 });
  } else if (process.env.STRIPE_SECRET_KEY) {
    // clé Stripe présente mais pas de secret webhook : refus (jamais de paiement non vérifié)
    return NextResponse.json({ error: "webhook non configuré" }, { status: 500 });
  }

  const event = JSON.parse(payload);
  if (event.type === "checkout.session.completed") {
    const rid = event.data?.object?.metadata?.report_id;
    if (rid) {
      const rec = await getRecord(rid);
      if (rec && rec.status === "preview_ready") await updateRecord(rid, { status: "paid" });
    }
  }
  return NextResponse.json({ received: true });
}
