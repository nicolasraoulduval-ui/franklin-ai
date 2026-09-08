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

/* Seuils relevés après le passage du banc d'essai : sur dix profils, sept
   décrochaient « Félicitations du conseil ». Une mention que presque tout le
   monde obtient n'est plus une mention, c'est une formule de politesse. */
function mention(note: number): string {
  if (note >= 18) return "Félicitations du conseil";
  if (note >= 15.5) return "Compliments";
  if (note >= 13) return "Encouragements";
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
      /* 20 % de reste donnait le maximum. C'est un taux d'épargne correct, pas
         exceptionnel : deux profils du banc gardaient 23 % et obtenaient 4/4,
         au même niveau qu'un profil qui en gardait 78 %. Le 4 commence à 35 %. */
      note: palier(taux, [[35, 4], [20, 3], [8, 2], [0, 1]]),
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
    /* Ne pas payer de frais de découvert est la situation ordinaire, pas un
       exploit : neuf profils du banc sur dix y arrivaient et empochaient 4/4
       automatiquement. Le point de plus va à qui, en prime, n'a jamais fini un
       mois dans le rouge. */
    const tousPositifs = mois.length >= 2 && mois.every((m: any) => (m?.net ?? 0) >= 0);
    sous.push({
      matiere: "Distance avec le découvert",
      note: fr === 0 ? (tousPositifs ? 4 : 3) : palier(part, [[0.1, 3], [0.3, 2], [1, 1]], true),
      sur: 4,
      mesure: fr === 0 ? "aucun frais de découvert sur la période" : `${eur(fr)} € de frais de découvert`,
    });
  }

  // 4 · vitesse post-salaire — combien part dans les 7 jours qui suivent la paie
  /* Le dernier salaire de la période n'a presque jamais sept jours derrière lui :
     le relevé s'arrête avant. La fenêtre est alors vide, elle vaut 0 %, et cette
     fausse abstinence tire la moyenne vers le bas. Cinq profils du banc sur dix
     décrochaient 4/4 grâce à ce zéro. On ne garde que les fenêtres complètes. */
  const finPeriode = (() => {
    const f = String(stats?.periode?.fin ?? "");
    const d = new Date(f);
    return isNaN(d.getTime()) ? null : d;
  })();
  const fenetreComplete = (v: any): boolean => {
    if (!finPeriode) return true;
    const m = String(v?.date_salaire ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return true;
    const paie = new Date(`${m[3]}-${m[2]}-${m[1]}`);
    if (isNaN(paie.getTime())) return true;
    return paie.getTime() + 7 * 864e5 <= finPeriode.getTime();
  };
  const vitesse: any[] = (stats?.vitesse_post_salaire ?? []).filter(fenetreComplete);
  if (vitesse.length >= 2) {
    const moy = vitesse.reduce((s, v) => s + (v?.pct_7j ?? 0), 0) / vitesse.length;
    sous.push({
      matiere: "Sang-froid après salaire",
      note: palier(moy, [[20, 4], [35, 3], [50, 2], [65, 1]], true),
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
    const nbAbos: number = stats?.abonnements?.nb ?? 0;
    /* Le poids seul ne suffit pas : un profil du banc payait neuf abonnements
       pour 6,5 % de ses revenus et gardait 18/20. Neuf prélèvements à surveiller
       chaque mois est un problème en soi — c'est le nombre de portes ouvertes,
       pas la somme, qui fait qu'on en oublie une. */
    const malus = nbAbos >= 8 ? 2 : nbAbos >= 5 ? 1 : 0;
    const brut = palier(part, [[2, 4], [5, 3], [9, 2], [14, 1]], true);
    sous.push({
      matiere: "Résistance aux abonnements",
      /* Le malus retire des points, il n'annule pas le critère : neuf abonnements
         qui pèsent 6,5 % des revenus, ce n'est pas la même chose que cinq qui en
         pèsent 19. Le zéro reste réservé à qui l'a mérité par le poids seul. */
      note: brut > 0 ? Math.max(1, brut - malus) : 0,
      sur: 4,
      mesure: nbAbos >= 5
        ? `${nbAbos} abonnements, ${eur(abosMensuel)} € par mois, soit ${pc} % de ce qui rentre`
        : `${eur(abosMensuel)} € par mois d'abonnements, soit ${pc} % de ce qui rentre`,
    });
  }

  // Aucun critère mesurable : on ne note pas plutôt que de noter au hasard.
  if (!sous.length) {
    return { note: 0, sur: 20, mention: "Pas assez de matière pour noter", nb_criteres_retenus: 0, sous_notes: [] };
  }

  const obtenu = sous.reduce((s, x) => s + x.note, 0);
  const maximum = 4 * sous.length;
  let note = arrondiDemi((20 * obtenu) / maximum);

  /* Un plafond, pas un critère de plus.
     Un profil de test payait neuf commissions d'intervention en trois mois et
     ressortait à 16/20 avec « Félicitations du conseil » : les quatre autres
     critères compensaient le zéro sur le découvert. Or on ne félicite pas
     quelqu'un que sa banque prélève chaque mois pour dépassement. Trois
     commissions ou plus, et la note ne peut plus dire que tout va bien. */
  const commissions: number = stats?.frais_decouvert?.commissions_intervention?.nb ?? 0;
  if (commissions >= 3) note = Math.min(note, 11);
  else if (commissions >= 1) note = Math.min(note, 15);

  /* Un mois de relevé et deux critères mesurables donnaient 20/20 avec
     « Félicitations du conseil » — sur sept lignes. La note reste celle du
     calcul, punir le manque de données serait injuste, mais la mention doit
     dire d'où elle sort : on ne décerne pas un bulletin sur un mois. */
  const maigre = sous.length < 3 || nbMois < 2;

  return {
    note,
    sur: 20,
    mention: maigre ? "Trop peu de relevés pour un vrai bulletin" : mention(note),
    nb_criteres_retenus: sous.length,
    sous_notes: sous,
  };
}
