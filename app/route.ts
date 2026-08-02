import { LANDING_HTML } from "../lib/landing-html";
import { PRIX_AFFICHE } from "../lib/prix";

export const runtime = "nodejs";

/* La landing est une chaîne HTML de 24 Ko héritée du prototype : le prix y est
   écrit en dur. Plutôt que de le laisser diverger une fois de plus, on le
   réécrit au moment de servir la page, à partir de la source unique.
   À supprimer le jour où la landing sera découpée en composants. */
const PRIX_HERITES = /\b\d{1,2},\d{2}\s*€/g;
const html = LANDING_HTML.replace(PRIX_HERITES, (m) =>
  // on ne touche qu'aux prix du produit, pas aux montants d'exemple du rapport
  m.replace(/\s+/g, " ") === "12,90 €" ? PRIX_AFFICHE : m,
);

export async function GET() {
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
