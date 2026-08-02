import Link from "next/link";
import { LegalLayout } from "../../lib/legal-layout";
import { PRIX_TTC } from "../../lib/prix";

export const metadata = { title: "Conditions générales de vente — Franklin AI" };

export default function CGV() {
  return (
    <LegalLayout titre="Conditions générales de vente">
      <h2>Le service</h2>
      <p>
        Franklin AI analyse le ou les relevés bancaires que tu fournis et génère : un aperçu gratuit (trois faits chiffrés)
        puis, après paiement, un rapport complet humoristique accessible par lien privé, envoyé par email et joint en PDF.
      </p>
      <h2>Prix et paiement</h2>
      <p>
        Le rapport complet coûte <strong>{PRIX_TTC}</strong>, en paiement unique via Stripe. Aucun abonnement,
        aucun prélèvement récurrent.
      </p>
      <h2>Livraison</h2>
      <p>
        Le rapport est généré immédiatement après confirmation du paiement (généralement en moins de deux minutes)
        et reste accessible via ton lien privé pendant 30 jours. Une copie PDF t&apos;est envoyée par email : elle
        t&apos;appartient et reste lisible après l&apos;expiration du lien.
      </p>
      <h2>Droit de rétractation</h2>
      <p>
        Le rapport est un contenu numérique fourni immédiatement après paiement. En payant, tu demandes son exécution
        immédiate et renonces expressément à ton droit de rétractation (article L221-28 du Code de la consommation).
        Si le rapport n&apos;a pas pu être généré ou présente un problème réel, écris-nous : nous remboursons sans discuter.
      </p>
      <h2>Ce que Franklin n&apos;est pas</h2>
      <p>
        Le rapport est un divertissement fondé sur tes données réelles. Il ne constitue en aucun cas un conseil financier,
        fiscal ou d&apos;investissement, et ne doit pas servir de base à une décision financière.
      </p>
      <h2>Responsabilité</h2>
      <p>
        Les chiffres du rapport sont calculés par des programmes déterministes à partir de tes relevés. En cas d&apos;erreur
        de lecture d&apos;un relevé, la responsabilité de l&apos;éditeur est limitée au montant payé.
      </p>
      <p>
        <Link href="/mentions-legales">Mentions légales</Link> · <Link href="/confidentialite">Confidentialité</Link> · <Link href="/">Accueil</Link>
      </p>
    </LegalLayout>
  );
}
