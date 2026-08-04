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
      <div class="mono">on la voit à peine.<br>comme ta poêle.</div></div>
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

function donut(s: Stats): string {
  const nSelf = s.epargne_yoyo?.sorties_vers_soi?.nb ?? 0;
  const nOther = s.depenses_par_categorie?.virement_emis?.nb ?? 0;
  if (nSelf < 5) return "";
  const deg = Math.round((360 * nSelf) / Math.max(nSelf + nOther, 1));
  return `<div class="chart"><div class="chart-title mono">DESTINATAIRE N°1 DE TES VIREMENTS</div>
    <div class="donutrow">
      <div class="donut" style="background:conic-gradient(var(--blue) 0 ${deg}deg, var(--hl) ${deg}deg 360deg)"><div class="hole mono">TOI</div></div>
      <div class="legend mono"><div><span class="dot d1"></span>TOI-MÊME — ${nSelf} VIREMENTS</div>
      <div><span class="dot d2"></span>LE RESTE DU MONDE — ${nOther}</div>
      <div class="legend-note">tu es ton propre plus gros bénéficiaire. fidèle.</div></div>
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

  const charts = barChart2(stats) + barChartSalaire(stats) + donut(stats);
  if (charts.trim())
    S.push(`<section><div class="wrap"><div class="kicker">Les schémas</div><h2>La science confirme.</h2>${charts}</div></section>`);

  if (r.toi_vs_toi) {
    const col = (side: { label: string; faits: string[] }) => `<h3>${esc(side.label)}</h3><ul>${side.faits.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    S.push(`<section><div class="wrap"><div class="kicker">Toi contre toi</div><h2>${esc(r.toi_vs_toi.titre)}</h2>
      <div class="vs"><div>${col(r.toi_vs_toi.gauche)}</div><div>${col(r.toi_vs_toi.droite)}</div></div>${paras(r.toi_vs_toi.punchline)}</div></section>`);
  }

  if (r.bulletin?.length) {
    const n20 = (s: string) => parseFloat(String(s).replace(",", "."));
    const rows = r.bulletin.map((b) => `<tr><td>${esc(b.matiere)}</td><td class="note${n20(b.note) >= 14 ? " good" : n20(b.note) < 8 ? " bad" : ""}">${esc(b.note)}</td><td class="appr">${esc(b.appreciation)}</td></tr>`).join("");
    S.push(`<section><div class="wrap"><div class="kicker">Bulletin du semestre</div><h2>Conseil de classe.</h2>
      <table class="bulletin"><tr><th>MATIÈRE</th><th>NOTE</th><th>APPRÉCIATION DU RELEVÉ</th></tr>${rows}</table></div></section>`);
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
