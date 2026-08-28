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
    /* Stripe affiche cette image dans le récapitulatif. Mesuré dans le DOM de
       checkout.stripe.com : le conteneur (.LineItem-imageContainer) fait 42x42
       pixels, fixes, et l'image y est contenue sans être recadrée. Trois
       conséquences, toutes vérifiées plutôt que supposées :

       — une image en portrait perd de la largeur (1000x1300 était rendue en
         32x42, soit 40 % de surface en moins qu'un carré). L'image doit être
         carrée ;
       — à 42 pixels, un texte ou un décor ne se lit pas. Seul un visage cadré
         serré survit ;
       — un fond blanc disparaît dans la page, elle aussi blanche. D'où le fond
         bleu plein.

       Il n'existe aucun réglage Stripe pour agrandir cette vignette : la seule
       alternative serait de quitter Checkout hébergé pour Elements.

       Enfin, changer de nom de fichier n'est pas de la coquetterie. Stripe
       télécharge l'image une fois et la sert depuis son propre CDN : remplacer
       le fichier à la même URL ne change rien pour le client. */
    "line_items[0][price_data][product_data][images][0]":
      "https://www.franklinai.fr/checkout-franklin-2.png",
    "line_items[0][quantity]": "1",
    /* Affiche « Ajouter un code promo » sur la page de paiement.
       Les codes se créent dans le Dashboard Stripe (Produits → Coupons),
       ce qui permet de faire un tarif de lancement sans toucher au prix
       affiché sur le site — et de mesurer qui vient d'où. */
    allow_promotion_codes: "true",
    success_url: `${origin}/rapport/${report_id}?paid=1`,
    cancel_url: `${origin}/analyse`,
    "metadata[report_id]": report_id,
    "metadata[prix]": PRIX_AFFICHE,
  });
  /* On ne pré-remplit l'email que si on en a un — les anciens enregistrements
     en ont, les nouveaux non. Stripe le demande lui-même quand le paramètre est
     absent, et cet email-là est validé avant le paiement : plus fiable que celui
     tapé au pouce dans notre formulaire. Envoyer une chaîne vide ferait échouer
     la création de la session. */
  if (rec.email && rec.email.includes("@")) body.set("customer_email", rec.email);

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
