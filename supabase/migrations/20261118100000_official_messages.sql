-- The official Peerpop account can message any member (to welcome them or help
-- them finish their profile), and members can reply, without being connected.
-- Blocks still win: a member who blocks Peerpop stops its messages.
-- Safe to run more than once. Needs official_accounts (SQL 18).

create or replace function is_official(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from official_accounts where user_id = uid)
$$;
revoke execute on function is_official(uuid) from public, anon;
grant execute on function is_official(uuid) to authenticated;

create or replace function guard_messages() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_client_role() then return new; end if;
  if is_blocked_between(new.sender_id, new.recipient_id)
     or not (are_connected(new.sender_id, new.recipient_id) or is_official(new.sender_id) or is_official(new.recipient_id)) then
    raise exception 'you can only message your connections';
  end if;
  new.created_at := now();
  new.read_at := null;
  if (select count(*) from messages where sender_id = new.sender_id and created_at > now() - interval '1 day') >= 300 then
    raise exception 'daily message limit reached';
  end if;
  return new;
end $$;
