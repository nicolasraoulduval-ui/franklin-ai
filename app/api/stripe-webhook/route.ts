import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getRecord, updateRecord } from "../../../lib/db";
import { notifierVente } from "../../../lib/evt";

export const runtime = "nodejs";

/** Webhook Stripe : checkout.session.completed -> commande payée.
 * Signature vérifiée avec STRIPE_WEBHOOK_SECRET (whsec_…).
 *
 * L'email de livraison n'est PLUS envoyé ici. Il part depuis
 * /rapport/[token], au moment où le rapport est réellement écrit : c'est le
 * seul endroit où l'on dispose de l'objet structuré nécessaire au PDF.
 * Le webhook doit répondre à Stripe en quelques secondes ; générer le rapport
 * ici (1 à 2 minutes) provoquerait un timeout et des relances en boucle. */
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
      if (rec && rec.status === "preview_ready") {
        await updateRecord(rid, { status: "paid" });
        /* Une vente sans notification, c'est une vente qu'on découvre trois jours
           plus tard en fouillant la base. On prévient tout de suite, avec de quoi
           réagir : qui, combien de relevés, quelle note, et le lien du rapport. */
        /* L'email vient désormais de Stripe : c'est le seul qu'on ait, et c'est
           aussi le seul qui ait été confirmé avant un paiement. On retombe sur
           celui de l'enregistrement pour les commandes créées avant le retrait
           du champ. */
        const emailClient =
          event.data?.object?.customer_details?.email ||
          event.data?.object?.customer_email ||
          rec.email ||
          "non communiqué";
        await notifierVente({
          prenom: rec.prenom,
          email: emailClient,
          token: rid,
          centimes: event.data?.object?.amount_total,
          stats: rec.stats as Record<string, unknown>,
        });
      }
    }
  }
  return NextResponse.json({ received: true });
}
