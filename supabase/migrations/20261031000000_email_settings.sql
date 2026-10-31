-- Email notifications: what each member wants emailed, and when we last emailed them about
-- something so busy chats don't flood their inbox. Only adds new tables; nothing existing changes.

create table if not exists email_settings (
  user_id uuid primary key references creator_profiles on delete cascade,
  messages boolean not null default true,
  network boolean not null default true,
  collabs boolean not null default true,
  digest boolean not null default true,
  -- Lets the "Turn off these emails" link work without signing in.
  unsub_token uuid not null default gen_random_uuid() unique,
  updated_at timestamptz not null default now()
);
alter table email_settings enable row level security;
drop policy if exists "Read own email settings" on email_settings;
create policy "Read own email settings" on email_settings for select to authenticated using (user_id = auth.uid());
drop policy if exists "Add own email settings" on email_settings;
create policy "Add own email settings" on email_settings for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Change own email settings" on email_settings;
create policy "Change own email settings" on email_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- One row per member and topic (like "message:<sender id>" or "digest"), holding the last send.
-- Only the server reads and writes it.
create table if not exists email_log (
  user_id uuid not null references creator_profiles on delete cascade,
  topic text not null check (char_length(topic) <= 80),
  sent_at timestamptz not null default now(),
  primary key (user_id, topic)
);
alter table email_log enable row level security;
revoke all on email_log from anon, authenticated;
