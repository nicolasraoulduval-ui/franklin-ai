/** Enrichissement des transactions extraites par vision -> RawTransaction[] (schéma du moteur). */
import type { RawTransaction, Side } from "./stats";

export interface VisionTx {
  date: string; label: string; details?: string;
  amount: number; side: Side; op_date?: string; op_time?: string;
  /* Renseignés par la lecture du relevé, toutes banques confondues. */
  merchant?: string; op_type?: string; contrepartie?: string;
}
export interface VisionResult {
  banque: string; titulaire: string;
  meta: { date_prec: string; solde_prec: number; date_nouv: string; solde_nouv: number;
          total_debits_imprime?: number; total_credits_imprime?: number };
  transactions: VisionTx[];
}

/**
 * Lecture d'un libellé d'opération, toutes banques françaises.
 *
 * Ce bloc n'existait pas : le code ne connaissait qu'un seul motif,
 * /CARTE X\\d+ jj\\/mm (.+)/, celui de la Société Générale, sur laquelle Franklin a
 * été construit. Un client d'une autre banque n'avait donc ni commerçant, ni
 * abonnements, ni salaire, ni bénéficiaires : la moitié de son relevé était
 * illisible pour le moteur. C'est arrivé, et le client l'a dit avant nous.
 *
 * Les formats ci-dessous sont relevés sur des sources réelles — connecteurs de
 * production Powens/woob écrits sur données bancaires, exports CSV publics,
 * fixtures CFONB, et la table officielle des libellés publiée par la Banque
 * Populaire. Ils ne sont pas devinés. tests/banques.mjs les rejoue tous.
 *
 * Ce jeu de règles reste un filet : quand la lecture du relevé remplit
 * merchant / op_type / contrepartie, ce sont eux qui priment. Il sert quand
 * elle ne les remplit pas, et pour les banques qu'elle lirait mal.
 */

/** Lignes qui récapitulent d'autres lignes — un débit de carte différée n'est
 *  pas un achat, et le compter comme tel fausse marchands et jours d'achat. */
const RECAP = /^(RELEVE CB|TOTAL DES FACTURES|DEBIT CARTE BANCAIRE DIFFERE|DEBIT MENSUEL CARTE|CB \d{4}\*+ TOT DIF|\*{2} PAS DE MOUVEMENT)/i;

/** Un paiement carte par famille de banques. L'ordre compte : premier qui prend. */
const CARTES: RegExp[] = [
  /^CARTE X?\d+\s+(?<d>\d{2}\/\d{2})\s+(?<m>.+)$/i,                                    // Société Générale
  /^CARTE\s+(?<d>\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(?<m>.+)$/i,                             // BoursoBank, Fortuneo
  /^(?:FACTURE\s+)?CARTE\s+DU\s+(?<d>\d{6}|\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(?<m>.+)$/i,   // BNP, Hello bank
  /^ACHAT\s+CB\s+(?<m>.+?)\s+(?<d>\d{2}[.\/]\d{2}[.\/]\d{2,4})\s*$/i,                   // La Banque Postale
  /^PAIEMENT\s+PAR\s+CARTE\s+(?<m>.+?)(?:\s+(?<d>\d{2}\/\d{2}(?:\/\d{2,4})?))?\s*$/i,   // Crédit Agricole
  /^PAIEMENT\s+(?:CB|PSC|MOB)\s+(?<d>\d{4})\s+(?<m>.+?)\s*(?:CARTE\s*\d+|PAYWEB\d+)?\s*$/i, // Crédit Mutuel, CIC
  /^\*?(?:FAC\s+)?CB\s+(?:\d{4}\*+\s+)?(?<m>.+?)(?:\s+FACT)?\s+(?<d>\d{6}|\d{2}[.\/]\d{2}(?:[.\/]\d{2,4})?)\s*$/i, // Caisse d'Épargne
  /^CB\s+(?<m>.+?)\s*$/i,                                                              // LCL, forme courte
];

/** Résidus à retirer d'un nom de commerçant : numéros de carte sous leurs six
 *  formes rencontrées, dates sous cinq séparateurs, heures. */
const RESIDUS: Array<[RegExp, string]> = [
  [/\bCB\s*[:*]\s*\d+/gi, " "],
  [/\bCARTE\s*(?:N\s*°?\s*)?[\dX]{3,}/gi, " "],
  [/\bPAYWEB\d+/gi, " "],
  [/\*{2,}\d+/g, " "],
  [/\b\d{4}X{4,}\d{4}\b/gi, " "],
  [/\bX\d{4,}\b/gi, " "],
  [/\b\d{2}[.\/-]\d{2}(?:[.\/-]\d{2,4})?\b/g, " "],
  [/\b\d{1,2}h\d{2}\b/gi, " "],
];

function nettoyerMarchand(m: string | null | undefined): string | null {
  if (!m) return null;
  let s = String(m);
  for (const [re, par] of RESIDUS) s = s.replace(re, par);
  s = s.replace(/\s{2,}/g, " ").trim().replace(/[\s,;.-]+$/, "");
  s = sansPSP(s);
  return s.length >= 2 ? s : null;
}

/* L'astérisque sépare parfois le prestataire de paiement du commerçant :
   « HPY*L'APPAC » (HiPay devant l'enseigne), « AMZN Mktp FR*308J » (le code de
   commande derrière). Mais il fait aussi partie de vrais noms — « UBER *EATS »,
   « Google *temporary Hold » — et les couper serait pire que les garder. On ne
   retire donc que les deux formes reconnaissables : un préfixe court tout en
   majuscules, ou un code alphanumérique de fin. Dans le doute, on garde. */
function sansPSP(s: string): string {
  if (!s.includes("*")) return s;
  let out = s.replace(/^[A-Z]{2,4}\*\s*/, "");
  /* Le code de fin doit contenir un chiffre pour être un code : sans ça on
     ampute « UBER *EATS » de sa moitié utile. */
  out = out.replace(/\s*\*[A-Za-z]*\d[A-Za-z0-9]*$/, "");
  return out.trim() || s;
}

function normDate(d?: string | null): string | null {
  if (!d) return null;
  const s = String(d).replace(/[.-]/g, "/");
  if (/^\d{6}$/.test(s) || /^\d{4}$/.test(s)) return s.slice(0, 2) + "/" + s.slice(2, 4);
  const m = s.match(/^(\d{2})\/(\d{2})/);
  return m ? m[1] + "/" + m[2] : null;
}

export function lireLibelle(label: string, side: Side): { type: string; merchant: string | null; op_date: string | null } {
  const l = (label || "").trim();
  const rien = { merchant: null, op_date: null };
  if (RECAP.test(l)) return { type: "recap", ...rien };

  /* Le retrait passe avant la carte : « CB RETRAIT DU 24/06 » (LCL) commence
     comme un paiement et n'en est pas un. */
  if (/RETRAIT\s+(DAB|GAB|AU\s+DISTRIBUTEUR|MUR|CARTE|ESPECES|DU)|RET\s+(DAB|GAB)|CB\s+RETRAIT/i.test(l))
    return { type: "retrait", ...rien };
  /* Banque Populaire écrit le paiement carte sans commerçant ni date. */
  if (/^CARTE\s*-\s*PAIEMENT\s+CB\s*$/i.test(l)) return { type: "carte", ...rien };

  for (const re of CARTES) {
    const m = l.match(re);
    if (m?.groups) return { type: "carte", merchant: nettoyerMarchand(m.groups.m), op_date: normDate(m.groups.d) };
  }
  if (/CHEQUE|\bCHQ\b|\bCHQ\./i.test(l)) return { type: "cheque", ...rien };
  if (/\bPRLV|PRELEV|PRELEVT|PRELEVMNT|\bPE SEPA\b|\bPlt\b|TELEREGLEMENT|\bTIP\b/i.test(l))
    return { type: "prelevement", ...rien };
  if (/\bVIR\b|VIREMENT|\bVIRT\.?|\bEVI\b|\bVRST\b|VERSEMENT/i.test(l)) {
    /* « VIR SEPA X » se dit dans les deux sens — chez BoursoBank, « VIR SEPA
       FRANCE TRAVAIL » est reçu et « VIR SEPA Loyer Villard » est émis. Les
       marqueurs explicites priment ; à défaut, c'est la colonne qui tranche,
       jamais le mot. */
    if (/RECU|EN VOTRE FAVEUR|FAVEUR TIERS|^VIREMENT DE |\bDE:/i.test(l)) return { type: "vir_recu", ...rien };
    if (/\bEMIS\b|\bPOUR:|^VIRT?\.? ?POUR /i.test(l)) return { type: "vir_emis", ...rien };
    return { type: side === "credit" ? "vir_recu" : "vir_emis", ...rien };
  }
  if (/COTIS|\bFRAIS\b|COMMISSION|AGIOS|INTERETS|\bABON\b|DROITS DE GARDE|FACTURE SGT|\bF (COTIS|ABO|REJ)/i.test(l))
    return { type: "frais", ...rien };
  return { type: "autre", ...rien };
}

/** re-segmente la chaîne details en pseudo-lignes (DE:, POUR:, MOTIF:, …) */
function splitDetails(details: string | undefined): string[] {
  if (!details || !details.trim()) return [];
  return details.split(/(?=DE: |POUR: |MOTIF: |DATE: |REF: |ID: |MANDAT )/).map((s) => s.trim()).filter(Boolean);
}

export function enrich(vr: VisionResult): RawTransaction[] {
  return vr.transactions.map((v) => {
    const extra = splitDetails(v.details);
    const lab = v.label;

    /* Ce que la lecture du relevé a compris prime : elle voit le document.
       À défaut, on lit le libellé nous-mêmes, avec les motifs de douze banques.
       Les deux se complètent — la lecture donne souvent le commerçant sans le
       type, le libellé donne souvent le type sans le commerçant. */
    const lu = lireLibelle(lab, v.side);
    let type = v.op_type && v.op_type !== "autre" ? v.op_type : lu.type;
    const merchant: string | null = nettoyerMarchand(v.merchant) ?? lu.merchant;
    const op_date: string | null = v.op_date || lu.op_date;

    /* Dernier filet : un débit avec un commerçant mais sans nature reconnue est
       presque toujours un achat par carte. Le classer ainsi vaut mieux que de le
       laisser en « autre », où il devient invisible pour le rapport. */
    if (type === "autre" && v.side === "debit" && merchant) type = "carte";

    let op_time: string | null = v.op_time || null;
    let beneficiaire: string | undefined = v.contrepartie?.trim() || undefined;
    for (const e of extra) {
      const t = e.match(/DATE: \d{2}\/\d{2}\/\d{4} (\d{2}:\d{2})/);
      if (t) op_time = t[1];
      const p = e.match(/POUR: (.+)/);
      if (p) beneficiaire = p[1].trim();
    }

    const out: RawTransaction = {
      date: v.date, valeur: v.date, label: lab, amount: v.amount, side: v.side,
      extra, merchant, op_date, op_time, type, releve: vr.meta.date_nouv,
    };
    if (beneficiaire) out.beneficiaire = beneficiaire;
    return out;
  });
}

/** déduit les patterns "soi-même" du nom du titulaire imprimé sur le relevé */
export function selfPatternsFromHolder(titulaire: string): string[] {
  const clean = titulaire.replace(/^(M|MME|MLE|MLLE|MR|MONSIEUR|MADAME)\.?\s+/i, "");
  const names = clean.split(/[\s-]+/).filter((w) => w.length >= 3)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!names.length) return ["__aucun__"];
  const fwd = names.join("[\\s-]+");
  const rot = names.slice(1).concat(names[0]).join("[\\s-]+");
  return [fwd, rot];
}
