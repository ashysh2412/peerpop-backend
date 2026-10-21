-- Messages: one-to-one chat between connected creators.
-- A conversation is simply the pair of people; there is no separate table for it.

create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references creator_profiles on delete cascade,
  recipient_id uuid not null references creator_profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index messages_pair on messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index on messages (recipient_id) where read_at is null;

-- Only connected, unblocked creators can message, at most 300 messages a day.
create function guard_messages() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_client_role() then return new; end if;
  if not are_connected(new.sender_id, new.recipient_id) or is_blocked_between(new.sender_id, new.recipient_id) then
    raise exception 'you can only message your connections';
  end if;
  new.created_at := now();
  new.read_at := null;
  if (select count(*) from messages where sender_id = new.sender_id and created_at > now() - interval '1 day') >= 300 then
    raise exception 'daily message limit reached';
  end if;
  return new;
end $$;
create trigger messages_guard before insert on messages for each row execute function guard_messages();

alter table messages enable row level security;
create policy messages_read on messages for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy messages_send on messages for insert to authenticated
  with check (sender_id = (select auth.uid()));
revoke update, delete on messages from anon, authenticated;
revoke insert on messages from anon;

-- Marks everything the other person sent me as read.
create function mark_messages_read(other uuid) returns void
language sql security definer set search_path = public as $$
  update messages set read_at = now()
  where recipient_id = auth.uid() and sender_id = other and read_at is null
$$;

-- My chats: the latest message with each person, newest first, with how many are unread.
create function get_inbox()
returns table (
  other_id uuid,
  handle text,
  display_name text,
  photo_path text,
  last_body text,
  last_at timestamptz,
  last_from_me boolean,
  unread int
)
language sql stable security definer set search_path = public as $$
  with mine as (
    select m.*, case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end as other
    from messages m
    where m.sender_id = auth.uid() or m.recipient_id = auth.uid()
  ),
  latest as (
    select distinct on (other) other, body, created_at, sender_id = auth.uid() as from_me
    from mine order by other, created_at desc
  )
  select l.other, p.handle, p.display_name, p.photo_path, l.body, l.created_at, l.from_me,
    (select count(*)::int from mine u where u.other = l.other and u.recipient_id = auth.uid() and u.read_at is null)
  from latest l
  join creator_profiles p on p.user_id = l.other
  where not is_blocked_between(auth.uid(), l.other)
  order by l.created_at desc
$$;

grant execute on function get_inbox() to authenticated;
grant execute on function mark_messages_read(uuid) to authenticated;
revoke execute on function get_inbox() from public, anon;
revoke execute on function mark_messages_read(uuid) from public, anon;

-- New messages arrive live in the browser (Supabase Realtime respects the policies above).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table messages;
  end if;
end $$;
