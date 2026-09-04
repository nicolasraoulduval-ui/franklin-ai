/**
 * Douze banques françaises, libellés réels.
 *
 * Franklin a été construit sur cinq relevés Société Générale. L'extraction du
 * commerçant reposait sur un motif propre à cette banque ; ailleurs, il n'y
 * avait ni commerçant, ni abonnements, ni salaire, ni bénéficiaires. Un client
 * d'une autre banque payait 6,90 € pour un rapport bâti sur les rares lignes
 * que les mots-clés attrapaient au vol. C'est arrivé, et il l'a dit avant nous.
 *
 * PROVENANCE DES LIBELLÉS — aucun n'est inventé :
 *   · connecteurs de production woob/Powens, écrits sur données bancaires
 *     réelles (github.com/rbignon/woob/tree/master/modules) : Crédit Agricole,
 *     LCL, BNP, Société Générale, Caisse d'Épargne, Crédit Mutuel, CIC,
 *     La Banque Postale, Fortuneo ;
 *   · exports CSV publics : BoursoBank, Société Générale ;
 *   · fixtures CFONB réelles (OCA/l10n-france, silarhi/cfonb-parser) ;
 *   · table officielle « libellés de relevé ↔ opérations » de la Banque
 *     Populaire du Sud, seule référence publiée par une banque française.
 *
 * CE QUE CE TEST NE PROUVE PAS : ces formats viennent du web et des API des
 * banques, pas de leurs PDF. Dans la grande majorité des cas la chaîne est la
 * même, mais ce n'est pas garanti. Seul un vrai PDF par banque le dira.
 *
 * Lancer :
 *   npx esbuild lib/enrich.ts lib/stats.ts --outdir=/tmp/fk --format=esm --platform=node
 *   sed -i '' 's#from "./stats"#from "./stats.js"#' /tmp/fk/enrich.js
 *   node tests/banques.mjs
 */
import { enrich } from "/tmp/fk/enrich.js";
import { computeStats } from "/tmp/fk/stats.js";

let echecs = 0;
const dit = (ok, ligne) => { if (!ok) { echecs++; console.log("  ECHEC  " + ligne); } };

/* ── 1 · le libellé seul ────────────────────────────────────────────────────
   Le pire cas : la lecture du relevé n'a rempli aucun champ, il ne reste que
   la chaîne. C'est ce qui doit tenir pour que le produit marche partout. */

const LIBELLES = [
  ["Société Générale",  "CARTE X8497 24/06 Spotify France",                        "carte",       "Spotify France"],
  ["Société Générale",  "CARTE X8497 15/06 UBER *EATS",                            "carte",       "UBER *EATS"],
  ["Société Générale",  "000001 VIR EUROPEEN EMIS LOGITEL POUR: RENT AGENCY 30 12", "vir_emis",   null],
  ["Société Générale",  "VIR RECU 1234567890Z DE: ACME INC MOTIF: SALAIRE",        "vir_recu",    null],
  ["Société Générale",  "COTISATION MENSUELLE JAZZ",                               "frais",       null],
  ["BoursoBank",        "CARTE 05/02/26 AMZN Mktp FR*308J CB*7686",                "carte",       "AMZN Mktp FR"],
  ["BoursoBank",        "VIR SEPA FRANCE TRAVAIL",                                 "vir_recu",    null],
  ["BoursoBank",        "VIR SEPA Loyer Villard",                                  "vir_emis",    null],
  ["BoursoBank",        "PRLV SEPA PAYEE NAME",                                    "prelevement", null],
  ["BoursoBank",        "RETRAIT DAB 01/03/25 My location CB*9876",                "retrait",     null],
  ["BNP Paribas",       "FACTURE CARTE DU 240626 SPOTIFY CARTE 1234X",             "carte",       "SPOTIFY"],
  ["BNP Paribas",       "VIREMENT SEPA RECU /DE ACME /MOTIF SALAIRE",              "vir_recu",    null],
  ["BNP Paribas",       "VIREMENT SEPA EMIS /BEN LUCAS S",                         "vir_emis",    null],
  ["BNP Paribas",       "PRLV SEPA FREE MOBILE MDT/FM-479 ECH/240626",             "prelevement", null],
  ["BNP Paribas",       "RETRAIT DAB 24/06/26 14h30 001 PARIS",                    "retrait",     null],
  ["LCL",               "CB CARREFOUR CITY 24/06/26",                              "carte",       "CARREFOUR CITY"],
  ["LCL",               "CB RETRAIT DU 24/06",                                     "retrait",     null],
  ["LCL",               "VIR SEPA RECU ACME",                                      "vir_recu",    null],
  ["LCL",               "CHQ. 1234567",                                            "cheque",      null],
  ["Crédit Agricole",   "PAIEMENT PAR CARTE CARREFOUR CITY 24/06",                 "carte",       "CARREFOUR CITY"],
  ["Crédit Agricole",   "VIREMENT EN VOTRE FAVEUR ACME 19.03.2026",                "vir_recu",    null],
  ["Crédit Agricole",   "RETRAIT AU DISTRIBUTEUR PARIS 24/06",                     "retrait",     null],
  ["Crédit Agricole",   "PRELEVEMENT SPOTIFY 24/06/2026",                          "prelevement", null],
  ["Caisse d'Épargne",  "CB SPOTIFY FACT 240626",                                  "carte",       "SPOTIFY"],
  ["Caisse d'Épargne",  "FAC CB CARREFOUR 24/06",                                  "carte",       "CARREFOUR"],
  ["Caisse d'Épargne",  "RET DAB PARIS 240626 14h30",                              "retrait",     null],
  ["Caisse d'Épargne",  "VIR.PERIODIQUE LUCAS S",                                  "vir_emis",    null],
  ["Banque Populaire",  "CARTE - PAIEMENT CB",                                     "carte",       null],
  ["Banque Populaire",  "RET DAB BPS 240626 CB:1234",                              "retrait",     null],
  ["Banque Populaire",  "COTIS CARTE",                                             "frais",       null],
  ["Crédit Mutuel",     "PAIEMENT CB 0209 PARIS CARTE 00747350",                   "carte",       "PARIS"],
  ["Crédit Mutuel",     "PAIEMENT CB 2209 LEVALLOIS PAYWEB00747350",               "carte",       "LEVALLOIS"],
  ["Crédit Mutuel",     "RETRAIT DAB 2406 PARIS CARTE ****1234",                   "retrait",     null],
  ["Crédit Mutuel",     "FACTURE SGT20022040001692",                               "frais",       null],
  ["CIC",               "PRLV SEPA FREE MOBILE",                                   "prelevement", null],
  ["La Banque Postale", "ACHAT CB SPOTIFY 24.06.26",                               "carte",       "SPOTIFY"],
  ["La Banque Postale", "VIREMENT DE ACME",                                        "vir_recu",    null],
  ["La Banque Postale", "PRELEVEMENT DE SPOTIFY",                                  "prelevement", null],
  ["La Banque Postale", "FRAIS DE TENUE DE COMPTE",                                "frais",       null],
  ["La Banque Postale", "DEBIT CARTE BANCAIRE DIFFERE",                            "recap",       null],
  ["Fortuneo",          "CARTE 04/07 Google Payment I Dublin",                     "carte",       "Google Payment I Dublin"],
  ["Fortuneo",          "PRLV PRIXTEL  SCOR/53766825A",                            "prelevement", null],
  ["Fortuneo",          "VIR INST Leclerc XXXX",                                   "vir_emis",    null],
  ["Hello bank!",       "FACTURE CARTE DU 150324 MONOPRIX CARTE 1234X",            "carte",       "MONOPRIX"],
  ["divers",            "RELEVE CB AU 30/06/2026",                                 "recap",       null],
];

console.log("1 · libellé seul, sans aucun champ lu");
for (const [banque, label, typeAttendu, marchandAttendu] of LIBELLES) {
  /* Un virement sans marqueur explicite se tranche par la colonne, pas par le
     mot : « VIR SEPA X » se dit dans les deux sens. */
  const side = /RECU|FAVEUR|VIREMENT DE |FRANCE TRAVAIL/i.test(label) ? "credit" : "debit";
  const [t] = enrich({ banque, titulaire: "M X", meta: {}, transactions: [{ date: "24/06/2026", label, amount: 10, side }] });
  dit(t.type === typeAttendu, `${banque} — type ${t.type}, attendu ${typeAttendu} — « ${label} »`);
  if (marchandAttendu !== null)
    dit(t.merchant === marchandAttendu, `${banque} — commerçant ${JSON.stringify(t.merchant)}, attendu ${JSON.stringify(marchandAttendu)} — « ${label} »`);
}
console.log(`  ${LIBELLES.length} libellés, 12 banques`);

/* ── 2 · le même mois de vie, lu chez trois banques ─────────────────────────
   Ici la lecture du relevé remplit ses champs, comme en production. On vérifie
   que le moteur en tire la même chose partout. */

function troisMois(banque, ecriture) {
  const transactions = [];
  for (const m of ["06", "07", "08"])
    transactions.push(ecriture.salaire(m), ecriture.abonnement(m), ecriture.courses(m), ecriture.livraison(m), ecriture.ami(m));
  return { banque, titulaire: "M FINLAY TEST",
    meta: { date_prec: "01/06/2026", solde_prec: 100, date_nouv: "31/08/2026", solde_nouv: 100 }, transactions };
}

const SG = troisMois("Société Générale", {
  salaire:    (m) => ({ date: `02/${m}/2026`, label: "VIR RECU 123", details: "DE: ENTREPRISE ACME", amount: 2000, side: "credit" }),
  abonnement: (m) => ({ date: `24/${m}/2026`, label: `CARTE X8497 24/${m} Spotify France`, amount: 21.24, side: "debit" }),
  courses:    (m) => ({ date: `10/${m}/2026`, label: `CARTE X8497 10/${m} CARREFOUR CITY`, amount: 42.1, side: "debit" }),
  livraison:  (m) => ({ date: `15/${m}/2026`, label: `CARTE X8497 15/${m} UBER *EATS`, amount: 18.9, side: "debit" }),
  ami:        (m) => ({ date: `20/${m}/2026`, label: "000001 VIR INSTANTANE EMIS WERO", details: "POUR: LUCAS S", amount: 25, side: "debit" }),
});

const BOURSO = troisMois("BoursoBank", {
  salaire:    (m) => ({ date: `02/${m}/2026`, label: "VIR SEPA ENTREPRISE ACME", amount: 2000, side: "credit", op_type: "vir_recu", contrepartie: "ENTREPRISE ACME" }),
  abonnement: (m) => ({ date: `24/${m}/2026`, label: `CARTE 24/${m}/26 SPOTIFY CB*4412`, amount: 21.24, side: "debit", op_type: "carte", merchant: "SPOTIFY" }),
  courses:    (m) => ({ date: `10/${m}/2026`, label: `CARTE 10/${m}/26 CARREFOUR CITY CB*4412`, amount: 42.1, side: "debit", op_type: "carte", merchant: "CARREFOUR CITY" }),
  livraison:  (m) => ({ date: `15/${m}/2026`, label: `CARTE 15/${m}/26 UBER EATS CB*4412`, amount: 18.9, side: "debit", op_type: "carte", merchant: "UBER EATS" }),
  ami:        (m) => ({ date: `20/${m}/2026`, label: "VIR SEPA LUCAS S", amount: 25, side: "debit", op_type: "vir_emis", contrepartie: "LUCAS S" }),
});

const BNP = troisMois("BNP Paribas", {
  salaire:    (m) => ({ date: `02/${m}/2026`, label: "VIREMENT SEPA RECU /DE ENTREPRISE ACME", amount: 2000, side: "credit", op_type: "vir_recu", contrepartie: "ENTREPRISE ACME" }),
  abonnement: (m) => ({ date: `24/${m}/2026`, label: `FACTURE CARTE DU 24${m}26 SPOTIFY CARTE 1234X`, amount: 21.24, side: "debit", op_type: "carte", merchant: "SPOTIFY" }),
  courses:    (m) => ({ date: `10/${m}/2026`, label: `FACTURE CARTE DU 10${m}26 CARREFOUR`, amount: 42.1, side: "debit", op_type: "carte", merchant: "CARREFOUR" }),
  livraison:  (m) => ({ date: `15/${m}/2026`, label: `FACTURE CARTE DU 15${m}26 UBER EATS`, amount: 18.9, side: "debit", op_type: "carte", merchant: "UBER EATS" }),
  ami:        (m) => ({ date: `20/${m}/2026`, label: "VIREMENT SEPA EMIS /BEN LUCAS S", amount: 25, side: "debit", op_type: "vir_emis", contrepartie: "LUCAS S" }),
});

console.log("\n2 · le même mois, trois banques");
for (const releve of [SG, BOURSO, BNP]) {
  const s = computeStats(enrich(releve), { selfPatterns: ["FINLAY[\\s-]+TEST"] });
  const b = releve.banque;
  const joursCarte = Object.values(s.carte_par_jour_semaine).reduce((n, j) => n + j.nb, 0);
  dit(s.top_marchands.length >= 3, `${b} — aucun commerçant reconnu`);
  dit(s.abonnements.nb >= 1, `${b} — aucun abonnement détecté`);
  dit(s.revenus_recurrents.length >= 1, `${b} — salaire non rattaché à une source`);
  dit(s.top_beneficiaires.premier != null, `${b} — aucun bénéficiaire de virement`);
  dit(joursCarte === 9, `${b} — ${joursCarte} achats carte datés au lieu de 9`);
  dit(!s.depenses_par_categorie.autre, `${b} — des écritures sont tombées dans « autre »`);
  console.log(`  ${b.padEnd(18)} ${s.top_marchands.length} commerçants · ${s.abonnements.nb} abonnements · salaire ${s.revenus_recurrents[0]?.source ?? "—"}`);
}

console.log(echecs === 0 ? "\nOK — rien ne dépend de la banque." : `\n${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
