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

/** Formulation contractuelle, pour les CGV.
 *
 *  Pas de « TTC » : l'entreprise est en franchise en base de TVA (article 293 B
 *  du CGI), il n'y a donc aucune taxe dans ce montant. Écrire « TTC » laisserait
 *  entendre qu'une TVA est collectée, ce qui serait faux — et c'est la mention
 *  de franchise, affichée dans les CGV, qui tient lieu d'information sur la taxe.
 *  Le nom de la constante est conservé : il est importé ailleurs. */
export const PRIX_TTC = PRIX_AFFICHE;
