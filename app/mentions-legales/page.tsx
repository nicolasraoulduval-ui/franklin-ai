import Link from "next/link";
import { LegalLayout } from "../../lib/legal-layout";

export const metadata = { title: "Mentions légales — Franklin AI" };

export default function MentionsLegales() {
  return (
    <LegalLayout titre="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        Franklin AI est édité par Nicolas Raoul-Duval.
        <br />
        Contact : nicolas.raoulduval@gmail.com
      </p>
      <h2>Hébergement</h2>
      <p>
        Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis — vercel.com
        <br />
        Base de données : Supabase (région Union européenne).
      </p>
      <h2>Nature du service</h2>
      <p>
        Franklin AI est un service de divertissement et de lucidité financière : il analyse les relevés bancaires
        que tu lui confies et en tire un portrait humoristique. Franklin AI n&apos;est pas un établissement financier,
        ne fournit aucun conseil en investissement, aucune recommandation financière, et n&apos;est pas un service
        d&apos;agrégation de comptes au sens de la DSP2.
      </p>
      <h2>Propriété intellectuelle</h2>
      <p>
        La marque Franklin AI, la mascotte, les textes et le design du site sont protégés. Le rapport généré t&apos;appartient :
        tu peux le partager librement.
      </p>
      <p>
        <Link href="/confidentialite">Politique de confidentialité</Link> · <Link href="/cgv">CGV</Link> · <Link href="/">Accueil</Link>
      </p>
    </LegalLayout>
  );
}
