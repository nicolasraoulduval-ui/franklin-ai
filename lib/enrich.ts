/** Enrichissement des transactions extraites par vision -> RawTransaction[] (schéma du moteur). */
import type { RawTransaction, Side } from "./stats";

export interface VisionTx {
  date: string; label: string; details?: string;
  amount: number; side: Side; op_date?: string; op_time?: string;
}
export interface VisionResult {
  banque: string; titulaire: string;
  meta: { date_prec: string; solde_prec: number; date_nouv: string; solde_nouv: number;
          total_debits_imprime?: number; total_credits_imprime?: number };
  transactions: VisionTx[];
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
    let type = "autre", merchant: string | null = null, op_date: string | null = v.op_date || null;
    const m = lab.match(/CARTE X\d+ (\d{2}\/\d{2}) (.+)/);
    if (m) { type = "carte"; op_date = m[1]; merchant = m[2].trim(); }
    else if (/VIR RECU/.test(lab)) type = "vir_recu";
    else if (/VIR INSTANTANE EMIS|VIR INST|^000001 VIR/.test(lab)) type = "vir_emis";
    else if (/PRELEVEMENT/.test(lab)) type = "prelevement";
    else if (/COMMISSION|FRAIS|COTISATION/.test(lab)) type = "frais";
    else if (/RETRAIT/.test(lab)) type = "retrait";
    let op_time: string | null = v.op_time || null;
    let beneficiaire: string | undefined;
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
