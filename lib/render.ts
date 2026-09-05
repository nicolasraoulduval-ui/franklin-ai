/** Renderer : rapport JSON + stats -> HTML complet dans la DA (port de render_report.py).
 * Les schémas sont calculés ici, depuis les stats — jamais par le modèle. */
import { REPORT_CSS } from "./report-css";
import type { Rapport } from "./franklin";

type Stats = Record<string, any>;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const paras = (t?: string) => (t ?? "").split(/\n\n+/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");

function barChart2(s: Stats): string {
  const r = s.depenses_par_categorie?.resto_bars, c = s.depenses_par_categorie?.courses;
  if (!r || !c) return "";
  const h2 = Math.max(6, Math.round((210 * c.nb) / Math.max(r.nb, 1)));
  return `<div class="chart"><div class="chart-title mono">PASSAGES — RESTOS &amp; BARS VS COURSES</div>
    <div class="bars2">
      <div class="bcol"><div class="bval mono">${r.nb}</div><div class="bar" style="height:210px"></div><div class="blab mono">RESTOS &amp; BARS</div></div>
      <div class="bcol"><div class="bval mono">${c.nb}</div><div class="bar tiny" style="height:${h2}px"></div><div class="blab mono">COURSES</div></div>
      <div class="annot"><svg viewBox="0 0 120 60" width="110"><path d="M8 8 q60 -6 92 34" fill="none" stroke="#14161f" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="1 5"/><path d="M100 42 l0 -12 M100 42 l-12 -2" fill="none" stroke="#14161f" stroke-width="2.2" stroke-linecap="round"/></svg>
      <div class="mono">${c.nb === 0 ? "Zéro passage.<br>Ta cuisine est décorative." : c.nb * 4 <= r.nb ? "On la voit à peine.<br>Comme ta poêle." : `${Math.round(r.nb / Math.max(c.nb, 1))} fois plus souvent.<br>Ta poêle a des horaires.`}</div></div>
    </div></div>`;
}

function barChartSalaire(s: Stats): string {
  const v: any[] = s.vitesse_post_salaire ?? [];
  if (v.length < 3) return "";
  const MOIS: Record<string, string> = { "01": "JANV", "02": "FÉVR", "03": "MARS", "04": "AVR", "05": "MAI", "06": "JUIN", "07": "JUIL", "08": "AOÛT", "09": "SEPT", "10": "OCT", "11": "NOV", "12": "DÉC" };
  const mx = Math.max(...v.map((x) => x.pct_7j));
  const cols = v.map((x) => {
    const mois = MOIS[x.date_salaire.slice(3, 5)] ?? "?";
    const h = Math.max(8, Math.round((208 * x.pct_7j) / mx));
    const alert = x.pct_7j === mx && mx >= 40;
    const val = String(x.pct_7j).replace(".", ",");
    return `<div class="bcol"><div class="bval mono${alert ? " red" : ""}"${alert ? ' style="font-weight:700"' : ""}>${val}</div><div class="bar${alert ? " alert" : ""}" style="height:${h}px"></div><div class="blab mono">${mois}</div></div>`;
  }).join("");
  return `<div class="chart"><div class="chart-title mono">% DU SALAIRE DÉPENSÉ DANS LES 7 JOURS SUIVANTS</div><div class="bars6">${cols}</div></div>`;
}

/* À qui l'argent part vraiment.
 *
 *  Les virements vers soi-même sont déjà exclus par lib/stats.ts : « ton premier
 *  bénéficiaire, c'est toi » n'apprend rien à quelqu'un qui regarde son livret.
 *  Ce qui surprend, c'est de voir le classement des autres — et l'écart entre le
 *  premier et le reste.
 *
 *  La chute se calcule : selon que quelqu'un capte la majorité ou que tout est
 *  réparti, ce n'est pas la même phrase. Une légende écrite d'avance finit
 *  toujours par contredire le dessin de quelqu'un. */
/* Le graphique de dernier recours.
 *
 *  Les quatre autres schémas sont conditionnels : ils exigent des catégories,
 *  plusieurs salaires ou plusieurs bénéficiaires. Une cliente avec un seul
 *  relevé et des marchands inconnus n'a eu AUCUN graphique — et elle l'a dit.
 *  Celui-ci ne dépend que des dates et des montants : il y en a toujours. */
function rythme(s: Stats): string {
  const par = (s.par_mois ?? {}) as Record<string, { debits: number; credits: number; net: number }>;
  const mois = Object.entries(par);
  if (mois.length >= 2) {
    const mx = Math.max(...mois.map(([, m]) => Math.max(m.debits, m.credits)), 1);
    const cols = mois.map(([nom, m]) => {
      const hd = Math.max(6, Math.round((190 * m.debits) / mx));
      const hc = Math.max(6, Math.round((190 * m.credits) / mx));
      return `<div class="bcol"><div class="paire">
        <i class="cred" style="height:${hc}px" title="entré"></i><i class="deb" style="height:${hd}px" title="sorti"></i>
      </div><div class="blab mono">${esc(nom.slice(0, 5))}</div></div>`;
    }).join("");
    return `<div class="chart"><div class="chart-title mono">CE QUI ENTRE, CE QUI SORT, MOIS PAR MOIS</div>
      <style>.paire{display:flex;align-items:flex-end;gap:4px}
      .paire i{display:block;width:15px;border:2px solid #14161f;border-radius:3px 3px 0 0}
      .paire i.cred{background:#9cc3ff}.paire i.deb{background:#2f4df0}
      .lg2{margin-top:12px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6b6f7e}</style>
      <div class="bars6">${cols}</div>
      <div class="lg2">Bleu clair : ce qui entre. Bleu foncé : ce qui sort.</div></div>`;
  }

  /* Un seul relevé : on montre les jours de la semaine, toujours calculables. */
  const j = (s.carte_par_jour_semaine ?? {}) as Record<string, { nb: number; total: number }>;
  const jours = Object.entries(j).filter(([, x]) => x.nb > 0);
  if (jours.length < 3) return "";
  const mx = Math.max(...jours.map(([, x]) => x.total), 1);
  const pire = jours.reduce((b, c) => (c[1].total > b[1].total ? c : b));
  const cols = jours.map(([nom, x]) => {
    const h = Math.max(6, Math.round((190 * x.total) / mx));
    const chaud = nom === pire[0];
    return `<div class="bcol"><div class="bval mono${chaud ? " red" : ""}">${x.nb}</div>
      <div class="bar${chaud ? " alert" : ""}" style="height:${h}px"></div>
      <div class="blab mono">${esc(nom.slice(0, 3).toUpperCase())}</div></div>`;
  }).join("");
  return `<div class="chart"><div class="chart-title mono">TES PAIEMENTS CARTE, PAR JOUR DE LA SEMAINE</div>
    <div class="bars6">${cols}</div>
    <div class="lg2" style="margin-top:12px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6b6f7e">Le ${esc(pire[0])} te coûte le plus cher.</div></div>`;
}

function beneficiaires(s: Stats): string {
  const b = s.top_beneficiaires;
  const liste: Array<{ beneficiaire: string; nb: number; total: number }> = b?.liste ?? [];
  if (liste.length < 2) return "";

  const top = liste.slice(0, 5);
  const mx = Math.max(...top.map((x) => x.total), 1);
  const somme = liste.reduce((acc, x) => acc + x.total, 0);
  const part = Math.round((100 * top[0].total) / Math.max(somme, 1));

  const eur = (x: number) =>
    x.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d),)/g, "\u202f") + "\u00a0€";
  const court = (n: string) => (n.length > 22 ? n.slice(0, 21) + "…" : n);

  const rangs = top
    .map(
      (x) => `<div class="bn-r">
        <div class="bn-n mono">${esc(court(x.beneficiaire))}</div>
        <div class="bn-b"><i style="width:${Math.max(6, Math.round((100 * x.total) / mx))}%"></i></div>
        <div class="bn-m mono">${eur(x.total)}<small> · ${x.nb}×</small></div>
      </div>`,
    )
    .join("");

  const chute =
    part >= 60
      ? `${esc(court(top[0].beneficiaire))} capte ${part} % de ce que tu envoies. Les autres se partagent le reste.`
      : liste.length >= 6
        ? `${liste.length} destinataires différents. Tu ne vires pas, tu distribues.`
        : "Personne ne domine vraiment. L'argent circule, sans favori déclaré.";

  return `<div class="chart"><div class="chart-title mono">À QUI TU VIRES LE PLUS</div>
    <style>
      .bn-r{display:flex;align-items:center;gap:12px;margin:9px 0}
      .bn-n{flex:0 0 150px;font-size:11.5px;text-align:right;overflow:hidden;white-space:nowrap}
      .bn-b{flex:1;height:22px;border:2px solid #14161f;border-radius:5px;background:#fffdf8;overflow:hidden}
      .bn-b i{display:block;height:100%;background:#2f4df0}
      .bn-m{flex:0 0 118px;font-size:12px;font-weight:700}
      .bn-m small{font-weight:400;opacity:.55}
      .bn-c{margin-top:12px;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;color:#6b6f7e}
      @media(max-width:560px){.bn-n{flex-basis:96px;font-size:10px}.bn-m{flex-basis:92px;font-size:11px}}
    </style>
    ${rangs}
    <div class="bn-c">${esc(chute)}</div></div>`;
}

function donut(s: Stats): string {
  const nSelf = s.epargne_yoyo?.sorties_vers_soi?.nb ?? 0;
  const nOther = s.depenses_par_categorie?.virement_emis?.nb ?? 0;
  if (nSelf < 5) return "";
  /* La légende dépend du résultat. Avant, elle affirmait toujours la même chose —
     y compris quand le graphique disait l'inverse. Une blague écrite d'avance finit
     toujours par mentir sur les données de quelqu'un. */
  const domine = nSelf > nOther;
  const part = Math.round((100 * nSelf) / Math.max(nSelf + nOther, 1));
  const deg = Math.round((360 * nSelf) / Math.max(nSelf + nOther, 1));
  return `<div class="chart"><div class="chart-title mono">DESTINATAIRE N°1 DE TES VIREMENTS</div>
    <div class="donutrow">
      <div class="donut" style="background:conic-gradient(var(--blue) 0 ${deg}deg, var(--hl) ${deg}deg 360deg)"><div class="hole mono">TOI</div></div>
      <div class="legend mono"><div><span class="dot d1"></span>TOI-MÊME — ${nSelf} VIREMENTS</div>
      <div><span class="dot d2"></span>LE RESTE DU MONDE — ${nOther}</div>
      <div class="legend-note">${domine ? "Ton principal bénéficiaire, c'est toi. Fidèle." : `${part} % de tes virements finissent chez toi. L'argent fait des allers-retours avant de choisir.`}</div></div>
    </div></div>`;
}

export function renderRapport(r: Rapport, stats: Stats, prenom: string, dateGen: string): string {
  const p = stats.periode;
  const debut = p.debut.split("-").reverse().join("/");
  const fin = p.fin.split("-").reverse().join("/");
  const S: string[] = [];

  S.push(`<section><div class="wrap"><div class="kicker">Ton personnage financier</div>
    <h2>${esc(r.archetype.titre)}</h2><p class="sub">${esc(r.archetype.sous_titre)}</p>${paras(r.archetype.texte)}</div></section>`);

  const lies = r.mensonges.map((m) => `<div class="lie"><div class="said">« ${esc(m.mensonge)} »</div><div class="truth">${esc(m.verite)}</div><div class="punch">${esc(m.punchline)}</div></div>`).join("");
  S.push(`<section><div class="wrap"><div class="kicker">Les mensonges que tu te racontes</div>
    <h2>Toi contre ton relevé.<br>Le relevé gagne ${r.mensonges.length}-0.</h2>${lies}</div></section>`);

  if (r.fuites) {
    const rows = r.fuites.lignes.map((l) => `<div class="row"><span>${esc(l.label).toUpperCase()}</span><span>${esc(l.montant_json)}</span></div>`).join("");
    S.push(`<section><div class="wrap"><div class="kicker">Les fuites</div><h2>L'argent qui part sans<br>demander ton avis.</h2>
      ${paras(r.fuites.intro)}<div class="ticket">${rows}<div class="total"><span>${esc(r.fuites.total_label ?? "TOTAL").toUpperCase()}</span><span class="aie">AÏE.</span></div></div>${paras(r.fuites.punchline)}</div></section>`);
  }

  S.push(`<section><div class="wrap"><div class="kicker">Ta signature</div><h2>${esc(r.signature.titre)}</h2>${paras(r.signature.texte)}</div></section>`);

  let charts = barChart2(stats) + barChartSalaire(stats) + beneficiaires(stats) + donut(stats);
  /* Le repli ne se déclenchait qu'à zéro schéma. Constat sur trois vrais
     rapports : Pierre avec 5 relevés en a eu 4, Pierre avec 1 relevé en a eu 1,
     Carla avec 1 relevé aucun. Celui à un seul schéma passait donc entre les
     mailles et livrait une section « Les schémas » quasi vide sur 1 400 mots de
     texte. On vise trois : en dessous, on complète. */
  const combien = (charts.match(/class="chart"/g) ?? []).length;
  if (combien < 3) charts += rythme(stats);
  if (charts.trim())
    S.push(`<section><div class="wrap"><div class="kicker">Les schémas</div><h2>La science confirme.</h2>${charts}</div></section>`);

  if (r.toi_vs_toi) {
    const col = (side: { label: string; faits: string[] }) => `<h3>${esc(side.label)}</h3><ul>${side.faits.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    S.push(`<section><div class="wrap"><div class="kicker">Toi contre toi</div><h2>${esc(r.toi_vs_toi.titre)}</h2>
      <div class="vs"><div>${col(r.toi_vs_toi.gauche)}</div><div>${col(r.toi_vs_toi.droite)}</div></div>${paras(r.toi_vs_toi.punchline)}</div></section>`);
  }

  if (r.bulletin?.length) {
    const n20 = (s: string) => parseFloat(String(s).replace(",", "."));
    /* Le barème doit être écrit. Le modèle rend tantôt « 16/20 », tantôt « 16 » ;
       un nombre nu posé à côté des « 2/4 » de la note de gestion, deux sections
       plus bas, ne veut plus rien dire. On le complète ici plutôt que d'espérer
       une consigne respectée à chaque fois. */
    const sur20 = (n: string) => (/\\//.test(String(n)) ? String(n) : `\${String(n).trim()}/20`);
    const rows = r.bulletin.map((b) => `<tr><td>\${esc(b.matiere)}</td><td class="note\${n20(b.note) >= 14 ? " good" : n20(b.note) < 8 ? " bad" : ""}">\${esc(sur20(b.note))}</td><td class="appr">\${esc(b.appreciation)}</td></tr>`).join("");
    S.push(`<section><div class="wrap"><div class="kicker">Bulletin du semestre</div><h2>Conseil de classe.</h2>
      <table class="bulletin"><tr><th>MATIÈRE</th><th>NOTE</th><th>APPRÉCIATION DU RELEVÉ</th></tr>${rows}</table></div></section>`);
  }

  /* « Si… » — les montants et les équivalences viennent de stats.si_alors
     (lib/si.ts). Le modèle n'écrit que l'intro et la chute : c'est la même
     règle que la note, pour la même raison. On constate, on ne recommande
     pas — « ça représente », jamais « tu devrais ». */
  const si = stats.si_alors;
  if (si?.length) {
    const lignes = si
      .map(
        (x: any) => `<div class="si-l"><div class="si-t">${esc(x.titre)}</div>
          <div class="si-m"><b>${esc(x.montant)}</b> <i>${esc(x.periode)}</i></div>
          <div class="si-e">soit ${esc(x.equivalence)}</div></div>`,
      )
      .join("");
    S.push(`<section><div class="wrap"><div class="kicker">Si…</div><h2>Le même argent,<br>raconté autrement.</h2>
      <style>
        .si-l{border:2px solid #14161f;border-radius:12px;background:#fffdf8;padding:16px 18px;margin:12px 0}
        .si-t{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:700;font-size:12.5px;
          letter-spacing:.03em;text-transform:uppercase;line-height:1.5}
        .si-m{margin:9px 0 4px;font-family:'Gabarito',sans-serif;font-weight:900;font-size:30px;line-height:1.1}
        .si-m i{font-style:normal;font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:400;
          font-size:12px;opacity:.55;margin-left:6px}
        .si-e{font-size:15.5px;color:#4a4f60}
      </style>
      ${paras(r.si_alors?.intro)}${lignes}${paras(r.si_alors?.punchline)}
      <p style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11.5px;opacity:.55;line-height:1.6;margin-top:16px">
        Calculé sur tes chiffres. Ce n'est pas un conseil : Franklin constate, il ne recommande rien.</p>
      </div></section>`);
  }

  S.push(`<section class="verdict"><div class="wrap"><div class="kicker">Le verdict</div><h2>Tout ça pour ça.<br>Et c'est très bien.</h2>
    ${paras(r.verdict.texte)}<p class="last"><mark>${esc(r.verdict.derniere_ligne)}</mark></p></div></section>`);

  const classes = ["", " dark", " blue", ""];
  const cards = r.cartes.map((c, i) => `<div class="card${classes[i % 4]}"><div class="txt">${esc(c.texte)}</div><div class="foot"><span>FRANKLIN AI</span><span>franklinai.fr</span></div></div>`).join("");
  S.push(`<section><div class="wrap"><div class="kicker">Tes 4 cartes à partager</div><h2>Zéro montant. Zéro banque.<br>Juste la vérité.</h2><div class="cards">${cards}</div></div></section>`);

  const ng = stats.note_gestion;
  if (ng && ng.sous_notes?.length) {
    const virg = (x: number) => String(x).replace(".", ",");
    const lignes = ng.sous_notes
      .map((s: any) => `<div class="row"><span>${esc(s.matiere)} — <i style="font-style:normal;opacity:.6">${esc(s.mesure)}</i></span><span>${virg(s.note)}/${s.sur}</span></div>`)
      .join("");
    const pluriel = ng.nb_criteres_retenus > 1 ? "s" : "";
    S.push(`<section><div class="wrap"><div class="kicker">La note</div><h2>Gestion financière.</h2>
      <div style="text-align:center;margin:30px 0 4px">
        <span style="font-family:'Gabarito',sans-serif;font-weight:900;font-size:104px;line-height:1">${virg(ng.note)}</span><span style="font-family:'Gabarito',sans-serif;font-weight:900;font-size:38px;opacity:.3">/${ng.sur}</span>
      </div>
      <p style="text-align:center;font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 26px">${esc(ng.mention)}</p>
      <div class="ticket">${lignes}</div>
      ${paras(r.note_finale?.commentaire)}
      <p style="font-family:'IBM Plex Mono',monospace;font-size:11.5px;opacity:.55;line-height:1.6;margin-top:20px">Note calculée par le moteur à partir de tes chiffres, sur ${ng.nb_criteres_retenus} critère${pluriel} réellement mesurable${pluriel}. Franklin ne l'a pas inventée, il l'a lue.</p>
      </div></section>`);
  }

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Franklin AI — Rapport confidentiel</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Gabarito:wght@700;900&family=IBM+Plex+Sans:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>${REPORT_CSS}</style></head><body>
<header><div class="wrap">
  <div class="brand">FRANKLIN <span>AI</span></div>
  <svg class="mini" viewBox="0 0 90 110" aria-hidden="true">
    <path d="M12 8 l8 6 8-6 8 6 8-6 8 6 8-6 8 6 8-6 v88 l-8 6-8-6-8 6-8-6-8 6-8-6-8 6-8-6 z" fill="#fffdf8" stroke="#14161f" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="34" cy="38" r="3.4" fill="#14161f"/><circle cx="56" cy="38" r="3.4" fill="#14161f"/>
    <path d="M34 52 q11 9 22 0" stroke="#14161f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="26" y="66" width="38" height="6" rx="2" fill="#9cc3ff"/><rect x="26" y="76" width="26" height="4" rx="2" fill="#d8d8cf"/>
  </svg>
  <div class="badge">RAPPORT CONFIDENTIEL — NE PAS MONTRER À TA BANQUE</div>
  <h1>${esc(prenom)}, ton relevé<br>a des choses à te dire.</h1>
  <div class="meta mono">PÉRIODE : ${debut} → ${fin} · ${p.nb_transactions} TRANSACTIONS · ${p.nb_mois} RELEVÉ${p.nb_mois > 1 ? "S" : ""} · LU LIGNE PAR LIGNE</div>
</div></header>
${S.join("\n")}
<footer><div class="wrap">
  <div>FRANKLIN AI · RAPPORT GÉNÉRÉ LE ${dateGen} · FICHIERS SOURCES SUPPRIMÉS APRÈS ANALYSE</div>
  <p class="disclaimer">Franklin est un divertissement lucide, pas un conseiller financier. Il lit, il raconte, il taquine. Il ne recommande rien, ne juge personne, et ne parle jamais de toi à qui que ce soit.</p>
  <p class="disclaimer">Ce rapport s'efface automatiquement sous 30 jours.
  <button id="del-btn" style="background:none;border:none;color:#e6392e;font-family:'IBM Plex Mono',monospace;font-size:12px;cursor:pointer;text-decoration:underline;padding:0">Supprimer mon rapport maintenant</button></p>
  <p class="disclaimer"><a href="/mentions-legales" style="color:#6b6f7e">Mentions légales</a> · <a href="/confidentialite" style="color:#6b6f7e">Confidentialité</a> · <a href="/cgv" style="color:#6b6f7e">CGV</a></p>
</div></footer>
<script>
document.getElementById('del-btn').addEventListener('click', async function () {
  if (!confirm('Supprimer définitivement ce rapport ? Cette action est immédiate et irréversible.')) return;
  const res = await fetch(window.location.pathname, { method: 'DELETE' });
  if (res.ok) document.body.innerHTML = '<div style="max-width:520px;margin:120px auto;padding:24px;font-family:sans-serif;text-align:center"><h1 style="font-size:26px">Rapport supprimé.</h1><p>Franklin a tout oublié. C\\'était un plaisir.</p></div>';
});
</script>
</body></html>`;
}
