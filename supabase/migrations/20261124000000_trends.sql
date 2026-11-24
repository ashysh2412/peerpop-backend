-- SQL 20: "Trending this week" box on Home. The admin picks 3-5 Instagram
-- trends in /admin/trends; every signed-in member can read them.
-- Safe to run more than once. Adds one small table, changes nothing else.

create table if not exists trends (
  id uuid primary key default gen_random_uuid(),
  position int not null default 0,
  kind text not null default 'audio',
  title text not null check (char_length(title) between 1 and 120),
  idea text check (char_length(idea) <= 200),
  link text check (char_length(link) <= 500),
  created_at timestamptz not null default now()
);
alter table trends enable row level security;
drop policy if exists trends_read on trends;
create policy trends_read on trends for select to authenticated using (true);
-- No insert/update/delete policies: only the admin page (server key) can change them.
