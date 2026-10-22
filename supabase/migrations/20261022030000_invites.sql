-- People from the old Peerpop waiting list and app, invited to join by email.
create table if not exists invites (
  email text primary key check (email = lower(email) and email like '%_@_%._%' and length(email) <= 254),
  name text check (length(name) <= 80),
  added_at timestamptz not null default now(),
  sent_at timestamptz,
  error text
);

alter table invites enable row level security;
revoke all on invites from anon, authenticated;
