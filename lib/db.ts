/** Couche de stockage : Supabase (si SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) sinon mémoire.
 * Privacy : jamais de transactions ni de fichiers — stats agrégées, aperçu, HTML du rapport. */
import { randomBytes } from "node:crypto";

export interface ReportRecord {
  token: string;
  email: string;
  prenom: string;
  status: "preview_ready" | "paid" | "ready";
  stats: unknown;
  preview: string[];
  report_html?: string | null;
  created_at?: string;
}

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = "franklin_reports";

const g = globalThis as unknown as { __franklinStore?: Map<string, ReportRecord> };
const mem = (g.__franklinStore ??= new Map());

async function sb(path: string, init: RequestInit): Promise<Response> {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SB_KEY!, Authorization: `Bearer ${SB_KEY}`,
      "content-type": "application/json", Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

export async function createRecord(data: Omit<ReportRecord, "token" | "created_at">): Promise<ReportRecord> {
  const token = randomBytes(16).toString("hex");
  const rec: ReportRecord = { ...data, token };
  if (SB_URL && SB_KEY) {
    await sb(TABLE, { method: "POST", body: JSON.stringify(rec) });
  } else {
    mem.set(token, rec);
  }
  return rec;
}

export async function getRecord(token: string): Promise<ReportRecord | null> {
  if (SB_URL && SB_KEY) {
    const res = await sb(`${TABLE}?token=eq.${encodeURIComponent(token)}&select=*`, { method: "GET" });
    const rows = (await res.json()) as ReportRecord[];
    return rows[0] ?? null;
  }
  return mem.get(token) ?? null;
}

export async function updateRecord(token: string, patch: Partial<ReportRecord>): Promise<void> {
  if (SB_URL && SB_KEY) {
    await sb(`${TABLE}?token=eq.${encodeURIComponent(token)}`, { method: "PATCH", body: JSON.stringify(patch) });
  } else {
    const rec = mem.get(token);
    if (rec) Object.assign(rec, patch);
  }
}

/**
 * Purge des données arrivées à échéance.
 *
 * Les CGV et la politique de confidentialité annoncent une suppression
 * automatique à 30 jours. Jusqu'ici cette phrase était fausse : la requête
 * n'existait que sous forme de commentaire dans supabase-schema.sql. Elle est
 * désormais exécutée chaque nuit par le cron déclaré dans vercel.json.
 *
 * On purge aussi les compteurs de débit et les événements : ils n'ont aucune
 * valeur passé quelques jours, et rien ne justifie de les garder.
 */
export async function purgerAncien(jours = 30): Promise<{ rapports: number; debit: number; evenements: number }> {
  if (!SB_URL || !SB_KEY) {
    const limite = Date.now() - jours * 86400000;
    let n = 0;
    for (const [t, r] of mem) {
      if (r.created_at && new Date(r.created_at).getTime() < limite) { mem.delete(t); n++; }
    }
    return { rapports: n, debit: 0, evenements: 0 };
  }

  const avant = (j: number) => new Date(Date.now() - j * 86400000).toISOString();

  const compte = async (table: string, colonne: string, seuil: string): Promise<number> => {
    const res = await sb(`${table}?${colonne}=lt.${seuil}&select=*`, {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    });
    const lignes = (await res.json()) as unknown[];
    return Array.isArray(lignes) ? lignes.length : 0;
  };

  const rapports = await compte(TABLE, "created_at", avant(jours));
  // Les tables de service peuvent ne pas exister si la migration 2 n'a pas
  // encore été jouée : leur absence ne doit pas faire échouer la purge des
  // rapports, qui est la seule qui engage juridiquement.
  let debit = 0, evenements = 0;
  try { debit = await compte("franklin_rate", "at", avant(2)); } catch { /* table absente */ }
  try { evenements = await compte("franklin_events", "at", avant(180)); } catch { /* table absente */ }

  return { rapports, debit, evenements };
}

export async function deleteRecord(token: string): Promise<void> {
  if (SB_URL && SB_KEY) {
    await sb(`${TABLE}?token=eq.${encodeURIComponent(token)}`, { method: "DELETE" });
  } else {
    mem.delete(token);
  }
}
