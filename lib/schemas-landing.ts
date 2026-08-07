/**
 * Franklin AI — les schémas, sur la page d'accueil (lib/schemas-landing.ts)
 *
 * La landing expliquait ce que Franklin fait. Elle ne le montrait pas. Or ce
 * qui donne envie d'un rapport, ce n'est pas la promesse, c'est de se
 * reconnaître dans un graphique avant même d'avoir payé.
 *
 * Les quatre schémas ci-dessous ne sont pas décoratifs : ce sont exactement
 * ceux que le moteur calcule (lib/stats.ts) et que le rendu produit
 * (lib/render.ts). Les chiffres affichés ici sont inventés — c'est écrit —
 * mais la mécanique, elle, est réelle. Montrer un graphique que le produit ne
 * sait pas faire serait la meilleure façon de décevoir à la livraison.
 *
 * Aucun script : quatre visuels en CSS pur, pour ne rien ajouter au temps de
 * chargement de la page la plus regardée du site.
 */

export const CSS_SCHEMAS = `
  .fs-wrap{max-width:1060px;margin:0 auto;padding:0 24px}
  .fs-kicker{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;font-size:12px;
    letter-spacing:.12em;text-transform:uppercase;color:#2f4df0;margin-bottom:14px}
  .fs-h2{font-family:'Gabarito',sans-serif;font-weight:900;font-size:clamp(28px,4vw,42px);
    line-height:1.08;margin:0}
  .fs-lede{max-width:62ch;margin:16px 0 0;font-size:16px;line-height:1.6;color:#4a4f60}
  .fs-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:22px;margin-top:34px}
  .fs-card{border:2.5px solid #14161f;border-radius:16px;background:#fffdf8;
    padding:22px 24px 20px;box-shadow:5px 5px 0 rgba(20,22,31,.12);display:flex;flex-direction:column}
  .fs-t{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;font-size:11.5px;
    letter-spacing:.09em;text-transform:uppercase;color:#6b6f7e;margin-bottom:16px;line-height:1.5}
  .fs-viz{flex:1;display:flex;align-items:flex-end;justify-content:center;height:206px;overflow:hidden}
  .fs-p{margin:16px 0 0;font-size:15.5px;line-height:1.5;font-weight:600}
  .fs-p span{color:#6b6f7e;font-weight:400}

  /* 1 · deux barres */
  .fs-duo{display:flex;align-items:flex-end;gap:46px}
  .fs-col{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:8px;height:100%}
  .fs-bar{width:56px;background:#2f4df0;border:2.5px solid #14161f;border-radius:5px 5px 0 0}
  .fs-bar.pale{background:#d8d8cf}
  .fs-val{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;font-size:15px}
  .fs-lab{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.06em;color:#6b6f7e}

  /* 2 · six barres */
  .fs-six{display:flex;align-items:flex-end;gap:11px}
  .fs-six .fs-bar{width:34px}
  .fs-bar.chaud{background:#e6392e}
  .fs-val.chaud{color:#e6392e}

  /* 3 · le moment de faiblesse.
     Vérifié sur cinq relevés Société Générale réels : un relevé bancaire ne
     contient AUCUNE heure — ni pour les paiements carte, ni pour les virements.
     Une ligne carte porte deux dates et rien d'autre. Toute heure affichée par
     Franklin serait donc inventée, ce qui est exactement ce que le produit
     promet de ne jamais faire. On montre le jour et le montant moyen : deux
     grandeurs réellement calculables. */
  .fs-moment{display:flex;align-items:stretch;text-align:center}
  .fs-mo{padding:0 20px}
  .fs-mo.sep{border-left:2px dashed rgba(20,22,31,.2)}
  .fs-mo-v{font-family:'Gabarito',sans-serif;font-weight:900;font-size:40px;line-height:1.05;color:#2f4df0}
  .fs-mo-v small{font-size:22px;opacity:.6}
  .fs-mo-l{margin-top:8px;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;
    line-height:1.5;color:#6b6f7e;max-width:16ch;margin-left:auto;margin-right:auto}

  /* 4 · le solde de chaque mois, de part et d'autre de zéro */
  .fs-mois{display:flex;gap:12px;position:relative;padding:4px 0}
  .fs-m{display:flex;flex-direction:column;align-items:center;width:36px}
  .fs-mp{height:66px;display:flex;align-items:flex-end}
  .fs-mn{height:66px;display:flex;align-items:flex-start}
  .fs-m i{display:block;width:26px;background:#2f4df0;border:2.5px solid #14161f;border-radius:4px}
  .fs-m i.chaud{background:#e6392e}
  .fs-ml{margin-top:8px;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;color:#6b6f7e}
  .fs-zero{position:absolute;left:-8px;right:-8px;top:70px;border-top:2px dashed rgba(20,22,31,.35)}

  @media(max-width:760px){
    .fs-grid{grid-template-columns:1fr}
    .fs-duo{gap:34px}
  }
`;

export const SCHEMAS_LANDING = `
<section class="schemas">
  <div class="fs-wrap">
    <div class="fs-kicker">Ce que ça donne</div>
    <h2 class="fs-h2">Franklin ne commente pas.<br>Il démontre.</h2>
    <p class="fs-lede">Chaque rapport contient les schémas tirés de tes propres lignes.
       Ceux-ci sont des exemples : les chiffres sont inventés, la mécanique est
       exactement celle qui tournera sur ton relevé.</p>

    <div class="fs-grid">

      <div class="fs-card">
        <div class="fs-t">Passages — restos &amp; bars vs courses</div>
        <div class="fs-viz"><div class="fs-duo">
          <div class="fs-col"><div class="fs-val">64</div><div class="fs-bar" style="height:132px"></div><div class="fs-lab">RESTOS &amp; BARS</div></div>
          <div class="fs-col"><div class="fs-val">7</div><div class="fs-bar pale" style="height:15px"></div><div class="fs-lab">COURSES</div></div>
        </div></div>
        <p class="fs-p">On la voit à peine.<br><span>Comme ta poêle.</span></p>
      </div>

      <div class="fs-card">
        <div class="fs-t">% du salaire dépensé dans les 7 jours suivants</div>
        <div class="fs-viz"><div class="fs-six">
          <div class="fs-col"><div class="fs-val">41</div><div class="fs-bar" style="height:66px"></div><div class="fs-lab">JANV</div></div>
          <div class="fs-col"><div class="fs-val">52</div><div class="fs-bar" style="height:83px"></div><div class="fs-lab">FÉVR</div></div>
          <div class="fs-col"><div class="fs-val">48</div><div class="fs-bar" style="height:76px"></div><div class="fs-lab">MARS</div></div>
          <div class="fs-col"><div class="fs-val chaud">83</div><div class="fs-bar chaud" style="height:132px"></div><div class="fs-lab">AVR</div></div>
          <div class="fs-col"><div class="fs-val">57</div><div class="fs-bar" style="height:91px"></div><div class="fs-lab">MAI</div></div>
          <div class="fs-col"><div class="fs-val">61</div><div class="fs-bar" style="height:97px"></div><div class="fs-lab">JUIN</div></div>
        </div></div>
        <p class="fs-p">Le 3 du mois, tu es riche.<br><span>Le 11, tu es toi.</span></p>
      </div>

      <div class="fs-card">
        <div class="fs-t">Ton moment de faiblesse</div>
        <div class="fs-viz" style="align-items:center">
          <div class="fs-moment">
            <div class="fs-mo">
              <div class="fs-mo-v">JEUDI</div>
              <div class="fs-mo-l">le jour où ta carte sort le plus</div>
            </div>
            <div class="fs-mo sep">
              <div class="fs-mo-v">78<small> €</small></div>
              <div class="fs-mo-l">dépensés ce jour-là, en moyenne</div>
            </div>
          </div>
        </div>
        <p class="fs-p">Le jeudi ne t'a rien fait.<br><span>Toi, si.</span></p>
      </div>

      <div class="fs-card">
        <div class="fs-t">Ce qu'il te reste à la fin de chaque mois</div>
        <div class="fs-viz">
          <div class="fs-mois">
            <div class="fs-zero"></div>
            <div class="fs-m"><div class="fs-mp"><i style="height:26px"></i></div><div class="fs-mn"></div><div class="fs-ml">JANV</div></div>
            <div class="fs-m"><div class="fs-mp"><i style="height:11px"></i></div><div class="fs-mn"></div><div class="fs-ml">FÉVR</div></div>
            <div class="fs-m"><div class="fs-mp"><i style="height:34px"></i></div><div class="fs-mn"></div><div class="fs-ml">MARS</div></div>
            <div class="fs-m"><div class="fs-mp"></div><div class="fs-mn"><i class="chaud" style="height:62px"></i></div><div class="fs-ml">AVR</div></div>
            <div class="fs-m"><div class="fs-mp"><i style="height:8px"></i></div><div class="fs-mn"></div><div class="fs-ml">MAI</div></div>
            <div class="fs-m"><div class="fs-mp"><i style="height:19px"></i></div><div class="fs-mn"></div><div class="fs-ml">JUIN</div></div>
          </div>
        </div>
        <p class="fs-p">Cinq mois à l'équilibre.<br><span>Et puis avril.</span></p>
      </div>

    </div>
  </div>
</section>`;


/**
 * Bandeau défilant, tout en bas de la page d'accueil.
 *
 * Ce n'est pas un mur de témoignages, et c'est délibéré. Publier de faux avis
 * de consommateurs est un délit en France (art. L121-4 11° du Code de la
 * consommation, depuis la transposition de la directive Omnibus). Sur un
 * produit dont l'argument central est « aucun chiffre n'est inventé », ce
 * serait aussi le meilleur moyen de détruire la seule promesse qui le
 * différencie.
 *
 * Ce qui défile ici, ce sont des extraits de rapports — c'est-à-dire le
 * produit lui-même. C'est ce que les gens achètent réellement : pas la
 * promesse qu'on a ri, mais la phrase qui fait rire. Le jour où il y aura de
 * vraies réactions clients, elles remplaceront ces extraits ligne pour ligne :
 * il suffira de changer le tableau EXTRAITS ci-dessous.
 */
const EXTRAITS = [
  "43 commandes de livraison. Ce n'est plus un commerçant, c'est un correspondant.",
  "Tu as viré de l'argent à 23h49 un mardi. Ton banquier dort. Pas toi.",
  "Huit mois d'abonnement, une carte de membre comme neuve.",
  "Le 3 du mois tu es riche. Le 11, tu es toi.",
  "Ce bar, tu l'aimes plus que ta propre mère.",
  "Tu es ton propre plus gros bénéficiaire. Fidèle.",
  "Des courses le samedi, une livraison le dimanche. Deux dîners, un seul appétit.",
  "Tu as payé pour ne pas cuisiner, puis payé pour ne pas y penser.",
  "Ton compte n'est pas un compte, c'est une gare.",
  "Tu regardes ton solde le 28 et tu te dis que le mois prochain sera différent.",
];

export const CSS_BANDEAU = `
  .fb-band{border-top:2.5px solid #14161f;border-bottom:2.5px solid #14161f;
    background:#14161f;padding:20px 0;overflow:hidden;position:relative}
  .fb-note{text-align:center;font-family:'IBM Plex Mono',ui-monospace,monospace;
    font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:#6b6f7e;
    padding:14px 24px 0}
  .fb-rail{display:flex;width:max-content;animation:fb-defile 46s linear infinite}
  .fb-band:hover .fb-rail{animation-play-state:paused}
  .fb-item{display:flex;align-items:center;gap:18px;padding:0 18px;white-space:nowrap;
    font-family:'IBM Plex Sans',system-ui,sans-serif;font-size:17px;color:#fffdf8}
  .fb-item i{font-style:normal;color:#2f4df0;font-size:20px;line-height:1}
  @keyframes fb-defile{from{transform:translateX(0)}to{transform:translateX(-50%)}}
  @media(prefers-reduced-motion:reduce){.fb-rail{animation:none;flex-wrap:wrap;width:auto}}
`;

/* Le rail est dupliqué : la boucle se referme sans saut visible à mi-course. */
const rail = () =>
  EXTRAITS.map((t) => `<span class="fb-item"><i>◆</i>${t}</span>`).join("");

export const BANDEAU_EXTRAITS = `
<section class="bandeau">
  <div class="fb-band"><div class="fb-rail">${rail()}${rail()}</div></div>
  <p class="fb-note">Extraits de rapports Franklin · exemples, chiffres inventés</p>
</section>`;


/**
 * Dernier écran de la page d'accueil.
 *
 * Quelqu'un qui arrive ici a tout lu et n'a toujours pas cliqué. Lui répéter
 * la promesse ne sert à rien : il la connaît. Ce qui reste, c'est la curiosité
 * — l'idée qu'il existe, dans son propre relevé, une ligne qu'il a oubliée et
 * que quelqu'un d'autre va retrouver.
 *
 * D'où le format : une phrase, un bouton, rien d'autre. Pas de fonctionnalités,
 * pas d'arguments, pas de réassurance en gras. La réassurance tient en une
 * ligne sous le bouton, parce que c'est la dernière objection réelle : est-ce
 * que ça va me coûter quelque chose avant que je voie ce que ça donne.
 */
export const CSS_FINAL = `
  .ff-final{background:#edf1fb;border-top:2.5px solid #14161f;padding:82px 24px 90px;text-align:center}
  .ff-final h2{font-family:'Gabarito',sans-serif;font-weight:900;font-size:clamp(30px,4.6vw,50px);
    line-height:1.08;margin:0 auto;max-width:15ch}
  .ff-final h2 em{font-style:normal;background:#9cc3ff;padding:0 .12em;box-decoration-break:clone;
    -webkit-box-decoration-break:clone}
  .ff-final .ff-cta{display:inline-block;margin-top:34px;background:#2f4df0;color:#fff;
    text-decoration:none;border:2.5px solid #14161f;border-radius:14px;padding:19px 40px;
    font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;font-size:16px;
    box-shadow:6px 6px 0 #14161f;transition:transform .12s,box-shadow .12s}
  .ff-final .ff-cta:hover{transform:translate(3px,3px);box-shadow:3px 3px 0 #14161f}
  .ff-final .ff-sub{margin:18px 0 0;font-family:'IBM Plex Mono',ui-monospace,monospace;
    font-size:12.5px;letter-spacing:.05em;color:#6b6f7e}
  .ff-mascotte{display:block;margin:0 auto 26px;width:62px;height:auto}
`;

export const CTA_FINAL = `
<section class="ff-final">
  <svg class="ff-mascotte" viewBox="0 0 90 110" aria-hidden="true">
    <path d="M12 8 l8 6 8-6 8 6 8-6 8 6 8-6 8 6 8-6 v88 l-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6 z"
          fill="#fffdf8" stroke="#14161f" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="34" cy="38" r="3.6" fill="#14161f"/>
    <circle cx="56" cy="38" r="3.6" fill="#14161f"/>
    <path d="M34 52 q11 9 22 0" stroke="#14161f" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <rect x="26" y="66" width="38" height="6" rx="2" fill="#2f4df0"/>
    <rect x="26" y="76" width="26" height="4" rx="2" fill="#d8d8cf"/>
  </svg>
  <h2>Il y a dans ton relevé une ligne que tu as oubliée.<br><em>Franklin, lui, ne l'oubliera pas.</em></h2>
  <a class="ff-cta" href="/analyse">FAIRE PARLER MON RELEVÉ →</a>
  <p class="ff-sub">Aperçu gratuit · aucune carte bancaire demandée</p>
</section>`;
