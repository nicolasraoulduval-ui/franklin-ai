/** Sections v2 de la landing.
 *
 *  La page d'origine vit dans landing-html.ts sous forme d'une chaîne de 24 Ko.
 *  Plutôt que d'y toucher, on remplace / insère des blocs depuis app/route.ts.
 *  Tout ce qui suit réutilise la charte existante (variables CSS de :root) et
 *  n'introduit que des classes préfixées `f2-` pour éviter toute collision.
 */

/* ============================================================
   CSS
   ============================================================ */
export const CSS_V2 = `
  /* --- révélation au scroll : rien ne bouge tant que ce n'est pas visible --- */
  .f2-anim{opacity:0;transform:translateY(18px);transition:opacity .6s ease,transform .6s ease}
  .f2-anim.vu{opacity:1;transform:none}

  /* --- étapes animées --- */
  .f2-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:2.5px solid var(--ink);border-radius:16px;overflow:hidden;background:#fff}
  .f2-step{padding:26px 24px 30px;border-right:2px solid var(--ink)}
  .f2-step:last-child{border-right:none}
  .f2-step .n{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--blue);margin-bottom:10px}
  .f2-step h3{font-size:19px;margin-bottom:8px}
  .f2-step p{font-size:14.5px;color:var(--ink-soft);line-height:1.6}

  /* scène commune aux trois vignettes */
  .f2-scene{height:132px;margin:16px 0 18px;border:2px solid var(--ink);border-radius:10px;background:var(--bluebg);position:relative;overflow:hidden}

  /* 01 · le relevé sort de l'app bancaire */
  .f2-phone{position:absolute;left:50%;top:14px;transform:translateX(-50%);width:74px;height:104px;border:2.5px solid var(--ink);border-radius:9px;background:#fff}
  .f2-phone::before{content:"";position:absolute;top:6px;left:50%;transform:translateX(-50%);width:22px;height:3px;border-radius:2px;background:var(--ink)}
  .f2-doc{position:absolute;left:50%;top:38px;width:52px;height:66px;margin-left:-26px;background:var(--ticket);border:2px solid var(--ink);border-radius:4px}
  .f2-doc i{position:absolute;left:8px;right:8px;height:3px;background:#c9c4b8;border-radius:2px}
  .f2-doc i:nth-child(1){top:12px}.f2-doc i:nth-child(2){top:22px}.f2-doc i:nth-child(3){top:32px;right:22px}
  .f2-doc b{position:absolute;left:8px;bottom:8px;font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--blue)}
  .vu .f2-doc{animation:f2-sort 3.4s cubic-bezier(.4,0,.2,1) infinite}
  @keyframes f2-sort{0%,12%{transform:translateY(0);opacity:0}
    32%,68%{transform:translateY(46px);opacity:1}
    88%,100%{transform:translateY(46px);opacity:0}}

  /* 02 · Franklin lit ligne à ligne */
  .f2-tape{position:absolute;inset:14px 22px;background:var(--ticket);border:2px solid var(--ink);border-radius:5px;overflow:hidden}
  .f2-line{position:absolute;left:9px;height:4px;border-radius:2px;background:#c9c4b8;opacity:0}
  .vu .f2-line{animation:f2-ligne 3.4s ease infinite}
  @keyframes f2-ligne{0%,8%{opacity:0;transform:translateX(-6px)}18%,100%{opacity:1;transform:none}}
  .f2-scan{position:absolute;left:0;right:0;height:22px;background:linear-gradient(180deg,transparent,rgba(47,77,240,.18),transparent);border-top:1px solid rgba(47,77,240,.4);border-bottom:1px solid rgba(47,77,240,.4)}
  .vu .f2-scan{animation:f2-balaye 2.2s cubic-bezier(.6,0,.4,1) infinite}
  @keyframes f2-balaye{0%{top:-22px}100%{top:110px}}

  /* 03 · le portrait s'écrit */
  .f2-card{position:absolute;inset:14px 26px;background:#fff;border:2px solid var(--ink);border-radius:6px;padding:12px 12px 0}
  .f2-titre{height:11px;width:64%;background:var(--hl);border-radius:2px;margin-bottom:9px;opacity:0}
  .f2-txt{height:4px;border-radius:2px;background:#dcdcd6;margin-bottom:6px;opacity:0}
  .f2-pill{position:absolute;right:-14px;bottom:16px;background:var(--blue);color:#fff;font-family:'IBM Plex Mono',monospace;font-size:8.5px;font-weight:700;padding:5px 9px;border:2px solid var(--ink);border-radius:6px;opacity:0;transform:rotate(-4deg)}
  .vu .f2-titre{animation:f2-pop .5s .2s ease forwards}
  .vu .f2-txt{animation:f2-pop .5s ease forwards}
  .vu .f2-pill{animation:f2-pop .5s 1.5s ease forwards}
  @keyframes f2-pop{to{opacity:1}}

  /* --- section partage --- */
  .f2-chat{max-width:430px;margin:0 auto;border:2.5px solid var(--ink);border-radius:16px;background:#fff;padding:20px 18px;box-shadow:6px 6px 0 var(--line)}
  .f2-msg{display:flex;gap:9px;margin-bottom:11px;align-items:flex-end;opacity:0;transform:translateY(10px)}
  .f2-msg.vu{animation:f2-entre .45s ease forwards}
  @keyframes f2-entre{to{opacity:1;transform:none}}
  .f2-av{width:26px;height:26px;border-radius:50%;background:var(--bluebg);border:2px solid var(--ink);flex-shrink:0}
  .f2-bulle{background:#f1f1ef;border-radius:15px;padding:9px 14px;font-size:14px;line-height:1.45;max-width:78%}
  .f2-msg.moi{justify-content:flex-end}
  .f2-msg.moi .f2-bulle{background:var(--blue);color:#fff}
  .f2-partage{border:2px solid var(--ink);border-radius:12px;overflow:hidden;max-width:78%;margin-left:auto;background:#fff}
  .f2-partage .img{background:var(--blue);color:#fff;font-family:'Gabarito',sans-serif;font-weight:900;font-size:17px;line-height:1.2;padding:26px 16px;text-align:center}
  .f2-partage .leg{padding:8px 12px;font-size:12.5px;color:var(--ink-soft);font-family:'IBM Plex Mono',monospace}
  .f2-reac{display:inline-flex;gap:5px;align-items:center;background:#fff;border:2px solid var(--ink);border-radius:99px;padding:3px 9px;font-size:12px;font-family:'IBM Plex Mono',monospace;margin:2px 0 12px auto;position:relative;left:calc(78% - 46px)}
  .f2-reac span{color:var(--red)}

  /* --- section export --- */
  .f2-banques{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:24px}
  .f2-banque{font-family:'IBM Plex Mono',monospace;font-size:12.5px;font-weight:700;background:#fff;border:2px solid var(--ink);border-radius:9px;padding:9px 14px;cursor:pointer;transition:all .15s}
  .f2-banque:hover{background:var(--bluebg)}
  .f2-banque.on{background:var(--ink);color:#fff}
  .f2-expl{display:none}
  .f2-expl.on{display:block}
  .f2-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px}
  .f2-mini{border:2.5px solid var(--ink);border-radius:12px;background:#fff;overflow:hidden}
  .f2-mini .cap{padding:12px 14px;font-size:13.5px;line-height:1.5}
  .f2-mini .cap b{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.12em;color:var(--blue);display:block;margin-bottom:5px}
  .f2-ecran{height:112px;background:var(--bluebg);border-bottom:2px solid var(--ink);position:relative;overflow:hidden}
  .f2-row{position:absolute;left:14px;right:14px;height:22px;border-radius:6px;background:#fff;border:2px solid var(--ink);display:flex;align-items:center;padding:0 8px;font-family:'IBM Plex Mono',monospace;font-size:8.5px}
  .f2-curseur{position:absolute;width:13px;height:13px;border:2px solid var(--ink);border-radius:50%;background:rgba(47,77,240,.25);opacity:0}
  .vu .f2-curseur{animation:f2-clic 3s ease infinite}
  @keyframes f2-clic{0%,20%{opacity:0;transform:scale(1.6)}35%,55%{opacity:1;transform:scale(1)}70%,100%{opacity:0;transform:scale(1)}}
  .f2-surligne{position:absolute;left:14px;right:14px;height:22px;border-radius:6px;background:var(--hl);opacity:0}
  .vu .f2-surligne{animation:f2-pop .4s 1s ease forwards}

  .f2-aide{text-align:center;margin-top:6px}
  .f2-aide details{display:inline-block;text-align:left;max-width:640px;width:100%}
  .f2-aide summary{cursor:pointer;font-size:14px;color:var(--ink-soft);list-style:none;text-align:center}
  .f2-aide summary::-webkit-details-marker{display:none}
  .f2-aide summary u{text-underline-offset:3px}
  .f2-aide summary:hover u{color:var(--blue)}
  .f2-aide .corps{border:2px solid var(--ink);border-radius:12px;background:var(--ticket);padding:20px 22px;margin-top:14px;font-size:14.5px;line-height:1.7}
  .f2-aide .corps ol{margin:0;padding-left:20px}
  .f2-aide .corps li{margin-bottom:9px}
  .f2-aide .corps b{font-family:'IBM Plex Mono',monospace;font-size:13px}

  .f2-cta{text-align:center;margin-top:34px}

  @media(max-width:820px){
    .f2-steps{grid-template-columns:1fr}
    .f2-step{border-right:none;border-bottom:2px solid var(--ink)}
    .f2-step:last-child{border-bottom:none}
    .f2-3{grid-template-columns:1fr}
  }
`;

/* ============================================================
   1 · Les 3 étapes, animées par ce qu'elles font vraiment
   ============================================================ */
export const STEPS_V2 = `<section class="steps">
  <div class="wrap">
    <div class="sec-label">Comment ça marche</div>
    <h2>Trois minutes de ta part.<br><span class="hl">Six mois de vérité en face.</span></h2>
    <div class="f2-steps f2-anim">

      <div class="f2-step">
        <div class="f2-scene">
          <div class="f2-phone"></div>
          <div class="f2-doc"><i></i><i></i><i></i><b>RELEVE.PDF</b></div>
        </div>
        <div class="n">ÉTAPE 01</div>
        <h3>Exporte ton relevé</h3>
        <p>PDF ou CSV, depuis l'app de ta banque. Un seul relevé suffit pour commencer — plus tu en donnes, plus Franklin a de matière.</p>
      </div>

      <div class="f2-step">
        <div class="f2-scene">
          <div class="f2-tape">
            <div class="f2-line" style="top:10px;width:60%;animation-delay:.1s"></div>
            <div class="f2-line" style="top:24px;width:78%;animation-delay:.3s"></div>
            <div class="f2-line" style="top:38px;width:48%;animation-delay:.5s"></div>
            <div class="f2-line" style="top:52px;width:70%;animation-delay:.7s"></div>
            <div class="f2-line" style="top:66px;width:56%;animation-delay:.9s"></div>
            <div class="f2-scan"></div>
          </div>
        </div>
        <div class="n">ÉTAPE 02</div>
        <h3>Franklin lit tout</h3>
        <p>Chaque transaction, chaque heure d'achat, chaque récurrence. Il ne survole pas : il lit ligne par ligne, et il compte.</p>
      </div>

      <div class="f2-step">
        <div class="f2-scene">
          <div class="f2-card">
            <div class="f2-titre"></div>
            <div class="f2-txt" style="width:92%;animation-delay:.5s"></div>
            <div class="f2-txt" style="width:78%;animation-delay:.7s"></div>
            <div class="f2-txt" style="width:86%;animation-delay:.9s"></div>
            <div class="f2-txt" style="width:54%;animation-delay:1.1s"></div>
          </div>
          <div class="f2-pill">TOTAL : AÏE.</div>
        </div>
        <div class="n">ÉTAPE 03</div>
        <h3>Encaisse le portrait</h3>
        <p>Ton archétype, tes punchlines, tes fuites d'argent chiffrées, le verdict — et des cartes à partager, sans aucun montant.</p>
      </div>

    </div>
    <p style="text-align:center;margin-top:18px;font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:var(--ink-soft)">
      Aperçu gratuit avant de décider · aucune carte bancaire demandée
    </p>
  </div>
</section>`;

/* ============================================================
   2 · Le partage — la vraie boucle d'acquisition
   ============================================================ */
export const SHARE_V2 = `<section class="steps" style="padding-top:0">
  <div class="wrap">
    <div class="sec-label">Après le rapport</div>
    <h2>Le meilleur moment,<br><span class="hl">c'est de le partager.</span></h2>
    <p class="intro" style="text-align:center;max-width:60ch;margin:0 auto 30px">
      Chaque rapport se termine par quatre cartes conçues pour la boucle de groupe.
      Aucun montant, aucun nom de banque : tu partages le verdict, pas ton salaire.
    </p>

    <div class="f2-chat f2-anim">
      <div class="f2-msg moi" data-d="0">
        <div class="f2-partage">
          <div class="img">LE MÉCÈNE<br>DES ABONNEMENTS</div>
          <div class="leg">mon rapport Franklin. lisez ça.</div>
        </div>
      </div>
      <div class="f2-reac" data-d="1">♥ <span>4</span></div>
      <div class="f2-msg" data-d="2"><div class="f2-av"></div><div class="f2-bulle">JE PLEURE</div></div>
      <div class="f2-msg" data-d="3"><div class="f2-av"></div><div class="f2-bulle">attends le mien est pire, il m'a appelé « le stratège du dimanche soir »</div></div>
      <div class="f2-msg" data-d="4"><div class="f2-av"></div><div class="f2-bulle">bon je le fais</div></div>
    </div>
  </div>
</section>`;

/* ============================================================
   3 · Comment exporter son relevé — animé, par banque, + tutoriel écrit
   ============================================================ */
const BANQUES: Array<{ id: string; nom: string; etapes: [string, string][]; ecrit: string[] }> = [
  { id: "sg", nom: "Société Générale",
    etapes: [["OUVRE L'APP", "Onglet Mes comptes, puis ton compte courant."],
             ["RELEVÉS", "Menu Documents, section Relevés de compte."],
             ["TÉLÉCHARGE", "Choisis le mois, format PDF. C'est prêt."]],
    ecrit: ["Ouvre l'application Société Générale et connecte-toi.",
            "Va dans <b>Mes comptes</b> et sélectionne ton compte courant.",
            "Ouvre le menu <b>Documents</b>, puis <b>Relevés de compte</b>.",
            "Sélectionne le mois voulu et télécharge le <b>PDF</b>.",
            "Répète pour les mois précédents : six mois donnent un bien meilleur portrait."] },
  { id: "bnp", nom: "BNP Paribas",
    etapes: [["OUVRE L'APP", "Rubrique Mes comptes."], ["E-DOCUMENTS", "Menu Documents et e-relevés."],
             ["TÉLÉCHARGE", "Sélectionne le relevé, format PDF."]],
    ecrit: ["Connecte-toi à l'application BNP Paribas ou à mabanque.bnpparibas.",
            "Ouvre <b>Mes comptes</b>, puis la rubrique <b>Documents</b>.",
            "Sélectionne <b>e-Relevés</b> et le compte concerné.",
            "Télécharge les relevés au format <b>PDF</b>, un par mois."] },
  { id: "ca", nom: "Crédit Agricole",
    etapes: [["OUVRE L'APP", "Ton compte courant dans la liste."], ["E-DOCUMENTS", "Onglet Mes e-documents."],
             ["TÉLÉCHARGE", "Relevé de compte, format PDF."]],
    ecrit: ["Connecte-toi à l'application Crédit Agricole de ta région.",
            "Sélectionne ton compte courant, puis <b>Mes e-documents</b>.",
            "Choisis <b>Relevés de compte</b> et le mois voulu.",
            "Télécharge en <b>PDF</b>."] },
  { id: "bourso", nom: "BoursoBank",
    etapes: [["MON COMPTE", "Ouvre ton compte courant."], ["DOCUMENTS", "Section Relevés."],
             ["TÉLÉCHARGE", "PDF ou CSV, les deux marchent."]],
    ecrit: ["Connecte-toi à BoursoBank.",
            "Ouvre <b>Mon compte</b>, puis <b>Documents</b> et <b>Relevés</b>.",
            "Télécharge en <b>PDF</b> — ou en <b>CSV</b>, Franklin lit les deux."] },
  { id: "revolut", nom: "Revolut · N26",
    etapes: [["PROFIL", "Ouvre ton profil dans l'app."], ["RELEVÉS", "Section Relevés ou Statements."],
             ["GÉNÈRE", "Choisis la période et le format PDF."]],
    ecrit: ["Ouvre l'application et va dans ton <b>profil</b>.",
            "Cherche <b>Relevés</b> (ou <b>Statements</b>).",
            "Choisis la période — six mois si possible — et le format <b>PDF</b>.",
            "Le relevé arrive dans l'app ou par email."] },
];

function vignette(i: number, titre: string, sous: string): string {
  const ecrans = [
    `<div class="f2-row" style="top:16px">MES COMPTES</div>
     <div class="f2-row" style="top:46px">COMPTE COURANT</div>
     <div class="f2-row" style="top:76px;opacity:.45">LIVRET A</div>
     <div class="f2-surligne" style="top:46px"></div>
     <div class="f2-curseur" style="left:32px;top:52px"></div>`,
    `<div class="f2-row" style="top:16px;opacity:.45">VIREMENTS</div>
     <div class="f2-row" style="top:46px">DOCUMENTS</div>
     <div class="f2-row" style="top:76px">RELEVÉS DE COMPTE</div>
     <div class="f2-surligne" style="top:76px"></div>
     <div class="f2-curseur" style="left:32px;top:82px"></div>`,
    `<div class="f2-row" style="top:16px">JUIN 2026 &nbsp;·&nbsp; PDF</div>
     <div class="f2-row" style="top:46px">MAI 2026 &nbsp;·&nbsp; PDF</div>
     <div class="f2-row" style="top:76px">AVRIL 2026 &nbsp;·&nbsp; PDF</div>
     <div class="f2-surligne" style="top:16px"></div>
     <div class="f2-curseur" style="left:32px;top:22px"></div>`,
  ];
  return `<div class="f2-mini">
    <div class="f2-ecran">${ecrans[i]}</div>
    <div class="cap"><b>ÉTAPE 0${i + 1}</b>${titre} — ${sous}</div>
  </div>`;
}

export const EXPORT_V2 = `<section class="steps" style="padding-top:0">
  <div class="wrap">
    <div class="sec-label">Le seul truc à faire</div>
    <h2>Récupérer ton relevé,<br><span class="hl">c'est une minute.</span></h2>
    <p class="intro" style="text-align:center;max-width:58ch;margin:0 auto 26px">
      Choisis ta banque, le chemin est toujours le même : ton compte, tes documents, ton relevé.
    </p>

    <div class="f2-banques">
      ${BANQUES.map((b, i) => `<button class="f2-banque${i === 0 ? " on" : ""}" data-b="${b.id}">${b.nom}</button>`).join("\n      ")}
    </div>

    ${BANQUES.map((b, i) => `<div class="f2-expl${i === 0 ? " on" : ""}" data-b="${b.id}">
      <div class="f2-3 f2-anim">
        ${b.etapes.map((e, j) => vignette(j, e[0], e[1])).join("\n        ")}
      </div>
      <div class="f2-aide">
        <details>
          <summary>Besoin d'aide ? <u>Voir le tutoriel écrit</u></summary>
          <div class="corps">
            <ol>${b.ecrit.map((l) => `<li>${l}</li>`).join("")}</ol>
            <p style="margin:14px 0 0;color:var(--ink-soft);font-size:13.5px">
              Ta banque n'est pas listée ? Si elle exporte un relevé en PDF ou en CSV — elles le font toutes — c'est compatible.
            </p>
          </div>
        </details>
      </div>
    </div>`).join("\n    ")}

    <div class="f2-cta">
      <a class="btn btn-primary" href="/analyse">FAIRE PARLER MON RELEVÉ →</a>
    </div>
  </div>
</section>`;

/* ============================================================
   JS : révélation au scroll + onglets de banque
   ============================================================ */
export const JS_V2 = `
<script>
(function(){
  var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // révélation à l'entrée dans le viewport : les animations ne tournent
  // pas dans le vide en haut de page et ne consomment rien tant qu'on n'y est pas
  var cibles = document.querySelectorAll(".f2-anim, .f2-msg, .f2-reac");
  if (reduit || !("IntersectionObserver" in window)) {
    cibles.forEach(function(e){ e.classList.add("vu"); });
  } else {
    var io = new IntersectionObserver(function(entrees){
      entrees.forEach(function(en){
        if (!en.isIntersecting) return;
        var d = parseInt(en.target.getAttribute("data-d") || "0", 10);
        setTimeout(function(){ en.target.classList.add("vu"); }, d * 550);
        io.unobserve(en.target);
      });
    }, { threshold: 0.25 });
    cibles.forEach(function(e){ io.observe(e); });
  }

  // onglets de banque
  document.querySelectorAll(".f2-banque").forEach(function(btn){
    btn.addEventListener("click", function(){
      var id = btn.getAttribute("data-b");
      document.querySelectorAll(".f2-banque").forEach(function(b){ b.classList.toggle("on", b === btn); });
      document.querySelectorAll(".f2-expl").forEach(function(p){
        var actif = p.getAttribute("data-b") === id;
        p.classList.toggle("on", actif);
        if (actif) p.querySelectorAll(".f2-anim").forEach(function(e){ e.classList.add("vu"); });
      });
    });
  });
})();
</script>`;
