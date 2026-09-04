/**
 * Le même mois de vie, lu chez trois banques.
 *
 * Franklin a été construit sur cinq relevés Société Générale, et l'extraction du
 * commerçant reposait sur un motif propre à cette banque : /CARTE X\\d+ jj\\/mm (.+)/.
 * Ailleurs, le commerçant n'était jamais reconnu — et sans commerçant il n'y a
 * plus d'abonnements, plus de salaire, plus de bénéficiaires, plus de jours de la
 * semaine. Un client d'une autre banque payait 6,90 € pour un rapport bâti sur les
 * rares lignes que les mots-clés attrapaient au vol. C'est arrivé.
 *
 * Ce test vérifie qu'un même mois donne le même résultat chez SG, BoursoBank et
 * BNP. Il ne teste pas l'écriture du rapport : il teste ce que le moteur a compris,
 * ce qui est la seule chose dont l'écriture dispose.
 *
 * Lancer :
 *   npx esbuild lib/enrich.ts lib/stats.ts --outdir=/tmp/fk --format=esm --platform=node
 *   sed -i '' 's#from "./stats"#from "./stats.js"#' /tmp/fk/enrich.js
 *   node tests/banques.mjs
 */
import { enrich } from "/tmp/fk/enrich.js";
import { computeStats } from "/tmp/fk/stats.js";

function troisMois(banque, ecriture) {
  const transactions = [];
  for (const m of ["06", "07", "08"]) {
    transactions.push(
      ecriture.salaire(m), ecriture.abonnement(m),
      ecriture.courses(m), ecriture.livraison(m), ecriture.ami(m),
    );
  }
  return {
    banque, titulaire: "M FINLAY TEST",
    meta: { date_prec: "01/06/2026", solde_prec: 100, date_nouv: "31/08/2026", solde_nouv: 100 },
    transactions,
  };
}

/* Société Générale : le libellé porte tout, aucun champ lu n'est nécessaire. */
const SG = troisMois("Société Générale", {
  salaire:    (m) => ({ date: `02/${m}/2026`, label: "VIR RECU 123", details: "DE: ENTREPRISE ACME", amount: 2000, side: "credit" }),
  abonnement: (m) => ({ date: `24/${m}/2026`, label: `CARTE X8497 24/${m} Spotify France`, amount: 21.24, side: "debit" }),
  courses:    (m) => ({ date: `10/${m}/2026`, label: `CARTE X8497 10/${m} CARREFOUR CITY`, amount: 42.1, side: "debit" }),
  livraison:  (m) => ({ date: `15/${m}/2026`, label: `CARTE X8497 15/${m} UBER *EATS`, amount: 18.9, side: "debit" }),
  ami:        (m) => ({ date: `20/${m}/2026`, label: "000001 VIR INSTANTANE EMIS WERO", details: "POUR: LUCAS S", amount: 25, side: "debit" }),
});

/* BoursoBank et BNP : aucun motif reconnaissable dans le libellé. Ce sont les
   champs remplis par la lecture du relevé qui portent l'information. */
const BOURSO = troisMois("BoursoBank", {
  salaire:    (m) => ({ date: `02/${m}/2026`, label: "VIREMENT RECU ENTREPRISE ACME", amount: 2000, side: "credit", op_type: "vir_recu", contrepartie: "ENTREPRISE ACME" }),
  abonnement: (m) => ({ date: `24/${m}/2026`, label: `CARTE 24/${m} SPOTIFY CB*4412`, amount: 21.24, side: "debit", op_type: "carte", merchant: "SPOTIFY" }),
  courses:    (m) => ({ date: `10/${m}/2026`, label: `CARTE 10/${m} CARREFOUR CITY CB*4412`, amount: 42.1, side: "debit", op_type: "carte", merchant: "CARREFOUR CITY" }),
  livraison:  (m) => ({ date: `15/${m}/2026`, label: `CARTE 15/${m} UBER EATS CB*4412`, amount: 18.9, side: "debit", op_type: "carte", merchant: "UBER EATS" }),
  ami:        (m) => ({ date: `20/${m}/2026`, label: "VIREMENT EMIS LUCAS S", amount: 25, side: "debit", op_type: "vir_emis", contrepartie: "LUCAS S" }),
});

const BNP = troisMois("BNP Paribas", {
  salaire:    (m) => ({ date: `02/${m}/2026`, label: "VIR SEPA RECU ENTREPRISE ACME", amount: 2000, side: "credit", op_type: "vir_recu", contrepartie: "ENTREPRISE ACME" }),
  abonnement: (m) => ({ date: `24/${m}/2026`, label: `FACTURE CARTE DU 24${m}26 SPOTIFY PARIS`, amount: 21.24, side: "debit", op_type: "carte", merchant: "SPOTIFY" }),
  courses:    (m) => ({ date: `10/${m}/2026`, label: `FACTURE CARTE DU 10${m}26 CARREFOUR`, amount: 42.1, side: "debit", op_type: "carte", merchant: "CARREFOUR" }),
  livraison:  (m) => ({ date: `15/${m}/2026`, label: `FACTURE CARTE DU 15${m}26 UBER EATS`, amount: 18.9, side: "debit", op_type: "carte", merchant: "UBER EATS" }),
  ami:        (m) => ({ date: `20/${m}/2026`, label: "VIR SEPA EMIS LUCAS S", amount: 25, side: "debit", op_type: "vir_emis", contrepartie: "LUCAS S" }),
});

let echecs = 0;
function verifier(banque, condition, quoi) {
  if (!condition) { echecs++; console.log(`  ECHEC  ${banque} — ${quoi}`); }
}

for (const releve of [SG, BOURSO, BNP]) {
  const s = computeStats(enrich(releve), { selfPatterns: ["FINLAY[\\s-]+TEST"] });
  const b = releve.banque;
  const joursCarte = Object.values(s.carte_par_jour_semaine).reduce((n, j) => n + j.nb, 0);

  verifier(b, s.top_marchands.length >= 3, "aucun commerçant reconnu");
  verifier(b, s.abonnements.nb >= 1, "aucun abonnement détecté");
  verifier(b, s.revenus_recurrents.length >= 1, "salaire non rattaché à une source");
  verifier(b, s.top_beneficiaires.premier != null, "aucun bénéficiaire de virement");
  verifier(b, joursCarte === 9, `${joursCarte} achats carte datés au lieu de 9`);
  verifier(b, !s.depenses_par_categorie.autre, "des écritures sont tombées dans « autre »");

  console.log(`  ${b.padEnd(18)} ${s.top_marchands.length} commerçants · ${s.abonnements.nb} abonnements · salaire ${s.revenus_recurrents[0]?.source ?? "—"}`);
}

console.log(echecs === 0 ? "\nOK — les trois banques donnent la même lecture." : `\n${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
