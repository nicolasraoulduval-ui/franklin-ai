import { LANDING_HTML } from "../lib/landing-html";
import { PRIX_CENTIMES } from "../lib/prix";
import { CSS_V2, STEPS_V2, JS_V2 } from "../lib/sections";
import {
  CSS_SCHEMAS, SCHEMAS_LANDING,
  CSS_BANDEAU, BANDEAU_EXTRAITS,
  CSS_FINAL, CTA_FINAL,
} from "../lib/schemas-landing";

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

// 2 bis · la phrase d'accroche dit ce qu'on obtient, pas sur quel ton.
//     L'ancienne promettait « l'humour d'un pote qui t'aime bien » : c'est un ton,
//     pas un livrable. Un testeur est reparti en disant qu'il n'avait pas compris
//     ce que le produit faisait. On nomme les sections du rapport, et on annonce
//     la durée : personne n'achète ce qu'il n'arrive pas à se représenter.
const LEDE =
  '<p class="lede"><b>Franklin</b>, c\'est ton relevé bancaire qui a pris vie. ' +
  'Tu déposes tes relevés, il les lit ligne par ligne et t\'écrit ton portrait : ' +
  'ton archétype, les mensonges que tu te racontes, où ton argent fuit, et ton ' +
  'bulletin noté sur 20. Trois minutes. Chaque chiffre est calculé, jamais inventé.</p>';
{
  const dLede = html.indexOf('<p class="lede">');
  const fLede = dLede >= 0 ? html.indexOf("</p>", dLede) : -1;
  if (dLede >= 0 && fLede >= 0) html = html.slice(0, dLede) + LEDE + html.slice(fLede + 4);
}

// 3 · les schémas, à la place du tutoriel.
//     La page expliquait ce que Franklin fait sans jamais le montrer. Quatre
//     graphiques valent mieux qu'un paragraphe : le visiteur se reconnaît
//     avant d'avoir payé, ce qui est exactement le but d'une page d'accueil.
// Les schémas passent AVANT « Comment ça marche » : on montre ce qu'on obtient
// avant d'expliquer comment l'obtenir. L'envie vient du résultat, pas du mode d'emploi.
const avantEtapes = html.indexOf('<section class="steps">');
html = html.slice(0, avantEtapes) + SCHEMAS_LANDING + "\n\n" + html.slice(avantEtapes);

// 3 bis · le tutoriel bancaire ne vit plus ici.
//     Montrer « voilà comment exporter ton relevé » à quelqu'un qui n'est pas
//     encore convaincu, c'est afficher l'effort avant la récompense. Il est
//     désormais uniquement à l'étape 1 du tunnel, une fois la décision prise.

// 3 ter · l'objection « je pourrais pas demander à une IA ? ».
//     Un testeur l'a posée telle quelle. Elle est légitime et il vaut mieux y
//     répondre sur la page que la laisser trancher dans la tête du visiteur.
//     Deux arguments seulement, les deux vérifiables dans le produit : le
//     validateur de chiffres, et les mesures qu'on ne pense pas à demander.
const CSS_POURQUOI = `
.pourquoi{padding:74px 0;background:#fbfbf8;border-top:2px solid #14161f;border-bottom:2px solid #14161f}
.pourquoi h2{font-family:'Gabarito',sans-serif;font-weight:900;font-size:34px;line-height:1.12;margin:0 0 10px}
.pourquoi .pq-intro{font-size:16px;color:#4a4f60;margin:0 0 34px;max-width:620px}
.pq-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.pq-item{background:#fff;border:2.5px solid #14161f;border-radius:14px;padding:23px 25px;box-shadow:4px 4px 0 #14161f}
.pq-item b{display:block;font-family:'Gabarito',sans-serif;font-weight:900;font-size:18.5px;line-height:1.2;margin-bottom:10px}
.pq-item span{display:block;font-size:14.5px;line-height:1.66;color:#4a4f60}
@media(max-width:760px){.pourquoi{padding:52px 0}.pourquoi h2{font-size:26px}.pq-grid{grid-template-columns:1fr;gap:16px}}
`;

const POURQUOI = `
<section class="pourquoi">
  <div class="wrap">
    <h2>« Je pourrais pas juste demander à une IA ? »</h2>
    <p class="pq-intro">Tu pourrais. Elle te répondrait avec des chiffres faux.</p>
    <div class="pq-grid">
      <div class="pq-item">
        <b>Les chiffres sont calculés, pas générés.</b>
        <span>Donne quatre cents lignes de relevé à une IA, elle inventera des totaux : elle est faite pour écrire, pas pour additionner. Ici le code compte, le modèle rédige. Un validateur relit chaque rapport et le refuse si un seul nombre n'existe pas dans tes données.</span>
      </div>
      <div class="pq-item">
        <b>Il cherche ce que tu n'aurais pas demandé.</b>
        <span>La part de ton salaire partie en sept jours. Les virements passés entre 22 h et 4 h. Les abonnements que tu paies sans les ouvrir. Les commissions que ta banque prélève sans le dire. Personne ne pense à poser ces questions-là — c'est tout l'intérêt.</span>
      </div>
    </div>
  </div>
</section>`;

// 3 quater · le téléphone, pas l'ordinateur.
//     Mesuré le 30/10 en 375 px : la page fait dix écrans et demi, l'animation
//     de marche sortait la mascotte et sa bulle de 55 px à gauche de l'écran,
//     le bouton principal était en 13,5 px et les liens de pied de page offraient
//     15 px de hauteur à viser au pouce. Le trafic publicitaire arrive d'Instagram :
//     il est mobile à peu près intégralement.
const CSS_MOBILE = `
@media(max-width:700px){
  /* L'animation « pace » déplace la mascotte horizontalement : tolérable sur 1200 px,
     hors cadre sur 375. On la fige ; bras, bouche et clignements continuent. */
  .walker{animation:none !important;max-width:100%}
  .bubble{max-width:78vw;font-size:13.5px}
  .stage{overflow-x:clip}
  /* Un bouton se vise au pouce : 56 px de haut, pleine largeur, pas de demi-ligne. */
  .hero-ctas{gap:11px}
  .hero-ctas .btn{width:100%;box-sizing:border-box;text-align:center;font-size:15px;
    padding:18px 20px;min-height:56px;display:flex;align-items:center;justify-content:center}
  .nav-cta{font-size:12px;min-height:44px;display:inline-flex;align-items:center;padding:0 14px}
  footer a{display:inline-block;padding:10px 3px}
  body.fr-sticky-on{padding-bottom:88px}
}
/* Barre d'action fixe : sur dix écrans de haut, le bouton du hero disparaît au premier
   mouvement de pouce et ne revient jamais. Elle apparaît après le premier écran — pas
   avant, pour ne pas recouvrir le hero au moment où il fait son travail. */
#fr-sticky{display:none}
@media(max-width:700px){
  #fr-sticky{display:block;position:fixed;left:0;right:0;bottom:0;z-index:9990;
    padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));
    background:rgba(251,251,248,.96);border-top:2px solid #14161f;
    transform:translateY(130%);transition:transform .22s ease}
  #fr-sticky.on{transform:translateY(0)}
  #fr-sticky a{display:flex;align-items:center;justify-content:center;min-height:54px;
    background:#2f4df0;color:#fff;text-decoration:none;border:2px solid #14161f;border-radius:10px;
    font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;font-size:14.5px;letter-spacing:.02em}
}`;

const STICKY = `<div id="fr-sticky"><a href="/analyse">FAIRE PARLER MON RELEVÉ →</a></div>
<script>
(function(){
  var s=document.getElementById("fr-sticky");
  if(!s || window.innerWidth>700) return;
  var seuil=window.innerHeight*0.85;
  function maj(){
    var on=window.scrollY>seuil;
    s.classList.toggle("on",on);
    document.body.classList.toggle("fr-sticky-on",on);
  }
  window.addEventListener("scroll",maj,{passive:true});
  maj();
})();
<\/script>`;

// 4 · CSS et JS des nouvelles sections
html = html.replace("</style>", CSS_V2 + CSS_SCHEMAS + CSS_BANDEAU + CSS_POURQUOI + CSS_FINAL + CSS_MOBILE + "\n</style>");
/* La landing n'envoyait aucun événement : le tunnel commençait donc à
   « analyse_etape_1 », et on ignorait combien de visiteurs cliquent réellement
   sur le bouton. C'est pourtant le seul chiffre qui dit si la page convainc.
   Même identifiant de session que le tunnel React, mêmes règles : rien de
   personnel, régénéré à chaque onglet, et jamais bloquant. */
const SUIVI_LANDING = `<script>
(function(){
  try{
    var s = Math.random().toString(36).slice(2,12);
    var c = JSON.stringify({nom:"landing_vue",session:s,props:{},source:(function(){try{var u=new URLSearchParams(location.search).get("s");if(u){sessionStorage.setItem("fsrc",u);return u}return sessionStorage.getItem("fsrc")}catch(e){return null}})()});
    if(navigator.sendBeacon) navigator.sendBeacon("/api/evt", new Blob([c],{type:"application/json"}));
    else fetch("/api/evt",{method:"POST",headers:{"content-type":"application/json"},body:c,keepalive:true});
  }catch(e){}
})();
</script>`;

html = html.replace("</body>", JS_V2 + SUIVI_LANDING + STICKY + "\n</body>");

// 4 bis · le bandeau d'extraits puis le dernier appel, AVANT le pied de page.
//         Quelqu'un qui arrive en bas a tout lu sans cliquer : lui répéter la
//         promesse ne sert à rien, seule la curiosité peut encore le faire bouger.
//
//         Ils étaient placés après le </footer>. Sur un écran de téléphone, la
//         page fait onze hauteurs d'écran : le lecteur voit apparaître les
//         mentions légales, comprend que c'est fini, et remonte ou sort. Il ne
//         verra jamais ce qui suit. Le pied de page est une fin de page, pas un
//         séparateur — on ne met rien derrière lui.
const finFooter = html.lastIndexOf("<footer");
const avantFooter = finFooter >= 0 ? finFooter : html.indexOf("</body>");
html = html.slice(0, avantFooter) + "\n" + POURQUOI + "\n" + BANDEAU_EXTRAITS + "\n" + CTA_FINAL + "\n" + html.slice(avantFooter);

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
