/** Rédaction du rapport Franklin : stats -> JSON sections via l'API Claude.
 * Validateur de chiffres orphelins + retry (règle cardinale du produit). */
import { FRANKLIN_SYSTEM_PROMPT } from "./prompt";

const API = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.FRANKLIN_MODEL || "claude-sonnet-5";

export interface Rapport {
  archetype: { titre: string; sous_titre: string; texte: string };
  mensonges: Array<{ mensonge: string; verite: string; punchline: string }>;
  fuites?: { intro?: string; lignes: Array<{ label: string; montant_json: string }>; total_label?: string; punchline?: string };
  signature: { titre: string; texte: string };
  toi_vs_toi?: { titre: string; gauche: { label: string; faits: string[] }; droite: { label: string; faits: string[] }; punchline?: string };
  bulletin?: Array<{ matiere: string; note: string; appreciation: string }>;
  verdict: { texte: string; derniere_ligne: string };
  cartes: Array<{ texte: string }>;
}

const SCHEMA = {
  type: "object",
  properties: {
    archetype: { type: "object", properties: { titre: { type: "string" }, sous_titre: { type: "string" }, texte: { type: "string" } }, required: ["titre", "sous_titre", "texte"] },
    mensonges: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", properties: { mensonge: { type: "string" }, verite: { type: "string" }, punchline: { type: "string" } }, required: ["mensonge", "verite", "punchline"] } },
    fuites: { type: "object", properties: { intro: { type: "string" }, lignes: { type: "array", items: { type: "object", properties: { label: { type: "string" }, montant_json: { type: "string" } }, required: ["label", "montant_json"] } }, total_label: { type: "string" }, punchline: { type: "string" } }, required: ["lignes"] },
    signature: { type: "object", properties: { titre: { type: "string" }, texte: { type: "string" } }, required: ["titre", "texte"] },
    toi_vs_toi: { type: "object", properties: { titre: { type: "string" }, gauche: { type: "object", properties: { label: { type: "string" }, faits: { type: "array", items: { type: "string" } } }, required: ["label", "faits"] }, droite: { type: "object", properties: { label: { type: "string" }, faits: { type: "array", items: { type: "string" } } }, required: ["label", "faits"] }, punchline: { type: "string" } }, required: ["titre", "gauche", "droite"] },
    bulletin: { type: "array", minItems: 5, maxItems: 7, items: { type: "object", properties: { matiere: { type: "string" }, note: { type: "string" }, appreciation: { type: "string" } }, required: ["matiere", "note", "appreciation"] } },
    verdict: { type: "object", properties: { texte: { type: "string" }, derniere_ligne: { type: "string" } }, required: ["texte", "derniere_ligne"] },
    cartes: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", properties: { texte: { type: "string" } }, required: ["texte"] } },
  },
  required: ["archetype", "mensonges", "signature", "verdict", "cartes"],
};

function collectNumbers(obj: unknown, acc: Set<number>): void {
  if (obj == null) return;
  if (typeof obj === "number") acc.add(Math.round(obj * 100) / 100);
  else if (typeof obj === "string") {
    for (const m of obj.matchAll(/\d+(?:[.,]\d+)?/g)) acc.add(Math.round(parseFloat(m[0].replace(",", ".")) * 100) / 100);
  } else if (Array.isArray(obj)) obj.forEach((v) => collectNumbers(v, acc));
  else if (typeof obj === "object") Object.values(obj).forEach((v) => collectNumbers(v, acc));
}

const SMALL_OK = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 15, 20, 100]);

export function orphans(report: Rapport, allowed: Set<number>): string[] {
  let text = JSON.stringify(report);
  text = text.replace(/\d{4}-\d{2}-\d{2}/g, " ").replace(/\d{2}\/\d{2}(?:\/\d{4})?/g, " ")
             .replace(/\d{1,2}[hH]\d{2}/g, " ").replace(/\b20\d{2}\b/g, " ");
  // recoller les milliers quel que soit le séparateur invisible
  text = text.replace(/(?<=\d)[^\S\n]+(?=\d{3}(?:\D|$))/g, "").replace(/(?<=\d)[ -​  ⁠]+(?=\d{3}(?:\D|$))/g, "");
  const truncs = new Set<number>();
  for (const a of allowed) { truncs.add(Math.trunc(a)); truncs.add(Math.round(a)); }
  const bad: string[] = [];
  for (const m of text.matchAll(/\d+(?:[.,]\d+)?/g)) {
    const tok = m[0];
    const val = parseFloat(tok.replace(",", "."));
    const hasDec = tok.includes(",") || tok.includes(".");
    if (allowed.has(val) || allowed.has(-val) || SMALL_OK.has(val)) continue;
    if (!hasDec && truncs.has(val)) continue;
    bad.push(tok);
  }
  return bad;
}

export async function generateRapport(stats: unknown, prenom: string): Promise<Rapport> {
  const system = FRANKLIN_SYSTEM_PROMPT;
  const allowed = new Set<number>();
  collectNumbers(stats, allowed);
  let userMsg = `Voici le stats.json de l'utilisateur (prénom : ${prenom}). ` +
    `Génère le rapport en respectant strictement le format de sortie.\n\n` + JSON.stringify(stats);
  let last: Rapport | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 12000, system,
        tools: [{ name: "rapport", description: "Rend le rapport Franklin structuré.", input_schema: SCHEMA }],
        tool_choice: { type: "tool", name: "rapport" },
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) throw new Error(`API franklin ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const out = await res.json();
    const report = out.content.find((b: { type: string }) => b.type === "tool_use").input as Rapport;
    const bad = orphans(report, allowed);
    last = report;
    if (!bad.length) return report;
    userMsg += `\n\nATTENTION : ta version précédente citait des chiffres absents du JSON : ${bad.slice(0, 10).join(", ")}. ` +
      `Régénère en n'utilisant QUE les chiffres du stats.json.`;
  }
  throw new Error("rapport avec chiffres orphelins après 3 tentatives");
}
