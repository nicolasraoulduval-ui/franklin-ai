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
        /* paid_at démarre le chronomètre des 120 secondes ; sans lui, aucun délai
           n'est mesurable après coup — c'est ce qui a rendu l'incident du 13/09 invisible. */
        await updateRecord(rid, { status: "paid", paid_at: new Date().toISOString() });
        /* Le rapport n'est écrit qu'à la première visite de /rapport/<token> :
           c'est le navigateur du client qui déclenche la rédaction. Celui qui
           ferme l'onglet avant d'être redirigé par Stripe payait donc pour rien,
           sans que rien ne le signale — pas d'erreur, juste un vide. C'est arrivé
           le 13/09/2026, et depuis que le champ e-mail a quitté le tunnel, il n'y
           avait même plus de quoi prévenir le client.

           On réveille la page ici, où l'appel ne dépend plus du navigateur de
           personne. On n'attend pas la fin : la rédaction prend une à deux minutes
           et se poursuit dans sa propre invocation. Le délai dépassé au bout de
           quatre secondes est donc le cas normal, pas une panne — et Stripe, lui,
           veut sa réponse tout de suite. */
        const origine = new URL(req.url).origin;
        /* POST, pas GET : le GET rend l'écran d'attente, c'est le POST qui écrit
           le rapport. Le premier jet de ce correctif faisait un GET et ne
           fabriquait donc rien du tout. Mesuré le 13/09 : la fabrication prend
           une trentaine de secondes, on lui en laisse cinquante avant de rendre
           la main à Stripe, qui ne patiente pas indéfiniment. Le POST est
           idempotent : si le client arrive entretemps, rien n'est écrit deux fois. */
        await fetch(`${origine}/rapport/${rid}`, {
          method: "POST",
          signal: AbortSignal.timeout(50_000),
          cache: "no-store",
        }).catch(() => {});
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
