-- Run this once in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run)

create extension if not exists "pgcrypto";

create table if not exists public.analyses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade not null,
  created_at        timestamptz default now() not null,
  patient_name      text,
  patient_age       text,
  patient_sex       text,
  medication_count  int default 0,
  medications       jsonb default '[]'::jsonb,
  summary           jsonb default '{}'::jsonb,
  overall_risk      text default 'unknown',
  result            jsonb not null,
  patient           jsonb not null
);

create index if not exists analyses_user_id_created_at_idx
  on public.analyses (user_id, created_at desc);

-- Row Level Security: even though the backend uses the service_role key
-- (which bypasses RLS) and filters by user_id in every query itself, RLS
-- is enabled here too as defense-in-depth, e.g. in case anything ever
-- talks to Supabase directly with a user's own anon-key session.
alter table public.analyses enable row level security;

create policy "Users can view their own analyses"
  on public.analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own analyses"
  on public.analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own analyses"
  on public.analyses for delete
  using (auth.uid() = user_id);
