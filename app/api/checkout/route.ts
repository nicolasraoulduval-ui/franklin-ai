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
    /* On fige les moyens de paiement sur "card" au lieu de laisser Stripe
       piocher dans la config du Dashboard. Deux effets :
       — Link n'est plus proposé (c'est un payment_method_type distinct, donc
         l'exclure de cette liste le retire de la page) ;
       — Apple Pay et Google Pay sont des portefeuilles rattachés à "card" :
         Stripe les affiche en bouton express tout en haut dès que le
         navigateur en déclare un. Sur Safari/iOS avec une carte dans Wallet,
         Apple Pay devient donc l'option d'entrée, et le formulaire carte
         classique reste disponible juste en dessous. */
    "payment_method_types[0]": "card",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": "1290",
    "line_items[0][price_data][product_data][name]": "Rapport Franklin — ton portrait financier",
    "line_items[0][price_data][product_data][description]":
      "Ton archétype, tes grands classiques, ce que ça te coûte vraiment, le verdict, " +
      "et 4 cartes à partager (sans aucun montant).",
    /* Stripe affiche cette image dans le récapitulatif : c'est le dernier écran
       avant de payer, et il était vide. L'URL doit être publiquement accessible. */
    "line_items[0][price_data][product_data][images][0]":
      "https://www.franklinai.fr/checkout-franklin.png",
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
