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

  facts.sort((a, b) => a.prio - b.prio);
  const out = facts.slice(0, 3).map((f) => f.texte);
  while (out.length < 3)
    out.push(`${s.periode?.nb_transactions ?? "Des centaines de"} transactions lues ligne par ligne. Franklin a tout vu, et il a des questions.`);
  return out;
}
