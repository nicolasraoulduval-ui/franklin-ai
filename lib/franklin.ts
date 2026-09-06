/** Rédaction du rapport Franklin : stats -> JSON sections via l'API Claude.
 * Validateur de chiffres orphelins + retry (règle cardinale du produit). */
import { FRANKLIN_SYSTEM_PROMPT } from "./prompt";
import { LIBELLES } from "./stats";

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
  /** L'IA n'écrit que le commentaire : la note vient de lib/note.ts, jamais du modèle. */
  note_finale?: { commentaire: string };
  /** Même chose : montants et équivalences viennent de lib/si.ts, pas du modèle. */
  si_alors?: { intro: string; punchline: string };
  cartes: Array<{ texte: string }>;
}

/**
 * Le schéma porte les limites de longueur, parce que la consigne ne suffit pas.
 *
 * Le prompt demande 550 à 800 mots pour six mois de données. Mesuré sur dix
 * profils de test : entre 1 468 et 1 569 mots, sans exception — le double, à
 * chaque fois. Un modèle négocie avec une phrase en prose ; il ne négocie pas
 * avec maxLength. Les bornes ci-dessous additionnées donnent environ 700 mots,
 * ce qui laisse de la place pour bien écrire et aucune pour délayer.
 *
 * C'est le reproche d'un client, mot pour mot : « en général il faut moins de
 * texte, plus de schémas et plus d'humour ».
 */
const SCHEMA = {
  type: "object",
  properties: {
    archetype: { type: "object", properties: {
      titre: { type: "string", maxLength: 34 },
      sous_titre: { type: "string", maxLength: 70 },
      texte: { type: "string", maxLength: 620 },
    }, required: ["titre", "sous_titre", "texte"] },
    mensonges: { type: "array", minItems: 3, maxItems: 4, items: { type: "object", properties: {
      mensonge: { type: "string", maxLength: 90 },
      verite: { type: "string", maxLength: 170 },
      punchline: { type: "string", maxLength: 140 },
    }, required: ["mensonge", "verite", "punchline"] } },
    fuites: { type: "object", properties: {
      intro: { type: "string", maxLength: 200 },
      lignes: { type: "array", maxItems: 6, items: { type: "object", properties: {
        label: { type: "string", maxLength: 70 }, montant_json: { type: "string", maxLength: 24 },
      }, required: ["label", "montant_json"] } },
      total_label: { type: "string", maxLength: 60 },
      punchline: { type: "string", maxLength: 150 },
    }, required: ["lignes"] },
    signature: { type: "object", properties: {
      titre: { type: "string", maxLength: 60 },
      texte: { type: "string", maxLength: 560 },
    }, required: ["titre", "texte"] },
    toi_vs_toi: { type: "object", properties: {
      titre: { type: "string", maxLength: 44 },
      gauche: { type: "object", properties: { label: { type: "string", maxLength: 30 }, faits: { type: "array", maxItems: 4, items: { type: "string", maxLength: 90 } } }, required: ["label", "faits"] },
      droite: { type: "object", properties: { label: { type: "string", maxLength: 30 }, faits: { type: "array", maxItems: 4, items: { type: "string", maxLength: 90 } } }, required: ["label", "faits"] },
      punchline: { type: "string", maxLength: 140 },
    }, required: ["titre", "gauche", "droite"] },
    bulletin: { type: "array", minItems: 5, maxItems: 6, items: { type: "object", properties: {
      matiere: { type: "string", maxLength: 40 },
      note: { type: "string", maxLength: 6 },
      appreciation: { type: "string", maxLength: 130 },
    }, required: ["matiere", "note", "appreciation"] } },
    verdict: { type: "object", properties: {
      texte: { type: "string", maxLength: 480 },
      derniere_ligne: { type: "string", maxLength: 110 },
    }, required: ["texte", "derniere_ligne"] },
    note_finale: { type: "object", properties: { commentaire: { type: "string", maxLength: 340 } }, required: ["commentaire"] },
    si_alors: { type: "object", properties: {
      intro: { type: "string", maxLength: 200 },
      punchline: { type: "string", maxLength: 160 },
    }, required: ["intro", "punchline"] },
    cartes: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", properties: { texte: { type: "string", maxLength: 95 } }, required: ["texte"] } },
  },
  required: ["archetype", "mensonges", "signature", "verdict", "cartes", "note_finale"],
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
  /* Les notes du bulletin sont des appréciations scolaires, pas des montants lus
     sur le relevé : les passer au validateur ferait rejeter tous les rapports
     (14 n'existe pas dans le stats.json). La note de gestion, elle, est calculée
     par lib/note.ts et injectée dans le stats.json — donc déjà autorisée. */
  const sansNotes = JSON.parse(JSON.stringify(report)) as Rapport;
  if (Array.isArray(sansNotes.bulletin)) for (const b of sansNotes.bulletin) b.note = "";
  let text = JSON.stringify(sansNotes);
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

/**
 * Noms de personnes présents dans le stats.json — bénéficiaires de virements,
 * surtout. Un rapport titré « LA NAVETTE JOURDAINNE » a été livré à une cliente :
 * JOURDAINNE est le nom de son propriétaire, lu sur ses virements de loyer. Le
 * prompt l'interdisait déjà ; une consigne ne suffit pas quand le nom est la
 * chose la plus saillante du JSON.
 */
function nomsDePersonnes(stats: any): string[] {
  const liste: string[] = [];
  for (const b of stats?.top_beneficiaires?.liste ?? []) {
    if (typeof b?.beneficiaire === "string") liste.push(b.beneficiaire);
  }
  const mots = new Set<string>();
  for (const nom of liste) {
    for (const mot of nom.split(/[\s,'-]+/)) {
      /* Quatre lettres minimum : « LEA » ou « G » apparaîtraient partout et
         feraient rejeter des titres innocents. */
      if (mot.length >= 4 && /^[A-Za-zÀ-ÿ]+$/.test(mot)) mots.add(mot.toUpperCase());
    }
  }
  return [...mots];
}

function nomPropreDansTitre(report: Rapport, noms: string[]): string | null {
  const titre = (report?.archetype?.titre ?? "").toUpperCase();
  for (const n of noms) if (titre.includes(n)) return n;
  return null;
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

    /* Le nom d'une personne dans le titre du rapport est la faute qui se voit le
       plus : elle transforme un portrait en indiscrétion. On régénère. */
    const nomFuite = nomPropreDansTitre(report, nomsDePersonnes(stats));
    if (nomFuite) {
      userMsg += `\n\nATTENTION : ton titre d'archétype contient « ${nomFuite} », qui est le nom d'une personne lue sur le relevé. ` +
        `Un nom propre ne va JAMAIS dans un titre. Régénère un titre tiré d'un comportement, pas d'un nom.`;
      continue;
    }

    if (!bad.length) return sansJargon(report);
    userMsg += `\n\nATTENTION : ta version précédente citait des chiffres absents du JSON : ${bad.slice(0, 10).join(", ")}. ` +
      `Régénère en n'utilisant QUE les chiffres du stats.json.`;
  }
  throw new Error("rapport avec chiffres orphelins après 3 tentatives");
}
