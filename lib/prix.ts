/** Source unique du prix.
 *
 *  Le prix était écrit en dur à cinq endroits (checkout, landing, CGV, page
 *  d'analyse, paiement simulé). Il a dérivé dès le premier changement : la
 *  landing annonçait un montant, Stripe en débitait un autre. Tout doit
 *  désormais importer d'ici — un seul chiffre à modifier.
 */

/** Montant débité par Stripe, en centimes. */
export const PRIX_CENTIMES = 690;

/** Le même, formaté à la française, pour tout affichage. */
export const PRIX_AFFICHE = (PRIX_CENTIMES / 100).toFixed(2).replace(".", ",") + " €";

/** Formulation contractuelle, pour les CGV. */
export const PRIX_TTC = PRIX_AFFICHE + " TTC";
