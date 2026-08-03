import { LANDING_HTML } from "../lib/landing-html";
import { PRIX_CENTIMES } from "../lib/prix";
import { CSS_V2, STEPS_V2, SHARE_V2, EXPORT_V2, JS_V2 } from "../lib/sections";

export const runtime = "nodejs";

/* La landing d'origine est une chaîne HTML de 24 Ko héritée du prototype.
   On ne la réécrit pas : on opère dessus au moment de servir la page.
   Les découpes se font par index plutôt que par correspondance exacte —
   une différence d'indentation suffirait à faire échouer un replace(). */

/** Renvoie [début, fin] de la section qui commence par `ouverture`, fermeture incluse. */
function bornes(html: string, ouverture: string): [number, number] | null {
  const d = html.indexOf(ouverture);
  if (d < 0) return null;
  const f = html.indexOf("</section>", d);
  if (f < 0) return null;
  return [d, f + "</section>".length];
}

function remplaceSection(html: string, ouverture: string, parQuoi: string): string {
  const b = bornes(html, ouverture);
  if (!b) return html; // la page reste servie même si la structure a changé
  return html.slice(0, b[0]) + parQuoi + html.slice(b[1]);
}

function supprimeSection(html: string, ouverture: string): string {
  const b = bornes(html, ouverture);
  if (!b) return html;
  return (html.slice(0, b[0]) + html.slice(b[1])).replace(/\n{3,}/g, "\n\n");
}

let html = LANDING_HTML;

// 1 · le prix disparaît de la page d'accueil.
//     Il reste affiché avant tout paiement, sur la page Stripe, et dans les CGV.
//     Objectif : ne pas faire arbitrer sur un chiffre quelqu'un qui n'a pas
//     encore vu ce que Franklin écrit. La réassurance « aperçu gratuit, sans
//     carte bancaire » est reprise sous les étapes pour ne pas la perdre.
html = supprimeSection(html, '<section class="pricing" id="prix">');

// 2 · les trois étapes montrent ce qu'elles font, au lieu de le décrire
html = remplaceSection(html, '<section class="steps">', STEPS_V2);

// 3 · deux sections nouvelles, insérées après les étapes :
//     le partage (seule boucle d'acquisition gratuite), puis la marche à
//     suivre pour récupérer un relevé (seul vrai frein à l'entrée).
const apresEtapes = html.indexOf("</section>", html.indexOf('<section class="steps">')) + "</section>".length;
html = html.slice(0, apresEtapes) + "\n\n" + SHARE_V2 + "\n\n" + EXPORT_V2 + html.slice(apresEtapes);

// 4 · CSS et JS des nouvelles sections
html = html.replace("</style>", CSS_V2 + "\n</style>");
html = html.replace("</body>", JS_V2 + "\n</body>");

// 5 · le prix reste écrit en dur dans la chaîne héritée ; on le réaligne
//     sur la source unique au cas où il subsisterait une mention ailleurs
html = html.split("12,90").join((PRIX_CENTIMES / 100).toFixed(2).replace(".", ","));

export async function GET() {
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
