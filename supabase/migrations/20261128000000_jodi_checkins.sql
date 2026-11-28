-- Auto Jodi check-in: 3 days after a member gets a Jodi list, the Peerpop
-- account asks how it went. Each row is one check-in and the member's answer.
-- Only the server (secret key) reads or writes it. Additive and safe to run more than once.

create table if not exists jodi_checkins (
  id bigint generated always as identity primary key,
  user_id uuid not null references creator_profiles (user_id) on delete cascade,
  sent_at timestamptz not null default now(),
  answer text check (answer in ('done', 'waiting', 'later')),
  answered_at timestamptz,
  reel_url text check (reel_url is null or char_length(reel_url) < 500)
);

create index if not exists jodi_checkins_user on jodi_checkins (user_id, sent_at desc);

-- Row-level security on with no policies: members can't see or change it.
alter table jodi_checkins enable row level security;
