import { NextResponse } from "next/server";
import { getRecord } from "../../../lib/db";
import { PRIX_CENTIMES, PRIX_AFFICHE } from "../../../lib/prix";

export const runtime = "nodejs";

/** V1 : sans STRIPE_SECRET_KEY -> paiement simulé (page /paiement-mock).
 *  Avec STRIPE_SECRET_KEY -> Stripe Checkout réel, paiement unique. */
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
       — Link n'est plus proposé comme moyen de paiement ;
       — Apple Pay et Google Pay sont des portefeuilles rattachés à "card" :
         Stripe les affiche en bouton express tout en haut dès que le
         navigateur en déclare un.
       Note : la reconnaissance Link par email se désactive uniquement dans
       le Dashboard (Paramètres → Moyens de paiement → Link). */
    "payment_method_types[0]": "card",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(PRIX_CENTIMES),
    "line_items[0][price_data][product_data][name]": "Rapport Franklin — ton portrait financier",
    "line_items[0][price_data][product_data][description]":
      "Franklin a tout lu. Il n'a rien oublié, et absolument aucune pudeur.",
    /* Stripe affiche cette image dans le récapitulatif : c'est le dernier écran
       avant de payer, et il était vide. L'URL doit être publiquement accessible. */
    "line_items[0][price_data][product_data][images][0]":
      "https://www.franklinai.fr/checkout-franklin.png",
    "line_items[0][quantity]": "1",
    /* Affiche « Ajouter un code promo » sur la page de paiement.
       Les codes se créent dans le Dashboard Stripe (Produits → Coupons),
       ce qui permet de faire un tarif de lancement sans toucher au prix
       affiché sur le site — et de mesurer qui vient d'où. */
    allow_promotion_codes: "true",
    customer_email: rec.email,
    success_url: `${origin}/rapport/${report_id}?paid=1`,
    cancel_url: `${origin}/analyse`,
    "metadata[report_id]": report_id,
    "metadata[prix]": PRIX_AFFICHE,
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
