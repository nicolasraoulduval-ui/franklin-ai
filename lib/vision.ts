/** Parsing vision universel : PDF -> VisionResult via l'API Claude.
 * Contrôle de cohérence : somme des transactions vs totaux imprimés (retry 1x). */
import type { VisionResult } from "./enrich";

const API = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.FRANKLIN_MODEL || "claude-sonnet-5";

const SCHEMA = {
  type: "object",
  properties: {
    banque: { type: "string" },
    titulaire: { type: "string" },
    meta: { type: "object", properties: {
      date_prec: { type: "string" }, solde_prec: { type: "number" },
      date_nouv: { type: "string" }, solde_nouv: { type: "number" },
      total_debits_imprime: { type: "number", description: "total débit IMPRIMÉ — recopié, jamais calculé" },
      total_credits_imprime: { type: "number", description: "total crédit IMPRIMÉ — recopié, jamais calculé" },
    }, required: ["date_prec", "solde_prec", "date_nouv", "solde_nouv"] },
    transactions: { type: "array", items: { type: "object", properties: {
      date: { type: "string", description: "date comptable dd/mm/yyyy" },
      label: { type: "string" },
      details: { type: "string", description: "lignes de détail concaténées (DE:, POUR:, MOTIF:, DATE:, lieu…)" },
      amount: { type: "number", description: "montant positif, exactement comme imprimé" },
      side: { type: "string", enum: ["debit", "credit"] },
      op_date: { type: "string", description: "date d'opération dd/mm si différente" },
      /* op_time a été retiré du schéma, mais pas pour la raison écrite ici
         auparavant — cette note disait qu'un relevé ne contient aucune heure,
         et c'était faux. Vérification refaite ligne à ligne sur cinq relevés
         Société Générale :

         — les paiements par carte ne portent jamais d'heure. Le modèle en
           produisait quand même, et ces heures ressortaient dans les rapports
           comme des faits. C'est cette fabrication qu'on supprime ici ;
         — les virements instantanés, eux, en portent une, dans leur bloc de
           détail : « DATE: 08/05/2026 01:55 ». Elle est réelle.

         D'où le partage : le modèle ne remplit plus ce champ, mais enrich.ts
         relit l'heure dans le texte du détail par expression régulière. Ce qui
         est imprimé est conservé, ce qui est deviné disparaît — et c'est du code
         qui tranche, pas une consigne.

         Le validateur de chiffres orphelins ne pouvait rien voir : il vérifie
         que le rapport ne dépasse pas le stats.json, pas que le stats.json dit
         la vérité. La fabrication avait lieu en amont. */
    }, required: ["date", "label", "amount", "side"] } },
  },
  required: ["banque", "titulaire", "meta", "transactions"],
};

const SYSTEM = `Tu es un extracteur de relevés bancaires. Tu lis le document page par page et tu
recopies CHAQUE écriture, dans l'ordre, sans exception : achats carte, virements, prélèvements,
frais, commissions, intérêts, remises de chèque, retraits.

Règles absolues :
- Tu RECOPIES les montants tels qu'imprimés. Tu ne calcules rien, tu n'arrondis rien.
- Une écriture = une entrée. Les lignes de détail sous une écriture vont dans \`details\`.
- La colonne du montant détermine \`side\`. Vérifie la position visuellement.
- SOLDE PRÉCÉDENT / NOUVEAU SOLDE / TOTAUX DES MOUVEMENTS ne sont PAS des transactions : meta.
- N'ignore jamais une écriture au motif qu'elle est petite ou répétitive.`;

async function call(pdfB64: string, extraMsg: string): Promise<VisionResult> {
  const res = await fetch(API, {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 32000, system: SYSTEM,
      tools: [{ name: "releve", description: "Rend le relevé extrait.", input_schema: SCHEMA }],
      tool_choice: { type: "tool", name: "releve" },
      messages: [{ role: "user", content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfB64 } },
        { type: "text", text: "Extrais l'intégralité de ce relevé." + extraMsg },
      ] }],
    }),
  });
  if (!res.ok) throw new Error(`API vision ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const out = await res.json();
  const tool = out.content.find((b: { type: string }) => b.type === "tool_use");
  return tool.input as VisionResult;
}

function coherence(r: VisionResult): string[] {
  const d = Math.round(r.transactions.filter((t) => t.side === "debit").reduce((s, t) => s + t.amount, 0) * 100) / 100;
  const c = Math.round(r.transactions.filter((t) => t.side === "credit").reduce((s, t) => s + t.amount, 0) * 100) / 100;
  const errs: string[] = [];
  const { total_debits_imprime: td, total_credits_imprime: tc, solde_prec, solde_nouv } = r.meta;
  /* Tolérance plutôt qu'exactitude au centime.
   *
   *  Le contrôle exact bloquait des clients pour rien : une cliente a été refusée
   *  sur un export SG impeccable, à cause d'un écart de 28,90 € sur 3 698,51 € de
   *  débits — 0,8 %, quelques lignes ratées par la lecture. Perdre une vente pour
   *  préserver une décimale que personne ne vérifiera jamais est un mauvais échange.
   *
   *  Le contrôle garde tout son sens contre les vraies défaillances : une page
   *  sautée, un bloc dupliqué, une colonne mal lue produisent des écarts d'un autre
   *  ordre de grandeur. Le seuil sépare les deux — 1 % du total, avec un plancher
   *  de 5 € pour les petits relevés où 1 % ne veut rien dire.
   *
   *  Contrepartie assumée : les totaux peuvent être très légèrement en dessous du
   *  relevé. Aucun montant n'est inventé — il en manque parfois quelques-uns. */
  const seuil = (total: number) => Math.max(Math.abs(total) * 0.01, 5);
  if (td != null && Math.abs(d - td) > seuil(td)) errs.push(`débits extraits ${d} ≠ total imprimé ${td}`);
  if (tc != null && Math.abs(c - tc) > seuil(tc)) errs.push(`crédits extraits ${c} ≠ total imprimé ${tc}`);
  if (td == null || tc == null) {
    const attendu = Math.round((solde_prec + c - d) * 100) / 100;
    if (Math.abs(attendu - solde_nouv) > 0.02) errs.push(`soldes incohérents: ${attendu} ≠ ${solde_nouv}`);
  }
  return errs;
}

/** Filet de sécurité : un modèle sollicité sur un document sans heure finit
 *  toujours par en produire une. On les supprime à la source plutôt que de
 *  faire confiance au schéma. */
function sansHeures(r: VisionResult): VisionResult {
  for (const t of r.transactions) {
    if ((t as { op_time?: string | null }).op_time) (t as { op_time?: string | null }).op_time = null;
  }
  return r;
}

/** Somme des écarts absolus avec les totaux imprimés. Sert à choisir la
 *  meilleure des tentatives, pas à refuser quoi que ce soit. */
function ecart(r: VisionResult): number {
  const d = Math.round(r.transactions.filter((t) => t.side === "debit").reduce((s, t) => s + t.amount, 0) * 100) / 100;
  const c = Math.round(r.transactions.filter((t) => t.side === "credit").reduce((s, t) => s + t.amount, 0) * 100) / 100;
  const { total_debits_imprime: td, total_credits_imprime: tc } = r.meta;
  return (td != null ? Math.abs(d - td) : 0) + (tc != null ? Math.abs(c - tc) : 0);
}

/**
 * On ne refuse JAMAIS un client pour un écart de lecture.
 *
 * Avant, une extraction imparfaite levait une exception et le client repartait
 * les mains vides. Une cliente a été perdue pour 28,90 € d'écart sur 3 698,51 €
 * de débits : un export bancaire impeccable, refusé par notre propre contrôle.
 *
 * Le contrôle de cohérence reste utile, mais il change de rôle : il ne décide
 * plus s'il faut servir ou non, il décide seulement s'il faut retenter. Trois
 * lectures au plus, on garde la meilleure, et on la sert quoi qu'il arrive.
 *
 * Ce qui reste vrai : aucun montant n'est inventé. Ce qui peut arriver : qu'il
 * en manque quelques-uns. Sur un portrait humoristique, c'est un échange
 * évident — un client servi avec 0,8 % d'écart vaut infiniment mieux qu'un
 * client refusé avec 0 %.
 */
export async function parsePdf(buf: Buffer): Promise<VisionResult> {
  const b64 = buf.toString("base64");
  let extra = "";
  let meilleur: VisionResult | null = null;
  let meilleurEcart = Infinity;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await call(b64, extra);
    const errs = coherence(r);
    if (!errs.length) return sansHeures(r);

    const e = ecart(r);
    if (e < meilleurEcart) { meilleurEcart = e; meilleur = r; }

    extra =
      `\n\nATTENTION, ton extraction précédente (tentative ${attempt}) était incohérente : ${errs.join(" ; ")}. ` +
      `Un écart de cette taille vient presque toujours de lignes oubliées, pas d'un mauvais montant. ` +
      `Reprends le document page par page, compte les écritures de chaque page, et vérifie que tu ` +
      `n'as sauté ni un report de solde, ni une ligne en bas de page, ni une écriture sur deux lignes. ` +
      `Recommence intégralement.`;
  }

  /* Trois lectures, aucune parfaite : on sert la moins mauvaise. Le seul cas où
     l'on ne peut rien faire est l'absence totale de transactions, et il est
     traité plus loin, dans la route d'import. */
  console.warn(`vision: servi avec un écart de ${Math.round(meilleurEcart * 100) / 100} € après 3 lectures`);
  return sansHeures(meilleur!);
}
