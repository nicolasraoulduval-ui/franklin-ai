import { LANDING_HTML } from "../lib/landing-html";
import { PRIX_CENTIMES } from "../lib/prix";
import { CSS_V2, STEPS_V2, JS_V2 } from "../lib/sections";

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

// 3 · le tutoriel bancaire ne vit plus ici.
//     Montrer « voilà comment exporter ton relevé » à quelqu'un qui n'est pas
//     encore convaincu, c'est afficher l'effort avant la récompense. Il est
//     désormais uniquement à l'étape 1 du tunnel, une fois la décision prise.

// 4 · CSS et JS des nouvelles sections
html = html.replace("</style>", CSS_V2 + "\n</style>");
html = html.replace("</body>", JS_V2 + "\n</body>");

// 5 · le prix reste écrit en dur dans la chaîne héritée ; on le réaligne
//     sur la source unique au cas où il subsisterait une mention ailleurs
html = html.split("12,90").join((PRIX_CENTIMES / 100).toFixed(2).replace(".", ","));

// 6 · métadonnées sociales et favicon.
//     La page d'accueil est servie en HTML brut : elle n'hérite pas du layout
//     Next, et n'avait donc aucune balise Open Graph. Or le partage est le seul
//     canal d'acquisition gratuit du produit : un lien collé dans WhatsApp
//     s'affichait comme une URL nue, sans image ni titre.
const SITE = "https://www.franklinai.fr";
const TITRE = "Franklin AI — ton relevé bancaire a des choses à te dire";
const DESC =
  "Franklin lit ton relevé ligne par ligne et t'écrit le portrait financier le plus " +
  "drôle et le plus juste qu'on t'ait jamais fait. Chaque chiffre est vérifié par du code.";

const META = [
  `<link rel="icon" href="${SITE}/favicon.svg">`,
  `<link rel="canonical" href="${SITE}/">`,
  `<meta name="description" content="${DESC}">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:locale" content="fr_FR">`,
  `<meta property="og:site_name" content="Franklin AI">`,
  `<meta property="og:title" content="${TITRE}">`,
  `<meta property="og:description" content="${DESC}">`,
  `<meta property="og:url" content="${SITE}/">`,
  `<meta property="og:image" content="${SITE}/og.png">`,
  `<meta property="og:image:width" content="1200">`,
  `<meta property="og:image:height" content="630">`,
  `<meta property="og:image:alt" content="Franklin AI — ta banque voit tout, elle ne dit rien">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="twitter:title" content="${TITRE}">`,
  `<meta name="twitter:description" content="${DESC}">`,
  `<meta name="twitter:image" content="${SITE}/og.png">`,
].join("\n");

// La chaîne héritée porte déjà une balise description : on remplace la nôtre
// à la place plutôt que d'en laisser deux qui se contredisent.
html = html.replace(/<meta name="description"[^>]*>/i, "");
html = html.replace("</head>", META + "\n</head>");

export async function GET() {
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
