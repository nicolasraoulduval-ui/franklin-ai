/**
 * Franklin AI — limitation du débit (lib/ratelimit.ts)
 *
 * Chaque analyse coûte environ deux minutes de calcul et des appels facturés
 * à l'API Anthropic. Sans plafond, un script trivial épuise le crédit en
 * quelques minutes et met le service à genoux — panne déjà vécue.
 *
 * Stratégie : une ligne insérée par tentative, puis un comptage sur fenêtre
 * glissante. L'insertion est atomique côté Postgres, ce qui évite la course
 * classique du compteur lu-puis-écrit. Repli en mémoire si Supabase n'est pas
 * configuré — imparfait (remis à zéro au démarrage à froid), mais toujours
 * préférable à l'absence totale de limite.
 */

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = "franklin_rate";

/** Plafonds volontairement bas : un usage humain normal, c'est un ou deux
 *  rapports. Ce qui dépasse est soit un test, soit un abus. */
export const PAR_HEURE = 5;
export const PAR_JOUR = 15;

const memoire = ((globalThis as unknown as { __franklinRate?: Map<string, number[]> }).__franklinRate ??= new Map<string, number[]>());

/** L'IP réelle derrière le proxy Vercel : le premier maillon de la chaîne,
 *  les suivants étant ajoutés par l'infrastructure. */
export function ipDe(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const ip = xff.split(",")[0]?.trim();
  return ip || req.headers.get("x-real-ip") || "inconnue";
}

async function sb(chemin: string, init: RequestInit): Promise<Response> {
  return fetch(`${SB_URL}/rest/v1/${chemin}`, {
    ...init,
    headers: {
      apikey: SB_KEY!,
      Authorization: `Bearer ${SB_KEY}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export interface Verdict {
  autorise: boolean;
  /** message prêt à afficher, à la deuxième personne comme le reste du produit */
  message?: string;
  /** secondes avant de pouvoir réessayer, pour l'en-tête Retry-After */
  reessayerDans?: number;
}

const REFUS_HEURE =
  "Tu as lancé plusieurs analyses coup sur coup. Franklin a besoin de souffler : " +
  "réessaie dans une heure. Si tu as vraiment besoin d'en faire plus, écris-nous.";
const REFUS_JOUR =
  "Tu as atteint la limite du jour. Elle existe pour que le service reste " +
  "disponible pour tout le monde. Réessaie demain, ou écris-nous.";

/** Enregistre la tentative et dit si elle est permise. */
export async function verifierDebit(ip: string): Promise<Verdict> {
  const maintenant = Date.now();
  const uneHeure = maintenant - 3600000;
  const unJour = maintenant - 86400000;

  if (!SB_URL || !SB_KEY) {
    const hist = (memoire.get(ip) ?? []).filter((t) => t > unJour);
    hist.push(maintenant);
    memoire.set(ip, hist);
    if (hist.filter((t) => t > uneHeure).length > PAR_HEURE)
      return { autorise: false, message: REFUS_HEURE, reessayerDans: 3600 };
    if (hist.length > PAR_JOUR) return { autorise: false, message: REFUS_JOUR, reessayerDans: 86400 };
    return { autorise: true };
  }

  try {
    await sb(TABLE, { method: "POST", body: JSON.stringify({ ip }) });

    const res = await sb(
      `${TABLE}?ip=eq.${encodeURIComponent(ip)}&at=gte.${new Date(unJour).toISOString()}&select=at&order=at.desc&limit=${PAR_JOUR + 5}`,
      { method: "GET" },
    );
    // Une limite en panne ne doit jamais bloquer un client légitime.
    if (!res.ok) return { autorise: true };

    const lignes = (await res.json()) as Array<{ at: string }>;
    const horodatages = lignes.map((l) => new Date(l.at).getTime());

    if (horodatages.filter((t) => t > uneHeure).length > PAR_HEURE)
      return { autorise: false, message: REFUS_HEURE, reessayerDans: 3600 };
    if (horodatages.length > PAR_JOUR)
      return { autorise: false, message: REFUS_JOUR, reessayerDans: 86400 };
    return { autorise: true };
  } catch {
    return { autorise: true };
  }
}
