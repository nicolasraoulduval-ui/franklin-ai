-- Franklin AI — migration 2 : limitation de débit, suivi, journal d'erreurs.
-- À exécuter une seule fois dans le SQL Editor du projet Supabase.

-- 1 · limitation de débit sur /api/upload
-- Une ligne par tentative : l'insertion est atomique, ce qui évite la course
-- classique du compteur lu-puis-écrit.
create table if not exists franklin_rate (
  id bigserial primary key,
  ip text not null,
  at timestamptz not null default now()
);
create index if not exists franklin_rate_ip_at on franklin_rate (ip, at desc);
alter table franklin_rate enable row level security;

-- 2 · événements du tunnel. Aucune donnée personnelle : ni IP, ni email, ni
-- prénom, ni montant. Un identifiant de session aléatoire suffit.
create table if not exists franklin_events (
  id bigserial primary key,
  nom text not null,
  session text,
  props jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index if not exists franklin_events_nom_at on franklin_events (nom, at desc);
alter table franklin_events enable row level security;

-- 3 · erreurs serveur. Les console.error d'une fonction serverless ne sont lus
-- par personne ; une erreur après paiement doit laisser une trace consultable.
create table if not exists franklin_errors (
  id bigserial primary key,
  route text not null,
  message text not null,
  grave boolean not null default false,
  at timestamptz not null default now()
);
create index if not exists franklin_errors_at on franklin_errors (at desc);
alter table franklin_errors enable row level security;


-- ────────────────────────────────────────────────────────────────────────
-- Le tableau de bord minimum viable. À lire dans le SQL Editor de Supabase.
-- ────────────────────────────────────────────────────────────────────────

-- Le tunnel des 30 derniers jours, dans l'ordre du parcours réel.
create or replace view franklin_tunnel as
select nom, count(*) as n, count(distinct session) as sessions
from franklin_events
where at > now() - interval '30 days'
group by nom
order by array_position(array[
  'landing_vue','analyse_etape_1','analyse_etape_2','analyse_etape_3',
  'tuto_ouvert','fichier_depose','upload_lance','upload_reussi','upload_echoue',
  'apercu_vu','checkout_clique','rapport_ouvert','partage_cartes','lien_copie',
  'pdf_telecharge','rapport_supprime'], nom);

-- Ventes par jour, et combien d'aperçus n'ont jamais été convertis.
create or replace view franklin_ventes as
select
  date_trunc('day', created_at)::date as jour,
  count(*) filter (where status = 'preview_ready') as apercus_non_payes,
  count(*) filter (where status in ('paid','ready')) as payes,
  count(*) as total
from franklin_reports
group by 1
order by 1 desc;

-- Les erreurs graves d'abord : ce sont celles où un client a payé sans être servi.
create or replace view franklin_incidents as
select at, route, grave, left(message, 200) as extrait
from franklin_errors
order by grave desc, at desc
limit 100;
