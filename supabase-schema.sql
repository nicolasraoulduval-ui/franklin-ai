-- Schéma Supabase V1 — à exécuter dans le SQL Editor du projet.
-- Privacy : aucune transaction brute, aucun fichier. Stats agrégées uniquement.

create table if not exists franklin_reports (
  token text primary key,
  email text not null,
  prenom text not null default 'toi',
  status text not null check (status in ('preview_ready','paid','ready')),
  stats jsonb not null,
  preview jsonb not null,
  report_html text,
  created_at timestamptz not null default now()
);

-- accès uniquement via la service role key (serveur) — RLS activée, aucune policy publique
alter table franklin_reports enable row level security;

-- purge automatique à J+30 (pg_cron si dispo, sinon lancer manuellement / via fonction Edge)
-- delete from franklin_reports where created_at < now() - interval '30 days';
