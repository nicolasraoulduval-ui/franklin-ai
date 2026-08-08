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

import { calculerNote } from "./note";

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

/**
 * Notification de vente.
 *
 * Stripe envoie déjà un mail à chaque paiement, mais il ne sait rien du produit :
 * il dit « 6,90 € reçus », point. Celui-ci donne ce qui permet de réagir — qui,
 * combien de relevés, quelle note, et le lien direct vers le rapport.
 *
 * Sans RESEND_API_KEY, la fonction ne fait rien et ne lève rien : une vente ne
 * doit jamais échouer parce qu'un mail de notification n'est pas configuré.
 */
export async function notifierVente(info: {
  prenom: string;
  email: string;
  token: string;
  centimes?: number;
  stats?: Record<string, any>;
}): Promise<void> {
  const cle = process.env.RESEND_API_KEY;
  const dest = process.env.EMAIL_REPLY_TO ?? "nicolas.raoulduval@gmail.com";
  if (!cle) {
    console.log(`vente : ${info.prenom} <${info.email}> — pas de RESEND_API_KEY, notification muette`);
    return;
  }

  const p = info.stats?.periode ?? {};
  /* La note n'est pas stockée : elle se recalcule à partir des mêmes chiffres.
     Si le calcul échoue pour une raison quelconque, on envoie le mail sans elle
     plutôt que de perdre la notification. */
  let note: { note: number; sur: number; mention: string } | null = null;
  try {
    if (info.stats) note = calculerNote(info.stats as any);
  } catch {
    /* une notification vaut mieux qu'une notification parfaite */
  }
  const montant = info.centimes != null ? (info.centimes / 100).toFixed(2).replace(".", ",") + " €" : "—";
  const lien = `https://www.franklinai.fr/rapport/${info.token}`;

  const lignes = [
    `Prénom       ${info.prenom}`,
    `Email        ${info.email}`,
    `Montant      ${montant}`,
    `Relevés      ${p.nb_mois ?? "?"} · ${p.nb_transactions ?? "?"} transactions`,
    note ? `Note         ${note.note}/${note.sur} — ${note.mention}` : "",
    "",
    `Rapport      ${lien}`,
  ].filter(Boolean).join("\n");

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cle}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: "Franklin AI <franklin@franklinai.fr>",
        to: [dest],
        subject: `Vente — ${info.prenom}, ${montant}`,
        text: lignes,
      }),
    });
  } catch (e) {
    console.error("notification de vente :", e);
  }
}
