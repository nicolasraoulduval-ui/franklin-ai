/**
 * Franklin AI — la section « Si… » (lib/si.ts)
 *
 * Déterministe, comme lib/note.ts. Aucun de ces chiffres n'est produit par le
 * modèle : ils sont calculés ici puis injectés dans le stats.json, ce qui les
 * rend automatiquement autorisés par le validateur de chiffres orphelins.
 *
 * Deux règles ont dicté la forme de cette section.
 *
 * 1 · L'équivalence vient de SON relevé, jamais du monde extérieur. Écrire
 *     « tu pourrais t'offrir une console » supposerait d'inventer un prix —
 *     exactement ce que le produit promet de ne jamais faire. Convertir en
 *     « 5 mois de tous tes abonnements » n'invente rien et frappe plus fort,
 *     parce que c'est sa propre vie qui sert d'unité de mesure.
 *
 * 2 · On constate, on ne recommande pas. « Ça représente » et non « tu
 *     pourrais » : les CGV disent que Franklin n'est pas un conseil financier,
 *     et une section qui suggère des arbitrages budgétaires en serait un.
 */

type Stats = Record<string, any>;

export interface SiAlors {
  titre: string;        // « Si tu commandais 25 % de moins »
  montant: string;      // « 143,20 € »
  periode: string;      // « sur la période »
  equivalence: string;  // « 5 mois de tous tes abonnements réunis »
}

const C = (x: number) => Math.round(x * 100) / 100;

/** 1234.5 -> « 1 234,50 € ». Espace insécable avant l'euro, comme le reste du rapport. */
function eur(x: number): string {
  const [e, d] = C(x).toFixed(2).split(".");
  return e.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f") + "," + d + "\u00a0€";
}

const mot = (n: number): string =>
  ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"][n] ?? String(n);

/** Une équivalence n'a de sens que si le diviseur existe et n'est pas ridicule. */
function equivalence(montant: number, stats: Stats): string | null {
  const cat = stats?.depenses_par_categorie ?? {};

  const abosMensuel: number = stats?.abonnements?.total_mensuel ?? 0;
  if (abosMensuel > 5) {
    const n = Math.round(montant / abosMensuel);
    if (n >= 2 && n <= 60) return `${n <= 10 ? mot(n) : n} mois de tous tes abonnements réunis`;
  }

  const liv = cat.livraison;
  if (liv?.nb >= 3) {
    const panier = liv.total / liv.nb;
    const n = Math.round(montant / panier);
    if (n >= 2 && n <= 200) return `${n <= 10 ? mot(n) : n} commandes de livraison`;
  }

  const cou = cat.courses;
  if (cou?.nb >= 3) {
    const panier = cou.total / cou.nb;
    const n = Math.round(montant / panier);
    if (n >= 2 && n <= 200) return `${n <= 10 ? mot(n) : n} paniers de courses`;
  }

  const nbMois: number = stats?.periode?.nb_mois ?? 0;
  const credits: number = stats?.totaux?.credits ?? 0;
  if (nbMois > 0 && credits > 0) {
    const jour = credits / (nbMois * 30);
    const n = Math.round(montant / jour);
    if (n >= 2 && n <= 120) return `${n <= 10 ? mot(n) : n} jours de tout ce qui rentre`;
  }
  return null;
}

export function calculerSi(stats: Stats): SiAlors[] {
  const out: SiAlors[] = [];
  const nbMois: number = stats?.periode?.nb_mois ?? 0;
  const surLaPeriode = nbMois > 1 ? `sur tes ${nbMois} relevés` : "sur ce relevé";

  // 1 · le premier marchand carte, à un quart de moins
  const top = (stats?.top_marchands ?? [])[0];
  if (top && top.total > 40) {
    const m = C(0.25 * top.total);
    const eq = equivalence(m, stats);
    if (eq) {
      out.push({
        titre: `Si tu allais un quart de fois en moins chez ${top.marchand}`,
        montant: eur(m), periode: surLaPeriode, equivalence: eq,
      });
    }
  }

  // 2 · les frais de découvert ramenés à zéro. Le seul poste qui n'achète rien.
  const frais: number = stats?.frais_decouvert?.total ?? 0;
  if (frais > 10) {
    const eq = equivalence(frais, stats);
    if (eq) {
      out.push({
        titre: "Si tu n'avais jamais touché le découvert",
        montant: eur(frais), periode: surLaPeriode, equivalence: eq,
      });
    }
  }

  // 3 · les abonnements, projetés sur douze mois
  const annuel: number = stats?.abonnements?.projection_annuelle ?? 0;
  if (annuel > 60) {
    const cou = stats?.depenses_par_categorie?.courses;
    let eq: string | null = null;
    if (cou?.total > 0) {
      const n = Math.round(annuel / cou.total);
      if (n >= 2 && n <= 60) eq = `${n <= 10 ? mot(n) : n} fois tout ce que tu as mis dans ton frigo ${surLaPeriode}`;
    }
    eq = eq ?? equivalence(annuel, stats);
    if (eq) {
      out.push({
        titre: "Si tes abonnements continuent exactement comme ça pendant un an",
        montant: eur(annuel), periode: "sur douze mois", equivalence: eq,
      });
    }
  }

  return out.slice(0, 3);
}
