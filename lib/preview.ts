/** Aperçu gratuit : 3 vérités chiffrées choisies par heuristique de choc.
 * 100% code — déterministe, instantané, gratuit. (Reformulation Claude : V2.) */

type Stats = Record<string, any>;
const eur = (x: number) => x.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export function buildPreview(s: Stats): string[] {
  const facts: Array<{ prio: number; texte: string }> = [];

  const abos = s.abonnements;
  if (abos?.nb >= 3)
    facts.push({ prio: 1, texte: `${abos.nb} abonnements détectés, ${eur(abos.total_mensuel)} par mois. Tu en connais combien, de tête ?` });

  const noct = s.virements_nocturnes;
  if (noct?.nb_nocturnes >= 3)
    facts.push({ prio: 2, texte: `${noct.nb_nocturnes} virements passés entre 22h et 4h du matin${noct.pire ? `, dont ${eur(noct.pire.montant)} à ${noct.pire.heure}` : ""}. Ton banquier dort. Pas toi.` });

  const cats = s.depenses_par_categorie ?? {};
  const r = cats.resto_bars, c = cats.courses;
  if (r?.nb >= 10 && c && r.nb >= 3 * c.nb)
    facts.push({ prio: 3, texte: `${r.nb} passages en restos et bars contre ${c.nb} en courses. Ta cuisine aimerait te parler.` });

  const y = s.epargne_yoyo;
  if (y?.sorties_vers_soi?.nb >= 10)
    facts.push({ prio: 4, texte: `${y.sorties_vers_soi.nb} virements vers tes propres comptes, ${eur(y.sorties_vers_soi.total)}. Ton plus gros bénéficiaire, c'est toi.` });

  const f = s.frais_decouvert;
  if (f?.total >= 5)
    facts.push({ prio: 5, texte: `${eur(f.total)} de frais de découvert offerts à ta banque. Elle ne t'a même pas dit merci.` });

  const v = (s.vitesse_post_salaire ?? []).filter((x: any) => x.pct_7j >= 50 && x.pct_7j <= 100 && x.montant >= 500);
  if (v.length)
    facts.push({ prio: 6, texte: `Le salaire du ${v[0].date_salaire.slice(0, 5)} : ${String(v[0].pct_7j).replace(".", ",")} % dépensé en 7 jours. Il n'a pas souffert longtemps.` });

  // faits mono-mois (marchent dès 1 relevé)
  const jours = Object.entries(s.carte_par_jour_semaine ?? {}) as Array<[string, any]>;
  if (jours.length) {
    const [jour, jv] = jours.reduce((best, cur) => (cur[1].total > best[1].total ? cur : best));
    if (jv.total >= 100)
      facts.push({ prio: 7, texte: `Ton jour le plus cher : le ${jour}. ${jv.nb} paiements carte, ${eur(jv.total)}. Le ${jour}, tu ne comptes pas.` });
  }
  const top = (s.top_marchands ?? []).find((m: any) => m.nb >= 4);
  if (top)
    facts.push({ prio: 8, texte: `${top.nb} passages chez ${top.marchand}. À ce stade, ce n'est plus un commerce, c'est une relation.` });
  const tr = s.depenses_par_categorie?.livraison;
  if (tr?.nb >= 3)
    facts.push({ prio: 9, texte: `${tr.nb} livraisons de repas pour ${eur(tr.total)}. Le livreur connaît ton code d'immeuble par cœur.` });

  /* Faits de repli. Ils ne dépendent d'aucune catégorie et marchent donc sur
     n'importe quel relevé, même celui d'une banque dont on ne reconnaît aucun
     marchand. Une cliente a reçu trois fois la MÊME phrase de remplissage :
     l'écran qui doit vendre le rapport se répétait trois fois avant de demander
     6,90 €. On garde donc toujours de quoi remplir, et jamais deux fois pareil. */
  const mois = Object.entries((s.par_mois ?? {}) as Record<string, any>);
  if (mois.length >= 2) {
    const cher = mois.reduce((b, c) => (c[1].debits > b[1].debits ? c : b));
    facts.push({ prio: 20, texte: `Ton mois le plus lourd : ${cher[0]}, ${eur(cher[1].debits)} sortis. Les autres mois te regardent avec inquiétude.` });
    const pire = mois.reduce((b, c) => (c[1].net < b[1].net ? c : b));
    if (pire[1].net < 0)
      facts.push({ prio: 21, texte: `En ${pire[0]}, tu as terminé à ${eur(pire[1].net)}. Ce mois-là, le compte a travaillé sans filet.` });
  }
  const t = s.totaux ?? {};
  if (t.credits > 0)
    facts.push({ prio: 22, texte: `${eur(t.credits)} sont entrés, ${eur(t.debits)} sont sortis. Il reste ${eur(t.net)} — c'est tout ce que la période a laissé derrière elle.` });
  const p = s.periode ?? {};
  if (p.nb_transactions)
    facts.push({ prio: 23, texte: `${p.nb_transactions} transactions lues une par une. Pas survolées : comptées.` });
  const gros = (s.top_marchands ?? [])[0];
  if (gros)
    facts.push({ prio: 24, texte: `Ton premier poste carte : ${gros.marchand}, ${eur(gros.total)} en ${gros.nb} fois. Une habitude, pas un accident.` });

  facts.sort((a, b) => a.prio - b.prio);
  const out = facts.slice(0, 3).map((f) => f.texte);
  /* Dernier filet, et il est varié : trois textes différents, jamais répétés. */
  const secours = [
    `${s.periode?.nb_transactions ?? "Des centaines de"} transactions lues une par une. Franklin a tout vu.`,
    "Ton relevé est plus bavard que tu ne le crois. Le reste est derrière.",
    "Il a trouvé de quoi écrire. Il garde le meilleur pour le rapport.",
  ];
  for (const texte of secours) {
    if (out.length >= 3) break;
    if (!out.includes(texte)) out.push(texte);
  }
  return out;
}
