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
  .fs-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
  .fs-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:22px;margin-top:34px}
  .fs-card{border:2.5px solid #14161f;border-radius:16px;background:#fffdf8;
    padding:22px 24px 20px;box-shadow:5px 5px 0 rgba(20,22,31,.12);display:flex;flex-direction:column}
  .fs-t{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;font-size:11.5px;
    letter-spacing:.09em;text-transform:uppercase;color:#6b6f7e;margin-bottom:16px;line-height:1.5}
  .fs-viz{flex:1;display:flex;align-items:flex-end;justify-content:center;min-height:172px}
  .fs-p{margin:16px 0 0;font-size:15.5px;line-height:1.5;font-weight:600}
  .fs-p span{color:#6b6f7e;font-weight:400}

  /* 1 · deux barres */
  .fs-duo{display:flex;align-items:flex-end;gap:46px;height:172px}
  .fs-col{display:flex;flex-direction:column;align-items:center;gap:8px}
  .fs-bar{width:56px;background:#2f4df0;border:2.5px solid #14161f;border-radius:5px 5px 0 0}
  .fs-bar.pale{background:#d8d8cf}
  .fs-val{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;font-size:15px}
  .fs-lab{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.06em;color:#6b6f7e}

  /* 2 · six barres */
  .fs-six{display:flex;align-items:flex-end;gap:11px;height:172px}
  .fs-six .fs-bar{width:34px}
  .fs-bar.chaud{background:#e6392e}
  .fs-val.chaud{color:#e6392e}

  /* 3 · anneau */
  .fs-ring{width:150px;height:150px;border-radius:50%;position:relative;
    background:conic-gradient(#2f4df0 0 295deg,#edf1fb 295deg 360deg);
    border:2.5px solid #14161f;display:flex;align-items:center;justify-content:center}
  .fs-hole{width:86px;height:86px;border-radius:50%;background:#fffdf8;border:2.5px solid #14161f;
    display:flex;align-items:center;justify-content:center;
    font-family:'Gabarito',sans-serif;font-weight:900;font-size:22px}
  .fs-side{margin-left:20px;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;line-height:2}
  .fs-dot{display:inline-block;width:10px;height:10px;border-radius:3px;border:1.5px solid #14161f;margin-right:7px;vertical-align:-1px}

  /* 4 · cadran 24 h */
  .fs-day{width:100%;max-width:330px}
  .fs-track{position:relative;height:52px;border:2.5px solid #14161f;border-radius:9px;
    background:linear-gradient(90deg,#14161f 0 12.5%,#edf1fb 12.5% 91.6%,#14161f 91.6% 100%)}
  .fs-tick{position:absolute;top:9px;width:9px;height:9px;border-radius:50%;background:#2f4df0;border:2px solid #14161f}
  .fs-tick.nuit{background:#e6392e;top:28px}
  .fs-hours{display:flex;justify-content:space-between;margin-top:8px;
    font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;color:#6b6f7e}

  @media(max-width:760px){
    .fs-grid{grid-template-columns:1fr}
    .fs-duo{gap:34px}
  }
`;

const tick = (pct: number, nuit = false) =>
  `<i class="fs-tick${nuit ? " nuit" : ""}" style="left:calc(${pct}% - 6px)"></i>`;

export const SCHEMAS_LANDING = `
<section class="schemas">
  <div class="fs-wrap">
    <div class="kicker">Ce que ça donne</div>
    <h2>Franklin ne commente pas.<br>Il démontre.</h2>
    <p class="lede">Chaque rapport contient les schémas tirés de tes propres lignes.
       Ceux-ci sont des exemples : les chiffres sont inventés, la mécanique est
       exactement celle qui tournera sur ton relevé.</p>

    <div class="fs-grid">

      <div class="fs-card">
        <div class="fs-t">Passages — restos &amp; bars vs courses</div>
        <div class="fs-viz"><div class="fs-duo">
          <div class="fs-col"><div class="fs-val">64</div><div class="fs-bar" style="height:150px"></div><div class="fs-lab">RESTOS &amp; BARS</div></div>
          <div class="fs-col"><div class="fs-val">7</div><div class="fs-bar pale" style="height:17px"></div><div class="fs-lab">COURSES</div></div>
        </div></div>
        <p class="fs-p">On la voit à peine.<br><span>Comme ta poêle.</span></p>
      </div>

      <div class="fs-card">
        <div class="fs-t">% du salaire dépensé dans les 7 jours suivants</div>
        <div class="fs-viz"><div class="fs-six">
          <div class="fs-col"><div class="fs-val">41</div><div class="fs-bar" style="height:74px"></div><div class="fs-lab">JANV</div></div>
          <div class="fs-col"><div class="fs-val">52</div><div class="fs-bar" style="height:94px"></div><div class="fs-lab">FÉVR</div></div>
          <div class="fs-col"><div class="fs-val">48</div><div class="fs-bar" style="height:86px"></div><div class="fs-lab">MARS</div></div>
          <div class="fs-col"><div class="fs-val chaud">83</div><div class="fs-bar chaud" style="height:150px"></div><div class="fs-lab">AVR</div></div>
          <div class="fs-col"><div class="fs-val">57</div><div class="fs-bar" style="height:103px"></div><div class="fs-lab">MAI</div></div>
          <div class="fs-col"><div class="fs-val">61</div><div class="fs-bar" style="height:110px"></div><div class="fs-lab">JUIN</div></div>
        </div></div>
        <p class="fs-p">Le 3 du mois, tu es riche.<br><span>Le 11, tu es toi.</span></p>
      </div>

      <div class="fs-card">
        <div class="fs-t">Destinataire n°1 de tes virements</div>
        <div class="fs-viz" style="align-items:center">
          <div class="fs-ring"><div class="fs-hole">TOI</div></div>
          <div class="fs-side">
            <div><span class="fs-dot" style="background:#2f4df0"></span>TOI-MÊME — 31</div>
            <div><span class="fs-dot" style="background:#edf1fb"></span>LE RESTE DU MONDE — 7</div>
          </div>
        </div>
        <p class="fs-p">Tu es ton propre plus gros bénéficiaire.<br><span>Fidèle.</span></p>
      </div>

      <div class="fs-card">
        <div class="fs-t">L'heure de tes virements</div>
        <div class="fs-viz" style="align-items:center">
          <div class="fs-day">
            <div class="fs-track">
              ${tick(38)}${tick(45)}${tick(53)}${tick(60)}
              ${tick(95, true)}${tick(97, true)}${tick(4, true)}${tick(7, true)}${tick(9, true)}
            </div>
            <div class="fs-hours"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>00h</span></div>
          </div>
        </div>
        <p class="fs-p">Ton banquier dort.<br><span>Pas toi.</span></p>
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
