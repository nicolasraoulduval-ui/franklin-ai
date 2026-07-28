import { NextResponse } from "next/server";
import { getRecord } from "../../../lib/db";

export const runtime = "nodejs";

/** V1 : sans STRIPE_SECRET_KEY -> paiement simulé (page /paiement-mock).
 *  Avec STRIPE_SECRET_KEY -> Stripe Checkout réel (12,90 €, paiement unique). */
export async function POST(req: Request) {
  const { report_id } = await req.json();
  const rec = await getRecord(report_id);
  if (!rec) return NextResponse.json({ error: "rapport introuvable" }, { status: 404 });

  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) return NextResponse.json({ url: `/paiement-mock?rid=${report_id}` });

  const origin = req.headers.get("origin") ?? "https://www.franklinai.fr";
  const body = new URLSearchParams({
    mode: "payment",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": "1290",
    "line_items[0][price_data][product_data][name]": "Rapport Franklin — ton portrait financier",
    "line_items[0][quantity]": "1",
    customer_email: rec.email,
    success_url: `${origin}/rapport/${report_id}?paid=1`,
    cancel_url: `${origin}/analyse`,
    "metadata[report_id]": report_id,
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${sk}`, "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    console.error("stripe:", await res.text());
    return NextResponse.json({ error: "paiement indisponible" }, { status: 502 });
  }
  const session = await res.json();
  return NextResponse.json({ url: session.url });
}
