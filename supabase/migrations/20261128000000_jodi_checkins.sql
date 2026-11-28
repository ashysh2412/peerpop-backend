-- Auto Jodi check-ins from the Peerpop account:
--  * 48 hours after two Jodis connect: "Collab aage badha?" (partner_id = the Jodi)
--  * 3 days after a Jodi list with no connection yet: a gentle nudge (partner_id empty)
-- Each row is one check-in and the member's answer. Only the server (secret key)
-- reads or writes it. Additive and safe to run more than once.

create table if not exists jodi_checkins (
  id bigint generated always as identity primary key,
  user_id uuid not null references creator_profiles (user_id) on delete cascade,
  sent_at timestamptz not null default now(),
  answer text,
  answered_at timestamptz,
  reel_url text check (reel_url is null or char_length(reel_url) < 500)
);

alter table jodi_checkins add column if not exists partner_id uuid references creator_profiles (user_id) on delete cascade;

alter table jodi_checkins drop constraint if exists jodi_checkins_answer_check;
alter table jodi_checkins add constraint jodi_checkins_answer_check
  check (answer is null or answer in ('done', 'talking', 'stuck', 'waiting', 'later'));

create index if not exists jodi_checkins_user on jodi_checkins (user_id, sent_at desc);

-- Row-level security on with no policies: members can't see or change it.
alter table jodi_checkins enable row level security;
