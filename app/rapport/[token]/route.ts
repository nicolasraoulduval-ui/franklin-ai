import { getRecord, updateRecord, deleteRecord } from "../../../lib/db";
import { generateRapport } from "../../../lib/franklin";
import { renderRapport } from "../../../lib/render";
import { rapportEnPdf } from "../../../lib/pdf";
import { sendReportEmail } from "../../../lib/email";
import { journaliserErreur } from "../../../lib/evt";

export const runtime = "nodejs";
export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* Bouton de téléchargement, injecté dans le rapport au moment de le servir.
 *
 *  Il déclenche l'impression du navigateur, qui propose « Enregistrer au
 *  format PDF ». Trois raisons de faire comme ça plutôt qu'une route serveur :
 *  ça marche sur les rapports déjà générés, ça ne demande aucun stockage
 *  supplémentaire, et le fichier obtenu est exactement la page que le client
 *  a sous les yeux.
 *
 *  Surtout : la livraison ne dépend plus de l'email. Quelqu'un qui a payé
 *  repart avec son rapport même si l'envoi échoue ou finit en indésirables. */



/* Barre d'actions du rapport, injectée en haut de page.
 *
 *  Deux gestes, et un seul compte vraiment : partager. Le partage est le seul
 *  canal d'acquisition gratuit du produit — il mérite un bouton pleine largeur,
 *  pas un lien discret. « En faire un autre » sert le cas du client satisfait
 *  qui veut analyser d'autres mois, ou offrir le rapport à quelqu'un. */
/* Barre d'en-tête du rapport : la marque, et de quoi en relancer un autre. */
const BARRE_HAUT = `
<style>
  #fr-barre{position:sticky;top:0;z-index:9998;background:#fbfbf8;
    border-bottom:2px solid #14161f;padding:11px 20px;display:flex;
    align-items:center;justify-content:space-between;gap:14px;
    font-family:'IBM Plex Mono',ui-monospace,monospace}
  #fr-barre .lg{font-family:'Gabarito',sans-serif;font-weight:900;font-size:17px;
    color:#14161f;text-decoration:none;white-space:nowrap}
  #fr-barre .lg i{background:#2f4df0;color:#fff;font-style:normal;padding:1px 6px;
    border-radius:5px;margin-left:2px;font-size:13px}
  #fr-barre a.autre{background:#14161f;color:#fff;text-decoration:none;font-weight:700;
    font-size:12.5px;padding:10px 15px;border-radius:9px;white-space:nowrap}
  @media print{#fr-barre{display:none !important}}
  @media(max-width:560px){#fr-barre{padding:9px 14px}#fr-barre a.autre{font-size:11.5px;padding:9px 12px}}
</style>
<div id="fr-barre">
  <a class="lg" href="/">FRANKLIN <i>AI</i></a>
  <a class="autre" href="/analyse">EN FAIRE UN AUTRE →</a>
</div>`;

/* Le partage, en toute fin de page.
 *
 *  Il envoie le lien du rapport entier — pas seulement les quatre cartes. C'est
 *  un choix assumé : le rapport complet est ce qui fait rire, et le partage est
 *  le seul canal d'acquisition gratuit du produit.
 *
 *  Conséquence à ne pas perdre de vue : ce lien donne accès aux montants, aux
 *  revenus et aux découverts. La ligne sous le bouton le dit, sans dramatiser.
 *  Elle n'est pas décorative — sans elle, quelqu'un peut exposer son salaire à
 *  quinze personnes en croyant n'envoyer qu'une blague.
 *
 *  Placé en bas : on partage après avoir lu, pas avant.
 *
 *  Le lien reste par ailleurs le seul moyen de retrouver son rapport, puisqu'il
 *  n'y a pas de compte. Sur ordinateur, où le partage natif n'existe pas, le
 *  bouton le copie dans le presse-papier et le dit. */
function partage(lien: string): string {
  return `
<style>
  #fr-partage{display:block;width:calc(100% - 40px);max-width:700px;margin:8px auto 46px;
    background:#2f4df0;color:#fff;border:2.5px solid #14161f;border-radius:12px;
    padding:17px;font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;
    font-size:14.5px;cursor:pointer;box-shadow:4px 4px 0 #14161f;
    transition:transform .12s,box-shadow .12s}
  #fr-partage:hover{transform:translate(2px,2px);box-shadow:2px 2px 0 #14161f}
  #fr-partage small{display:block;font-weight:400;font-size:11.5px;opacity:.8;margin-top:6px}
  @media print{#fr-partage{display:none !important}}
</style>
<button id="fr-partage" onclick="franklinPartager()">
  PARTAGER MON RAPPORT
  <small>Le rapport entier, tel que tu le vois — montants compris.</small>
</button>
<script>
var FR_LIEN = ${JSON.stringify(lien)};
function frSuivre(n){try{var c=JSON.stringify({nom:n,session:'rapport'});
  if(navigator.sendBeacon)navigator.sendBeacon('/api/evt',new Blob([c],{type:'application/json'}));
  else fetch('/api/evt',{method:'POST',headers:{'content-type':'application/json'},body:c,keepalive:true});}catch(e){}}
frSuivre('rapport_ouvert');

function franklinPartager(){
  var b=document.getElementById('fr-partage');
  frSuivre('partage_cartes');
  var d={title:'Mon rapport Franklin',
         text:"Franklin a lu mon relevé bancaire. Voilà ce qu'il en pense.",
         url:FR_LIEN};
  /* Sur mobile, la feuille de partage native ouvre directement WhatsApp et les
     messageries — c'est là que le rapport doit atterrir. Sur ordinateur elle
     n'existe pas : on copie le lien et on le dit. */
  if(navigator.share){navigator.share(d).catch(function(){});return;}
  navigator.clipboard.writeText(FR_LIEN).then(function(){
    var t=b.innerHTML;b.innerHTML='LIEN COPIÉ — COLLE-LE OÙ TU VEUX';
    setTimeout(function(){b.innerHTML=t;},2400);
  }).catch(function(){window.prompt('Copie ce lien :',FR_LIEN);});
}
</script>`;
}

const BOUTON_PDF = `
<style>
  #fr-dl{position:fixed;right:22px;bottom:22px;z-index:9999;
    font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;font-size:13px;
    background:#2f4df0;color:#fff;border:2.5px solid #14161f;border-radius:11px;
    padding:13px 18px;cursor:pointer;box-shadow:4px 4px 0 #14161f;
    transition:transform .12s,box-shadow .12s}
  #fr-dl:hover{transform:translate(2px,2px);box-shadow:2px 2px 0 #14161f}
  #fr-dl svg{vertical-align:-2px;margin-right:7px}
  @media print{
    #fr-dl{display:none !important}
    .suppr,#suppr,[data-noprint]{display:none !important}
    body{background:#fff}
    @page{margin:14mm}
  }
  @media(max-width:620px){#fr-dl{right:14px;bottom:14px;padding:11px 15px;font-size:12px}}
</style>
<button id="fr-dl" onclick="window.print()">
  <svg width="13" height="14" viewBox="0 0 13 14" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6.5 1v8M3 6l3.5 3.5L10 6M1 12.5h11"/>
  </svg>TÉLÉCHARGER EN PDF
</button>`;


export async function GET(req: Request, { params }: { params: { token: string } }) {
  let rec = await getRecord(params.token);
  if (!rec) return new Response("Rapport introuvable ou supprimé.", { status: 404 });

  // retour de Stripe : le webhook peut arriver quelques secondes après la redirection
  const paidParam = new URL(req.url).searchParams.get("paid") === "1";
  for (let i = 0; rec.status === "preview_ready" && paidParam && i < 5; i++) {
    await sleep(2000);
    rec = (await getRecord(params.token))!;
  }
  if (rec.status === "preview_ready") return new Response("Rapport non payé.", { status: 402 });

  /* Le rapport n'existe pas encore. On NE le fabrique PAS ici.
     Avant, le GET attendait le webhook (jusqu'à 10 s de sommeil), puis appelait
     le modèle (30 à 90 s), puis fabriquait le PDF, puis envoyait l'email — et
     seulement là il répondait. Le client venait de payer et fixait une page
     blanche pendant une à deux minutes, sans le moindre signe de vie. C'est le
     moment le plus fragile du produit : il vient de donner son argent.
     On renvoie donc immédiatement un écran d'attente, qui déclenche lui-même la
     fabrication et recharge quand elle est finie. */
  if (!rec.report_html) return new Response(ATTENTE, { headers: { "content-type": "text/html; charset=utf-8" } });

  const lien = `https://www.franklinai.fr/rapport/${params.token}`;
  const ajouts = partage(lien) + BOUTON_PDF;
  let page = rec.report_html ?? "";
  // la barre et le bouton de partage vont en haut, juste après l'ouverture du corps
  page = page.includes("<body")
    ? page.replace(/(<body[^>]*>)/, "$1" + BARRE_HAUT)
    : BARRE_HAUT + page;
  page = page.includes("</body>") ? page.replace("</body>", ajouts + "</body>") : page + ajouts;
  return new Response(page, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function DELETE(_req: Request, { params }: { params: { token: string } }) {
  await deleteRecord(params.token);
  return new Response(null, { status: 204 });
}

/** Écran d'attente, servi instantanément après le paiement.
 *
 *  Il déclenche lui-même la fabrication via un POST sur la même adresse, puis
 *  recharge la page. Une seule requête, pas de sondage : le navigateur tient la
 *  connexion ouverte pendant que Franklin écrit, et l'animation occupe l'attente.
 *  Le texte change toutes les quatre secondes pour montrer que rien n'est figé. */
const ATTENTE = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Franklin écrit ton rapport…</title>
<link rel="icon" href="/favicon.svg">
<link href="https://fonts.googleapis.com/css2?family=Gabarito:wght@700;900&family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  body{margin:0;min-height:100vh;background:#edf1fb;color:#14161f;display:flex;
    align-items:center;justify-content:center;padding:24px;
    font-family:'IBM Plex Mono',ui-monospace,monospace;text-align:center}
  .b{max-width:460px}
  svg{width:96px;height:auto;margin-bottom:26px;animation:fl 2.4s ease-in-out infinite}
  @keyframes fl{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-11px) rotate(1.5deg)}}
  h1{font-family:'Gabarito',sans-serif;font-weight:900;font-size:30px;line-height:1.12;margin:0 0 14px}
  p{font-size:13.5px;line-height:1.7;color:#4a4f60;margin:0}
  .j{min-height:3.4em;display:flex;align-items:center;justify-content:center}
  .barre{margin:24px auto 0;width:210px;height:7px;border:2px solid #14161f;border-radius:99px;overflow:hidden;background:#fff}
  .barre i{display:block;height:100%;width:35%;background:#2f4df0;animation:av 1.5s ease-in-out infinite}
  @keyframes av{0%{margin-left:-35%}100%{margin-left:100%}}
  .pied{margin-top:26px;font-size:11.5px;color:#6b6f7e;line-height:1.6}
</style></head><body>
<div class="b">
  <svg viewBox="0 0 90 110" aria-hidden="true">
    <path d="M12 8 l8 6 8-6 8 6 8-6 8 6 8-6 8 6 8-6 v88 l-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6 z"
          fill="#fffdf8" stroke="#14161f" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="34" cy="38" r="3.6" fill="#14161f"/><circle cx="56" cy="38" r="3.6" fill="#14161f"/>
    <path d="M34 52 q11 9 22 0" stroke="#14161f" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <rect x="26" y="66" width="38" height="6" rx="2" fill="#2f4df0"/>
    <rect x="26" y="76" width="26" height="4" rx="2" fill="#d8d8cf"/>
  </svg>
  <h1>Franklin écrit<br>ton rapport.</h1>
  <div class="j"><p id="j">Il relit tes lignes une dernière fois.</p></div>
  <div class="barre"><i></i></div>
  <p class="pied">Une à deux minutes. Ne ferme pas cette page —<br>elle se rechargera toute seule.</p>
</div>
<script>
var J = ["Il relit tes lignes une dernière fois.",
         "Il compte. Il ne survole pas.",
         "Il cherche le détail que tu as oublié.",
         "Il hésite sur une formulation.",
         "Il vérifie chaque chiffre avant de l'écrire.",
         "Il a trouvé quelque chose. Il le garde pour la fin."];
var k = 0;
setInterval(function(){ k = (k + 1) % J.length; document.getElementById('j').textContent = J[k]; }, 4000);

/* On demande la fabrication, puis on recharge. Si la connexion casse en route,
   on retente une fois : le POST est idempotent côté serveur. */
function fabriquer(reste) {
  fetch(window.location.pathname, { method: 'POST' })
    .then(function(){ window.location.reload(); })
    .catch(function(){ if (reste > 0) setTimeout(function(){ fabriquer(reste - 1); }, 4000);
                       else document.getElementById('j').textContent = "Ça coince. Recharge la page, ton rapport n'est pas perdu."; });
}
fabriquer(2);
</script>
</body></html>`;

/** Fabrication du rapport. Idempotent : si le HTML existe déjà, on ne refait rien. */
export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const rec = await getRecord(params.token);
  if (!rec) return new Response("introuvable", { status: 404 });
  if (rec.status === "preview_ready") return new Response("non payé", { status: 402 });
  if (rec.report_html) return new Response(null, { status: 204 });

  try {
    const rapport = await generateRapport(rec.stats, rec.prenom);
    const date = new Date().toLocaleDateString("fr-FR");
    const html = renderRapport(rapport, rec.stats as Record<string, unknown>, rec.prenom, date);
    await updateRecord(params.token, { report_html: html, status: "ready" });

    /* Le PDF ne peut être fabriqué qu'ici : c'est le seul endroit où l'on tient
       encore l'objet Rapport structuré. L'email part donc d'ici aussi. Un échec
       n'empêche pas la livraison : le client a déjà sa page. */
    try {
      const pdf = await rapportEnPdf(rapport, rec.prenom, date);
      await sendReportEmail(
        rec.email,
        rec.prenom,
        `https://www.franklinai.fr/rapport/${params.token}`,
        { filename: `rapport-franklin-${rec.prenom.toLowerCase()}.pdf`, content: pdf },
      );
    } catch (e) {
      await journaliserErreur("rapport/pdf-email", e, false);
    }
    return new Response(null, { status: 204 });
  } catch (e) {
    /* Grave : le client a payé et n'a rien. Alerte immédiate. */
    await journaliserErreur("rapport/generation", e, true);
    return new Response("génération impossible", { status: 500 });
  }
}
