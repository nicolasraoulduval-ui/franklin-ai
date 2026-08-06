# Franklin AI — déploiement de l'app (S3 → prod)

## 1. Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable | Où la trouver | Obligatoire |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys (crée une NOUVELLE clé, révoque l'ancienne) | oui |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Développeurs → Clés API → clé secrète (`sk_live_…` ou `sk_test_…`) | oui pour encaisser |
| `STRIPE_WEBHOOK_SECRET` | créé à l'étape 3 (`whsec_…`) | oui pour encaisser |
| `SUPABASE_URL` | supabase.com → projet → Settings → API → Project URL | oui en prod |
| `SUPABASE_SERVICE_ROLE_KEY` | même page → service_role key (jamais côté client) | oui en prod |
| `FRANKLIN_MODEL` | optionnel, défaut `claude-sonnet-5` | non |

Sans `STRIPE_SECRET_KEY` : paiement simulé (page /paiement-mock) — utile en préprod.
Sans `SUPABASE_URL` : stockage en mémoire — les rapports meurent à chaque redéploiement.

## 2. Supabase

Créer un projet (gratuit) → SQL Editor → coller et exécuter `supabase-schema.sql`.

## 3. Webhook Stripe

Dashboard Stripe → Développeurs → Webhooks → Ajouter une destination :
- URL : `https://www.franklinai.fr/api/stripe-webhook`
- Événement : `checkout.session.completed`
- Copier le « secret de signature » (`whsec_…`) → variable `STRIPE_WEBHOOK_SECRET`.

## 4. Déploiement

Le repo GitHub doit contenir cette app à la racine (le site statique actuel est remplacé :
la landing est servie sur `/` par l'app, CTAs branchés sur `/analyse`).
Vercel détecte Next.js automatiquement. Domaines déjà configurés (franklinai.fr → www).

## 5. Test de bout en bout en réel

1. franklinai.fr → CTA → /analyse
2. Uploader un relevé PDF + email → aperçu 3 vérités
3. Payer 6,90 € (carte test Stripe `4242 4242 4242 4242` en mode test)
4. Retour → génération (~1 min) → rapport complet
5. Vérifier la réception du webhook dans le dashboard Stripe

## Reste à faire (S4)

- Emails Resend (livraison du lien rapport)
- Purge automatique J+30 (cron Supabase)
- Support CSV (PDF uniquement pour l'instant)
- Export PNG des 4 cartes
- Mentions légales / CGV / politique de confidentialité
- Bouton « supprimer mon rapport » (l'API DELETE existe déjà : `DELETE /rapport/[token]`)
