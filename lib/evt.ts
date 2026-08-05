/**
 * Franklin AI — journal d'événements et d'erreurs (lib/evt.ts)
 *
 * Volontairement sans prestataire tiers : les données vivent déjà dans Supabase,
 * un compte de plus serait un sous-traitant de plus à déclarer dans la politique
 * de confidentialité, pour un bénéfice nul.
 *
 * Aucune donnée personnelle n'est enregistrée : ni IP, ni email, ni prénom, ni
 * montant. Un identifiant de session aléatoire, régénéré à chaque onglet, suffit
 * à reconstituer un tunnel.
 */

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Liste fermée : une faute de frappe ne crée pas de métrique fantôme, et on ne
 *  peut pas écrire n'importe quoi dans la table depuis l'extérieur. */
export const EVENEMENTS = [
  "landing_vue",
  "analyse_etape_1",
  "analyse_etape_2",
  "analyse_etape_3",
  "tuto_ouvert",
  "fichier_depose",
  "upload_lance",
  "upload_reussi",
  "upload_echoue",
  "apercu_vu",
  "checkout_clique",
  "rapport_ouvert",
  "partage_cartes",
  "lien_copie",
  "pdf_telecharge",
  "rapport_supprime",
] as const;

export type Evenement = (typeof EVENEMENTS)[number];

async function ecrire(table: string, ligne: Record<string, unknown>): Promise<void> {
  if (!SB_URL || !SB_KEY) return;
  try {
    await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "content-type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(ligne),
    });
  } catch {
    /* le suivi ne doit jamais casser le produit */
  }
}

export async function journaliser(nom: Evenement, session: string, props?: Record<string, unknown>): Promise<void> {
  await ecrire("franklin_events", { nom, session: String(session).slice(0, 40), props: props ?? {} });
}

/**
 * Une erreur après paiement est le pire scénario du produit : le client a payé
 * et ne voit rien. Les console.error d'une fonction serverless ne sont lus par
 * personne — on écrit donc en base, et on alerte par email quand c'est grave.
 */
export async function journaliserErreur(route: string, e: unknown, grave = false): Promise<void> {
  const message = e instanceof Error ? e.message + "\n" + (e.stack ?? "") : String(e);
  console.error("[" + route + "]", message);
  await ecrire("franklin_errors", { route, message: message.slice(0, 2000), grave });

  if (!grave) return;
  const cle = process.env.RESEND_API_KEY;
  const dest = process.env.EMAIL_REPLY_TO ?? "nicolas.raoulduval@gmail.com";
  if (!cle) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cle}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: "Franklin AI <franklin@franklinai.fr>",
        to: [dest],
        subject: "Franklin — échec grave sur " + route,
        text:
          "Une erreur est survenue sur " + route +
          ".\n\nUn client a peut-être payé sans être servi.\n\n" + message.slice(0, 1500),
      }),
    });
  } catch {
    /* on ne casse pas la réponse pour un email d'alerte */
  }
}
