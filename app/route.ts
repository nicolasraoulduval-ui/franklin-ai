import { LANDING_HTML } from "../lib/landing-html";
import { PRIX_CENTIMES, PRIX_AFFICHE } from "../lib/prix";

export const runtime = "nodejs";

/* La landing est une chaîne HTML de 24 Ko héritée du prototype : le prix y est
   écrit en dur, et le symbole € vit dans sa propre balise
   (`12,90<small> €</small>`). Plutôt que de laisser ce chiffre diverger une
   fois de plus de celui débité par Stripe, on le réécrit au moment de servir
   la page, depuis la source unique.
   À supprimer le jour où la landing sera découpée en composants. */
const ANCIEN = "12,90";
const NOUVEAU = (PRIX_CENTIMES / 100).toFixed(2).replace(".", ",");

const html = LANDING_HTML
  // le bloc tarif : "12,90<small> €</small>"
  .split(ANCIEN).join(NOUVEAU)
  // toute mention en clair ailleurs dans la page
  .split(`${ANCIEN} €`).join(PRIX_AFFICHE);

export async function GET() {
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
