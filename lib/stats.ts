/**
 * Franklin AI — moteur de stats (lib/stats.ts)
 * Port fidèle de data/stats.py (prototype validé au centime sur 6 relevés réels).
 * Déterministe. Zéro invention. Tous les chiffres du rapport sortent d'ici.
 * Test de non-régression : tests/parity.mjs compare la sortie aux expected_stats
 * générés par le moteur Python sur les fixtures anonymisées.
 */

export type Side = "debit" | "credit";

export interface RawTransaction {
  date: string;            // dd/mm/yyyy (date comptable)
  valeur: string;
  label: string;
  amount: number;          // toujours positif ; side porte le sens
  side: Side;
  extra: string[];
  merchant: string | null;
  op_date: string | null;
  op_time: string | null;  // hh:mm si dispo (virements SG)
  type: string;            // carte | vir_emis | vir_recu | prelevement | frais | autre
  beneficiaire?: string;
  releve: string;
}

export interface StatsConfig {
  /** regex (source ou bénéficiaire) identifiant le titulaire et ses comptes perso */
  selfPatterns: string[];
}

const C = (x: number): number => Math.round((x + Number.EPSILON) * 100) / 100;

const parseDate = (s: string): Date => {
  const [d, m, y] = s.split("/").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const iso = (d: Date): string => d.toISOString().slice(0, 10);
const dayDiff = (a: Date, b: Date): number => Math.round((b.getTime() - a.getTime()) / 86400000);

// ---------- catégorisation (même taxonomie et même ordre que stats.py) ----------
/* Catégorisation par mots-clés génériques, pas par enseignes.
 *
 *  La liste précédente était construite à partir d'un seul relevé — Z2M, SnP,
 *  RETRO FOODING, TABOBINE. Autrement dit : Franklin ne reconnaissait que les
 *  commerces d'une seule personne. Une cliente a reçu un rapport sans aucune
 *  catégorie, donc sans graphique et avec trois faits gratuits identiques,
 *  parce qu'aucun de ses marchands n'était dans cette liste.
 *
 *  On classe désormais sur ce qui est stable d'un Français à l'autre : le type
 *  de commerce dans le libellé, pas le nom de l'enseigne. L'ordre compte, la
 *  première expression qui correspond gagne — le plus spécifique d'abord. */
const CATS: Array<[string, RegExp]> = [
  ["ia_outils", /OPENAI|CHATGPT|CLAUDE|ANTHROPIC|MISTRAL|MIDJOURNEY|PERPLEXITY|CURSOR|GITHUB|VERCEL|BASE44|RORK|IONOS|OVH|NETLIFY|REPLIT|NOTION|FIGMA/i],
  ["livraison", /UBER ?\*? ?EATS|DELIVEROO|JUST ?EAT|FRICHTI|GLOVO|WOLT|SUSHISHOP LIVR/i],
  ["voyages", /AIR ?FRANCE|BOOKING|AIRBNB|RYANAIR|EASYJET|TRANSAVIA|VUELING|EDREAMS|EXPEDIA|HOTEL|AUBERGE|LASTMINUTE|KAYAK/i],
  ["transport", /UBER|BOLT\.|SNCF|RATP|NAVIGO|BLABLACAR|TRAINLINE|OUIGO|FLIXBUS|TAXI|G7|ESSO|TOTALENERGIES|SHELL|AVIA|INTERMARCHE CARBURANT|STATION|PEAGE|AUTOROUTE|VINCI|PARKING|INDIGO|VELIB|LIME|TIER|CITIZ|GETAROUND/i],
  ["courses", /CARREFOUR|LECLERC|E\.?LECLERC|INTERMARCHE|AUCHAN|LIDL|ALDI|MONOPRIX|FRANPRIX|CASINO|SUPER ?U|HYPER ?U|\bG20\b|PROXI|SPAR|UTILE|COCCINELLE|PICARD|GRAND ?FRAIS|BIOCOOP|NATURALIA|LA VIE CLAIRE|MARCHE|PRIMEUR|BOUCHERIE|FROMAGERIE|POISSONNERIE|NATURA FORC/i],
  ["resto_bars", /RESTAURANT|BRASSERIE|BISTRO|TRATTORIA|PIZZ|SUSHI|BURGER|KEBAB|TACOS|WOK|POKE|BOWL|BOULANGERIE|PATISSERIE|\bCAFE\b|COFFEE|STARBUCKS|\bBAR\b|\bPUB\b|TAVERNE|CAVE A|TRAITEUR|SNACK|MC ?DONALD|\bKFC\b|SUBWAY|FIVE ?GUYS|POKAWA|AMORINO|DELICES|Z2M|SnP|RETRO FOODING|CHEZ PAPA|BOBUN|DAROCO|MELODIE|BROOKLYN|CAVANI|SEKA|SERKOBER|ECLAIRS|TABOBINE|HONGYUN|CHOUBIDOU|MEYCLUB|SODEXO|DALLMAYR|NEOCORNER|HODAS|NOLITA|BURLINGUE|AMALFI|DUECUORI|BIRDZ|MURO/i],
  ["abo_telecom", /FREE ?TELECOM|FREE ?MOBILE|ORANGE|\bSFR\b|BOUYGUES|SOSH|RED BY|PRIXTEL|SYMA|LEBARA/i],
  ["musique_video", /SPOTIFY|DEEZER|NETFLIX|DISNEY|CANAL\+|CANALPLUS|PRIME ?VIDEO|AMAZON ?MEDIA|APPLE ?MUSIC|YOUTUBE|PARAMOUNT|MAX\b|MOLOTOV|AUDIBLE/i],
  ["sport", /FITNESS|BASIC ?FIT|NEONESS|KEEPCOOL|ON ?AIR|SALLE DE SPORT|\bGYM\b|CLUB SPORT|PISCINE|TENNIS|ESCALADE|STRAVA/i],
  ["formation", /AMF PREP|CFA INSTITUTE|UDEMY|COURSERA|OPENCLASSROOMS|FORMATION|ECOLE|UNIVERSIT|AUTO ?MOTO ?ECOLE|CODE DE LA ROUTE|FRANCE TOURISME/i],
  ["shopping", /AMAZON|\bZARA\b|H&M|UNIQLO|BERSHKA|PRIMARK|ASOS|VINTED|SHEIN|\bFNAC\b|DARTY|BOULANGER|DECATHLON|\bIKEA\b|ACTION|CDISCOUNT|LEROY ?MERLIN|CASTORAMA|BRICO|APPLE|GANT|ATELIER NOELA|SEPHORA|NOCIBE|MARIONNAUD/i],
  ["soin", /PHARMACIE|PARAPHARM|COIFF|BARBE|BARBER|INSTITUT|ONGLERIE|SPA\b|OPTIC|DENTAIRE|DENTISTE|MEDECIN|DOCTEUR|LABORATOIRE|KINE|OSTEO|MUTUELLE|DOCTOLIB/i],
  ["logement", /\bLOYER\b|\bEDF\b|ENGIE|VEOLIA|\bSUEZ\b|SYNDIC|AGENCE IMMO|FONCIA|NEXITY|CHARGES COPRO|ASSURANCE HABITATION|\bMAIF\b|\bMACIF\b|MATMUT|AXA|ALLIANZ|GMF/i],
  ["sorties", /CINEMA|\bUGC\b|PATHE|GAUMONT|MK2|THEATRE|CONCERT|SPECTACLE|MUSEE|EXPO|BOWLING|LASER ?GAME|ESCAPE|BILLETRE|DICE|SHOTGUN|PARC LOUVIERE|KUBYK|DOMAINE SAINT|BPIF/i],
  ["frais_bancaires", /COMMISSION D'INTERVENTION|COTISATION MENSUELLE|INTERETS DEBITEURS|AGIOS|OPTION INTERNAT|FRAIS DE TENUE|FRAIS BANCAIRES/i],
];

/** Les clés ci-dessus sont des identifiants techniques. Ces libellés sont ce
 *  que le rapport a le droit d'écrire — un « resto_bars » qui fuit dans une
 *  phrase, c'est la couture du logiciel qui dépasse. */
export const LIBELLES: Record<string, string> = {
  ia_outils: "outils d'IA", livraison: "livraison de repas", voyages: "voyages",
  transport: "transports", courses: "courses", resto_bars: "restaurants et bars",
  abo_telecom: "téléphone et internet", musique_video: "musique et vidéo",
  sport: "sport", formation: "formation", shopping: "achats", soin: "santé et soin",
  logement: "logement et énergie", sorties: "sorties", frais_bancaires: "frais bancaires",
  virement_emis: "virements envoyés", virement_recu: "virements reçus",
  prelevement: "prélèvements", autre: "non classé",
};

interface Tx extends RawTransaction {
  cat: string;
  d: Date;
  month: string;      // mm/yyyy
  source: string | null;
  self_transfer: boolean;
}

/* « DE: » est une convention Société Générale. Ailleurs, l'émetteur d'un
   virement se lit dans le libellé, et c'est la lecture du relevé qui le range
   dans « contrepartie ». Sans ce repli, un salaire versé chez une autre banque
   n'était rattaché à aucune source : revenus_recurrents restait vide, et avec
   lui la vitesse post-salaire, la note de gestion et la moitié du rapport. */
function deOf(t: RawTransaction): string | null {
  const e = t.extra.find((x) => x.startsWith("DE: "));
  if (e) return e.slice(4).replace(/[ :]+$/, "");
  if (t.side === "credit" && t.beneficiaire) return t.beneficiaire.trim();
  if (t.type === "prelevement" && t.merchant) return t.merchant.trim();
  return null;
}

function categorize(t: RawTransaction): string {
  const de = t.extra.find((x) => x.startsWith("DE: "))?.slice(4) ?? "";
  /* On cherche aussi dans la contrepartie : « VIREMENT SNCF CONNECT » n'a pas de
     marchand, mais son bénéficiaire en dit assez pour le classer. */
  const hay = `${t.merchant ?? ""} ${t.label} ${de} ${t.beneficiaire ?? ""}`;
  for (const [cat, re] of CATS) if (re.test(hay)) return cat;
  if (t.type === "vir_emis") return "virement_emis";
  if (t.type === "vir_recu") return "virement_recu";
  if (t.type === "prelevement") return "prelevement";
  if (t.type === "frais") return "frais_bancaires";
  return "autre";
}

/**
 * Un bénéficiaire de virement arrive collé à ses coordonnées bancaires :
 * « Raoul-Duval Francoise / 01 07 SG 01803 CPT 00050288795 / », « KERNEL
 * BIOMEDICAL; 10 08 BQ BNPA CPT 00010453994; ». Le même destinataire apparaît
 * alors sous trois formes, et le classement affiche trois fois la même ligne à
 * 660 € au lieu d'une à 1 980 € — ce qu'une cliente a vu tout de suite.
 * On coupe donc au premier séparateur ou au premier bloc de coordonnées.
 */
function normBeneficiaire(nom: string): string {
  let s = nom.split(/[/;]/)[0];
  s = s.replace(/\s+\d{2}\s+\d{2}\s+(SG|BQ|CPT|BNPA|REVO)\b.*$/i, "");
  s = s.replace(/\s+(IBAN|CPT|REF|BIC)\s*:?.*$/i, "");
  s = s.replace(/\s{2,}/g, " ").trim().replace(/[\s,;./-]+$/, "");
  return s;
}

function normMerchant(m: string | null): string | null {
  if (!m) return null;
  return m.replace(/UBER ?\*? ?TRIP.*/, "UBER *TRIP").replace(/APPLE\.COM\/BILL/, "APPLE").trim();
}

export function computeStats(raw: RawTransaction[], config: StatsConfig) {
  const SELF = new RegExp(config.selfPatterns.join("|"), "i");

  const tx: Tx[] = raw.map((r) => {
    const t = { ...r } as Tx;
    t.cat = categorize(r);
    t.merchant = normMerchant(r.merchant);
    t.d = parseDate(r.date);
    t.month = r.date.slice(3, 10);
    t.source = deOf(r);
    // "VIR INST RE" = virement instantané REÇU mal typé vir_emis par le parseur
    if (t.type === "vir_emis" && t.side === "credit") t.type = "vir_recu";
    const b = t.beneficiaire;
    t.self_transfer = Boolean((b && SELF.test(b)) || (t.source && SELF.test(t.source)));
    return t;
  });

  const dates = tx.map((t) => t.d.getTime());
  const nbReleves = new Set(tx.map((t) => t.releve)).size;
  const stats: Record<string, unknown> = {
    periode: {
      debut: iso(new Date(Math.min(...dates))),
      fin: iso(new Date(Math.max(...dates))),
      nb_mois: nbReleves,
      nb_transactions: tx.length,
    },
  };

  // ---------- totaux ----------
  const deb = C(tx.filter((t) => t.side === "debit").reduce((s, t) => s + t.amount, 0));
  const cred = C(tx.filter((t) => t.side === "credit").reduce((s, t) => s + t.amount, 0));
  stats.totaux = { debits: deb, credits: cred, net: C(cred - deb) };

  const perM = new Map<string, [number, number]>();
  for (const t of tx) {
    const v = perM.get(t.month) ?? [0, 0];
    v[t.side === "debit" ? 0 : 1] += t.amount;
    perM.set(t.month, v);
  }
  const monthKey = (m: string) => m.slice(3) + m.slice(0, 2);
  stats.par_mois = Object.fromEntries(
    [...perM.entries()]
      .sort((a, b) => monthKey(a[0]).localeCompare(monthKey(b[0])))
      .map(([m, v]) => [m, { debits: C(v[0]), credits: C(v[1]), net: C(v[1] - v[0]) }])
  );

  // ---------- revenus récurrents ----------
  const bySrc = new Map<string, Tx[]>();
  for (const t of tx)
    if (t.side === "credit" && t.source && !t.self_transfer)
      bySrc.set(t.source, [...(bySrc.get(t.source) ?? []), t]);
  const revenus = [...bySrc.entries()]
    .filter(([, ts]) => ts.length >= 3)
    .map(([source, ts]) => ({
      source,
      nb: ts.length,
      total: C(ts.reduce((s, x) => s + x.amount, 0)),
      moyenne: C(ts.reduce((s, x) => s + x.amount, 0) / ts.length),
      dates: [...ts].sort((a, b) => a.d.getTime() - b.d.getTime()).map((x) => x.date),
    }))
    .sort((a, b) => b.total - a.total);
  stats.revenus_recurrents = revenus;

  // ---------- abonnements ----------
  const groups = new Map<string, Tx[]>();
  for (const t of tx) {
    if (t.side !== "debit") continue;
    let key: string | null = t.merchant;
    if (t.type === "prelevement") key = t.source;
    if (t.cat === "frais_bancaires" && !t.label.includes("OPTION") && !t.label.includes("COTISATION")) key = null;
    if (t.label.includes("COTISATION MENSUELLE")) key = "SG option Sobrio";
    if (t.label.includes("OPTION INTERNAT")) key = "SG option internationale";
    if (key) groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  type Abo = { marchand: string; nb: number; montant_mensuel: number; total_periode: number; min: number; max: number; projection_annuelle: number };
  const abos: Abo[] = [];
  for (const [m, tsRaw] of groups) {
    if (tsRaw.length < 3) continue;
    const ts = [...tsRaw].sort((a, b) => a.d.getTime() - b.d.getTime());
    const gaps = ts.slice(1).map((b, i) => dayDiff(ts[i].d, b.d));
    const monthlyish = gaps.filter((g) => g >= 21 && g <= 40);
    const amounts = ts.map((x) => x.amount);
    const mn = Math.min(...amounts), mx = Math.max(...amounts);
    const stable = mx - mn <= Math.max(3.0, 0.25 * mx);
    const counts = new Map<number, number>();
    for (const a of amounts) counts.set(a, (counts.get(a) ?? 0) + 1);
    const plateaus = counts.size <= 2 && Math.min(...counts.values()) >= 2;
    /* Un prélèvement mensuel tombe au même jour du mois, à quelques jours près.
       Un achat répété au hasard — le bubble tea à 6 € pris quatre fois — a le même
       montant et des écarts proches de trente jours, donc il passait pour un
       abonnement. La régularité du JOUR est ce qui les sépare, et c'est une
       cliente qui a donné la clé.

       On mesure la dispersion des jours du mois en tenant compte du cycle : le 30
       et le 2 sont à trois jours l'un de l'autre, pas à vingt-huit. */
    const jours = ts.map((x) => x.d.getUTCDate());
    const ecartCyclique = (a: number, b: number) => { const e = Math.abs(a - b); return Math.min(e, 30 - e); };
    const ref = jours[0];
    const derive = Math.max(...jours.map((j) => ecartCyclique(j, ref)));
    const memeJour = derive <= 4;

    if (memeJour && monthlyish.length >= Math.max(2, gaps.length - 1) && (stable || plateaus)) {
      const med = [...amounts].sort((a, b) => a - b)[Math.floor(amounts.length / 2)];
      abos.push({
        marchand: m, nb: ts.length, montant_mensuel: C(med),
        total_periode: C(amounts.reduce((s, a) => s + a, 0)),
        min: mn, max: mx, projection_annuelle: C(12 * med),
      });
    }
  }
  abos.sort((a, b) => b.total_periode - a.total_periode);
  stats.abonnements = {
    nb: abos.length, liste: abos,
    total_mensuel: C(abos.reduce((s, a) => s + a.montant_mensuel, 0)),
    projection_annuelle: C(abos.reduce((s, a) => s + a.projection_annuelle, 0)),
  };

  // ---------- frais bancaires ----------
  const frais = tx.filter((t) => t.side === "debit" &&
    (t.label.includes("COMMISSION D'INTERVENTION") || t.label.includes("INTERETS DEBITEURS")));
  const comm = frais.filter((t) => t.label.includes("COMMISSION"));
  stats.frais_decouvert = {
    commissions_intervention: { nb: comm.length, total: C(comm.reduce((s, t) => s + t.amount, 0)) },
    interets_debiteurs: C(frais.filter((t) => t.label.includes("INTERETS")).reduce((s, t) => s + t.amount, 0)),
    total: C(frais.reduce((s, t) => s + t.amount, 0)),
    dates: frais.map((t) => t.date).sort(),
  };

  // ---------- virements nocturnes ----------
  const timed = tx.filter((t) => t.op_time);
  const hh = (t: Tx) => parseInt(t.op_time!.slice(0, 2), 10);
  const night = timed.filter((t) => hh(t) >= 22 || hh(t) < 4);
  const nightSorted = [...night].sort((a, b) => b.op_time!.localeCompare(a.op_time!));
  const pire = night.length
    ? night.reduce((best, t) => (t.amount > best.amount ? t : best))
    : null;
  stats.virements_nocturnes = {
    nb_horodates: timed.length,
    nb_nocturnes: night.length,
    total_nocturne: C(night.reduce((s, t) => s + t.amount, 0)),
    pire: pire ? { date: pire.date, heure: pire.op_time, montant: pire.amount } : null,
    liste: nightSorted.map((t) => ({ date: t.date, heure: t.op_time, montant: t.amount })),
  };

  // ---------- jours de la semaine (achats carte) ----------
  // ATTENTION : la date comptable regroupe le week-end sur le lundi.
  // On utilise la date d'opération réelle (op_date) quand elle existe.
  const effDate = (t: Tx): Date => {
    if (t.type === "carte" && t.op_date) {
      const [dd, mm] = t.op_date.split("/").map(Number);
      let cand = new Date(Date.UTC(t.d.getUTCFullYear(), mm - 1, dd));
      if (cand.getTime() > t.d.getTime())
        cand = new Date(Date.UTC(t.d.getUTCFullYear() - 1, mm - 1, dd));
      return cand;
    }
    return t.d;
  };
  const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  const wd = new Map<string, [number, number]>();
  for (const t of tx)
    if (t.type === "carte" && t.side === "debit") {
      // JS getUTCDay: 0=dimanche ; Python weekday: 0=lundi
      const j = JOURS[(effDate(t).getUTCDay() + 6) % 7];
      const v = wd.get(j) ?? [0, 0];
      v[0] += 1; v[1] += t.amount; wd.set(j, v);
    }
  stats.carte_par_jour_semaine = Object.fromEntries(
    JOURS.map((j) => [j, { nb: wd.get(j)?.[0] ?? 0, total: C(wd.get(j)?.[1] ?? 0) }])
  );

  // ---------- catégories ----------
  const cats = new Map<string, [number, number]>();
  for (const t of tx)
    if (t.side === "debit" && !t.self_transfer) {
      const v = cats.get(t.cat) ?? [0, 0];
      v[0] += 1; v[1] += t.amount; cats.set(t.cat, v);
    }
  stats.depenses_par_categorie = Object.fromEntries(
    [...cats.entries()].sort((a, b) => b[1][1] - a[1][1]).map(([c, v]) => [c, { nb: v[0], total: C(v[1]) }])
  );

  // ---------- top marchands carte ----------
  const mc = new Map<string, [number, number]>();
  for (const t of tx)
    if (t.type === "carte" && t.side === "debit" && t.merchant) {
      const v = mc.get(t.merchant) ?? [0, 0];
      v[0] += 1; v[1] += t.amount; mc.set(t.merchant, v);
    }
  const top = [...mc.entries()].sort((a, b) => b[1][1] - a[1][1]).slice(0, 15);
  stats.top_marchands = top.map(([m, v]) => ({ marchand: m, nb: v[0], total: C(v[1]) }));

  // ---------- à qui tu vires le plus ----------
  // Les virements vers soi-même sont exclus : ils sont déjà racontés par
  // epargne_yoyo, et « ton premier bénéficiaire, c'est toi » n'est pas une
  // révélation quand on regarde son propre livret.
  const benef = new Map<string, [number, number]>();
  for (const t of tx) {
    if (t.side !== "debit" || t.type !== "vir_emis" || t.self_transfer) continue;
    const qui = normBeneficiaire(t.beneficiaire ?? "");
    if (!qui) continue;
    const val = benef.get(qui) ?? [0, 0];
    val[0] += 1; val[1] += t.amount; benef.set(qui, val);
  }
  const classement = [...benef.entries()]
    .map(([nom, v]) => ({ beneficiaire: nom, nb: v[0], total: C(v[1]) }))
    .sort((a, b) => b.total - a.total);
  stats.top_beneficiaires = {
    nb_distincts: classement.length,
    liste: classement.slice(0, 8),
    premier: classement[0] ?? null,
  };

  // ---------- épargne yo-yo ----------
  const outSelf = tx.filter((t) => t.type === "vir_emis" && t.self_transfer);
  const inSelf = tx.filter((t) => t.type === "vir_recu" && t.self_transfer);
  const so = outSelf.reduce((s, t) => s + t.amount, 0);
  const si = inSelf.reduce((s, t) => s + t.amount, 0);
  stats.epargne_yoyo = {
    sorties_vers_soi: { nb: outSelf.length, total: C(so) },
    retours_depuis_soi: { nb: inSelf.length, total: C(si) },
    navette_totale: C(so + si),
    note: "sorties = épargne/comptes perso/Trade Republic ; retours = rapatriements",
  };

  // ---------- vitesse post-salaire ----------
  const salaireSrc = revenus.length ? revenus[0].source : null;
  const salaires = salaireSrc
    ? tx.filter((t) => t.side === "credit" && t.source === salaireSrc).sort((a, b) => a.d.getTime() - b.d.getTime())
    : [];
  stats.vitesse_post_salaire = salaires.map((s) => {
    const dep7 = C(tx.filter((t) =>
      t.side === "debit" && !t.self_transfer &&
      t.d.getTime() >= s.d.getTime() && dayDiff(s.d, t.d) <= 7
    ).reduce((sum, t) => sum + t.amount, 0));
    return { date_salaire: s.date, montant: s.amount, depense_7j: dep7, pct_7j: C((100 * dep7) / s.amount) };
  });

  // ---------- double dîner ----------
  const courses = tx.filter((t) => t.cat === "courses");
  const livs = tx.filter((t) => t.cat === "livraison");
  const pairs: unknown[] = [];
  for (const c of courses)
    for (const l of livs) {
      const delta = dayDiff(c.d, l.d);
      if (delta >= 0 && delta <= 2)
        pairs.push({
          courses: { date: c.date, montant: c.amount, marchand: c.merchant },
          livraison: { date: l.date, montant: l.amount },
          ecart_jours: delta,
        });
    }
  stats.double_diner = { nb: pairs.length, paires: pairs };

  // ---------- fuites ----------
  const fd = stats.frais_decouvert as { total: number };
  stats.fuites = {
    frais_bancaires_periode: fd.total,
    options_sg_mensuel: C(abos.filter((a) => a.marchand.startsWith("SG option")).reduce((s, a) => s + a.montant_mensuel, 0)),
    abonnements_mensuel_total: (stats.abonnements as { total_mensuel: number }).total_mensuel,
    projection_annuelle_abos: (stats.abonnements as { projection_annuelle: number }).projection_annuelle,
  };

  // ---------- outils IA ----------
  const ia = tx.filter((t) => t.cat === "ia_outils" && t.side === "debit");
  const iaRe = /BASE44|OPENAI|CLAUDE|RORK|IONOS|INPI/i;
  stats.outils_ia = {
    nb: ia.length,
    total_periode: C(ia.reduce((s, t) => s + t.amount, 0)),
    detail: Object.fromEntries(
      [...mc.entries()].sort((a, b) => b[1][1] - a[1][1]).filter(([m]) => iaRe.test(m)).map(([m, v]) => [m, C(v[1])])
    ),
  };

  return stats;
}
