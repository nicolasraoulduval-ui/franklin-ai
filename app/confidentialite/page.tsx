import Link from "next/link";
import { LegalLayout } from "../../lib/legal-layout";

export const metadata = { title: "Politique de confidentialité — Franklin AI" };

export default function Confidentialite() {
  return (
    <LegalLayout titre="Politique de confidentialité">
      <p>
        La confidentialité n&apos;est pas une case à cocher chez Franklin : c&apos;est le produit. Voici exactement
        ce qui se passe avec tes données, sans jargon.
      </p>
      <h2>Tes relevés bancaires</h2>
      <ul>
        <li>Ton fichier est traité en mémoire, le temps de l&apos;analyse (environ une minute). Il n&apos;est <strong>jamais écrit sur disque</strong>.</li>
        <li>Il est <strong>supprimé immédiatement après l&apos;analyse</strong>, avant même le paiement.</li>
        <li>Les transactions individuelles ne sont <strong>jamais stockées</strong>. Seules des statistiques agrégées (totaux, comptages, moyennes) sont conservées pour générer ton rapport.</li>
        <li>Aucune donnée ne sert à entraîner un quelconque modèle d&apos;IA.</li>
      </ul>
      <h2>Ce que nous conservons</h2>
      <ul>
        <li>Ton prénom et ton email (pour te livrer le rapport).</li>
        <li>Les statistiques agrégées et le rapport généré, derrière un lien privé.</li>
        <li>Le tout est <strong>supprimé automatiquement 30 jours</strong> après l&apos;analyse.</li>
      </ul>
      <h2>Supprimer ton rapport avant</h2>
      <p>
        Un bouton « Supprimer mon rapport » se trouve en bas de ton rapport. La suppression est immédiate et définitive.
        Tu peux aussi écrire à nicolas.raoulduval@gmail.com pour exercer tes droits (accès, rectification, effacement).
      </p>
      <h2>Sous-traitants</h2>
      <p>
        Anthropic (analyse par IA, données non utilisées pour l&apos;entraînement), Stripe (paiement — nous ne voyons jamais ta carte),
        Supabase (stockage UE), Resend (envoi de l&apos;email de livraison), Vercel (hébergement). Aucune donnée n&apos;est vendue,
        louée ou partagée avec qui que ce soit d&apos;autre. Pas de publicité, pas de trackers tiers.
      </p>
      <p>
        <Link href="/mentions-legales">Mentions légales</Link> · <Link href="/cgv">CGV</Link> · <Link href="/">Accueil</Link>
      </p>
    </LegalLayout>
  );
}
