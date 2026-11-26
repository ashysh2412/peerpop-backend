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

-- The pairs already matched by hand in Jodi Week (24 Nov) and the backup pair
-- Pakiza + Sheta, so Auto Jodi never repeats them and gives these members a
-- week before their next Jodi. Skips anyone whose profile no longer exists.
insert into jodi_suggestions (user_a, user_b, created_at)
select a.user_id, b.user_id, x.at::timestamptz
from (values
  ('shetahalder', 'kerlinshylla', '2026-11-24 06:30+00'),
  ('rishikav', 'poonamrajpurohit', '2026-11-24 06:30+00'),
  ('shivaay', 'kanakjayas', '2026-11-24 06:30+00'),
  ('vkrit', 'sachintade', '2026-11-24 06:30+00'),
  ('pakizacollab', 'shellyromashka', '2026-11-24 06:30+00'),
  ('pakizacollab', 'shetahalder', '2026-11-26 06:00+00')
) as x(a, b, at)
join creator_profiles a on a.handle = x.a
join creator_profiles b on b.handle = x.b
on conflict do nothing;
