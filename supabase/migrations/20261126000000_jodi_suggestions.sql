-- Auto Jodi: remembers every pair of creators the Peerpop account suggested to
-- each other, so the same pair is never suggested twice and each person gets
-- at most one new Jodi a week. Only the server (secret key) reads or writes it.
-- Additive and safe to run more than once.

create table if not exists jodi_suggestions (
  id bigint generated always as identity primary key,
  user_a uuid not null references creator_profiles (user_id) on delete cascade,
  user_b uuid not null references creator_profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a <> user_b)
);

-- One row per pair, whichever way round it was saved.
create unique index if not exists jodi_suggestions_pair on jodi_suggestions (least(user_a, user_b), greatest(user_a, user_b));
create index if not exists jodi_suggestions_created on jodi_suggestions (created_at desc);

-- Row-level security on with no policies: members can't see or change it.
alter table jodi_suggestions enable row level security;
