/**
 * Franklin AI — note de gestion financière (lib/note.ts)
 *
 * Déterministe. Aucun chiffre n'est produit par le modèle : la note et ses
 * cinq sous-notes sortent d'ici, à partir des stats réelles. Elles sont
 * ensuite injectées dans le stats.json, ce qui les rend automatiquement
 * autorisées par le validateur de chiffres orphelins (lib/franklin.ts).
 *
 * Un critère qui ne peut pas être calculé (pas de salaire récurrent, un seul
 * relevé, aucun abonnement) est neutralisé plutôt que noté zéro : la note est
 * ramenée sur 20 au prorata des critères réellement mesurables. Sans ça, un
 * client qui apporte un seul relevé serait puni pour un manque de données.
 */

type Stats = Record<string, any>;

export interface SousNote {
  matiere: string;
  note: number;      // sur 4
  sur: number;       // 4
  mesure: string;    // ce qui a été mesuré, en clair
}

export interface NoteGestion {
  note: number;              // sur 20, au demi-point
  sur: number;               // 20
  mention: string;
  nb_criteres_retenus: number;
  sous_notes: SousNote[];
}

/** Barème décroissant : premier seuil atteint = note obtenue. */
function palier(valeur: number, seuils: Array<[number, number]>, sensInverse = false): number {
  for (const [seuil, note] of seuils) {
    if (sensInverse ? valeur <= seuil : valeur >= seuil) return note;
  }
  return 0;
}

const arrondiDemi = (x: number) => Math.round(x * 2) / 2;

/** 148.5 -> "148,5" ; 42 -> "42". Le rapport est en français, les points décimaux
 *  anglo-saxons sautent aux yeux dans un texte soigné. */
const eur = (x: number) => String(Math.round(x * 100) / 100).replace(".", ",");

function mention(note: number): string {
  if (note >= 16) return "Félicitations du conseil";
  if (note >= 14) return "Compliments";
  if (note >= 12) return "Encouragements";
  if (note >= 10) return "Doit confirmer";
  if (note >= 7) return "Avertissement de travail";
  return "Le conseil est inquiet";
}

export function calculerNote(stats: Stats): NoteGestion {
  const sous: SousNote[] = [];

  const credits: number = stats?.totaux?.credits ?? 0;
  const net: number = stats?.totaux?.net ?? 0;
  const nbMois: number = stats?.periode?.nb_mois ?? 0;

  // 1 · ce qui reste à la fin — solde net rapporté à tout ce qui est entré
  if (credits > 0) {
    const taux = (100 * net) / credits;
    const t = Math.abs(Math.round(taux));
    sous.push({
      matiere: "Tenue du compte",
      note: palier(taux, [[20, 4], [10, 3], [0, 2], [-10, 1]]),
      sur: 4,
      mesure: taux >= 0
        ? `${t} % de ce qui est entré est encore là à la fin`
        : `${t} % de plus est sorti qu'il n'est entré`,
    });
  }

  // 2 · régularité — proportion de mois terminés à l'équilibre ou mieux
  const mois = stats?.par_mois ? Object.values(stats.par_mois as Record<string, any>) : [];
  if (mois.length >= 2) {
    const positifs = mois.filter((m: any) => (m?.net ?? 0) >= 0).length;
    const part = (100 * positifs) / mois.length;
    sous.push({
      matiere: "Art de finir le mois",
      note: palier(part, [[100, 4], [75, 3], [50, 2], [25, 1]]),
      sur: 4,
      mesure: `${positifs} mois sur ${mois.length} terminés sans creuser`,
    });
  }

  // 3 · frais de découvert — le seul poste que la banque facture pour rien
  if (credits > 0 && stats?.frais_decouvert) {
    const fr: number = stats.frais_decouvert.total ?? 0;
    const part = (100 * fr) / credits;
    sous.push({
      matiere: "Distance avec le découvert",
      note: fr === 0 ? 4 : palier(part, [[0.1, 3], [0.3, 2], [1, 1]], true),
      sur: 4,
      mesure: fr === 0 ? "aucun frais de découvert sur la période" : `${eur(fr)} € de frais de découvert`,
    });
  }

  // 4 · vitesse post-salaire — combien part dans les 7 jours qui suivent la paie
  const vitesse: any[] = stats?.vitesse_post_salaire ?? [];
  if (vitesse.length >= 2) {
    const moy = vitesse.reduce((s, v) => s + (v?.pct_7j ?? 0), 0) / vitesse.length;
    sous.push({
      matiere: "Sang-froid après salaire",
      note: palier(moy, [[25, 4], [40, 3], [55, 2], [70, 1]], true),
      sur: 4,
      mesure: `${Math.round(moy)} % du salaire dépensé dans les 7 jours`,
    });
  }

  // 5 · abonnements — la dépense qu'on ne décide plus chaque mois
  const abosMensuel: number = stats?.abonnements?.total_mensuel ?? 0;
  if (credits > 0 && nbMois > 0 && abosMensuel > 0) {
    const revenuMensuel = credits / nbMois;
    const part = (100 * abosMensuel) / revenuMensuel;
    /* Le libellé doit porter la mesure, pas seulement le montant. Un « 105,56 €
       par mois » affiché à côté d'un 4/4 se lit comme une contradiction ; le
       même montant rapporté aux revenus (« 3 % de ce qui rentre ») explique la
       note. Le critère mesure une part, il doit afficher une part. */
    const pc = part < 10 ? part.toFixed(1).replace(".", ",").replace(",0", "") : String(Math.round(part));
    sous.push({
      matiere: "Résistance aux abonnements",
      note: palier(part, [[3, 4], [6, 3], [10, 2], [15, 1]], true),
      sur: 4,
      mesure: `${eur(abosMensuel)} € par mois d'abonnements, soit ${pc} % de ce qui rentre`,
    });
  }

  // Aucun critère mesurable : on ne note pas plutôt que de noter au hasard.
  if (!sous.length) {
    return { note: 0, sur: 20, mention: "Pas assez de matière pour noter", nb_criteres_retenus: 0, sous_notes: [] };
  }

  const obtenu = sous.reduce((s, x) => s + x.note, 0);
  const maximum = 4 * sous.length;
  const note = arrondiDemi((20 * obtenu) / maximum);

  return { note, sur: 20, mention: mention(note), nb_criteres_retenus: sous.length, sous_notes: sous };
}
