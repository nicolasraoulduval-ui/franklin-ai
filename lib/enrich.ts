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

/** Habillage bancaire qu'on retire d'un nom de commerçant quand il subsiste.
 *  Le lecteur fait déjà ce travail ; ceci rattrape ce qui passe entre les mailles,
 *  et surtout normalise le repli Société Générale. */
function nettoyerMarchand(m: string | null | undefined): string | null {
  if (!m) return null;
  const s = m
    /* Le groupe du numéro de carte exige un marqueur — « N° », « X », ou au moins
       quatre chiffres. Écrit `\\d+` tout court, il avalait le 24 de « CARTE 24/06
       CARREFOUR » et laissait « /06 CARREFOUR » comme nom de commerçant. */
    .replace(/^(FACTURE\s+)?(ACHAT|PAIEMENT)?\s*(PAR\s+)?CARTE\s*(BLEUE\s*)?(N\s*°?\s*\d+|X\s*\d+|\d{4,})?\s*(DU\s+)?/i, "")
    .replace(/^X?\d{4,}\s+/, "")
    .replace(/\b\d{2}\/\d{2}(\/\d{2,4})?\b/g, " ")
    .replace(/\bCB\s*\*?\d*\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return s.length >= 2 ? s : null;
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
    /* Ce que la lecture a compris prime : elle voit le relevé, quelle que soit
       la banque. Le motif Société Générale reste dessous, en repli — il connaît
       une seule banque, mais il la connaît sûrement, et il donne la date
       d'opération que le schéma ne demande pas. */
    let type = v.op_type && v.op_type !== "autre" ? v.op_type : "autre";
    let merchant: string | null = nettoyerMarchand(v.merchant);
    let op_date: string | null = v.op_date || null;

    const m = lab.match(/CARTE X\d+ (\d{2}\/\d{2}) (.+)/);
    if (m) {
      if (type === "autre") type = "carte";
      op_date = op_date ?? m[1];
      merchant = merchant ?? nettoyerMarchand(m[2]);
    } else if (type === "autre") {
      if (/VIR RECU|VIREMENT RECU|VIR\.? EN VOTRE FAVEUR/i.test(lab)) type = "vir_recu";
      else if (/VIR INSTANTANE EMIS|VIR INST|^000001 VIR|VIREMENT EMIS|VIR\.? EMIS/i.test(lab)) type = "vir_emis";
      else if (/PRELEVEMENT|PRLV|PRÉLÈVEMENT/i.test(lab)) type = "prelevement";
      else if (/COMMISSION|FRAIS|COTISATION|AGIOS|INTERETS DEBITEURS/i.test(lab)) type = "frais";
      else if (/RETRAIT|DAB\b/i.test(lab)) type = "retrait";
      else if (/CHEQUE|CHQ\b/i.test(lab)) type = "cheque";
      /* Dernier filet : une écriture avec un montant, sans nature reconnue et
         sans mot-clé de virement, est presque toujours un achat par carte. La
         classer ainsi vaut mieux que de la laisser en « autre », où elle devient
         invisible pour le rapport — c'est exactement ce qui privait un client
         hors Société Générale de la moitié de son relevé. */
      else if (v.side === "debit" && merchant) type = "carte";
    }
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
