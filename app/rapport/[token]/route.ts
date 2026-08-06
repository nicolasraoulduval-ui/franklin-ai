import { getRecord, updateRecord, deleteRecord } from "../../../lib/db";
import { generateRapport } from "../../../lib/franklin";
import { renderRapport } from "../../../lib/render";
import { rapportEnPdf } from "../../../lib/pdf";
import { sendReportEmail } from "../../../lib/email";

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

  if (!rec.report_html) {
    const rapport = await generateRapport(rec.stats, rec.prenom);
    const date = new Date().toLocaleDateString("fr-FR");
    const html = renderRapport(rapport, rec.stats as Record<string, unknown>, rec.prenom, date);
    await updateRecord(params.token, { report_html: html, status: "ready" });
    rec.report_html = html;

    /* Le PDF ne peut être fabriqué qu'ici : c'est le seul endroit où l'on tient
       encore l'objet Rapport structuré (seul le HTML est stocké ensuite).
       On envoie donc l'email de livraison à ce moment, avec la pièce jointe —
       un seul email, et il contient le rapport. Ce bloc ne s'exécute qu'une
       fois, puisqu'il est gardé par l'absence de report_html.
       Si l'envoi échoue, on ne bloque pas l'affichage : le client a sa page. */
    try {
      const pdf = await rapportEnPdf(rapport, rec.prenom, date);
      await sendReportEmail(
        rec.email,
        rec.prenom,
        `https://www.franklinai.fr/rapport/${params.token}`,
        { filename: `rapport-franklin-${rec.prenom.toLowerCase()}.pdf`, content: pdf },
      );
    } catch (e) {
      console.error("pdf/email:", e);
    }
  }
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
