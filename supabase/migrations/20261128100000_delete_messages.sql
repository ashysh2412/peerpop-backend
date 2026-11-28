-- "Delete for everyone": a sender can delete their own chat message within 1 hour.
-- The other person sees "This message was deleted". The original text is kept in
-- deleted_messages, which only the admin (service role) can read, so reports still work.
-- Additive and safe to run more than once.

alter table messages add column if not exists deleted_at timestamptz;

create table if not exists deleted_messages (
  message_id uuid primary key references messages on delete cascade,
  sender_id uuid not null,
  recipient_id uuid not null,
  body text not null,
  sent_at timestamptz not null,
  deleted_at timestamptz not null default now()
);
alter table deleted_messages enable row level security;
revoke all on deleted_messages from anon, authenticated;

create or replace function delete_message(mid uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare m messages;
begin
  select * into m from messages
  where id = mid and sender_id = auth.uid() and deleted_at is null
    and created_at > now() - interval '1 hour'
  for update;
  if not found then return false; end if;
  insert into deleted_messages (message_id, sender_id, recipient_id, body, sent_at)
  values (m.id, m.sender_id, m.recipient_id, m.body, m.created_at)
  on conflict (message_id) do nothing;
  -- Marking it read means no unread badge or email for a deleted message.
  update messages
  set body = 'This message was deleted', deleted_at = now(), read_at = coalesce(read_at, now())
  where id = mid;
  return true;
end $$;
revoke execute on function delete_message(uuid) from public, anon;
grant execute on function delete_message(uuid) to authenticated;
