-- 1. Pinned videos can also be Google Drive or Vimeo links.
-- 2. India's IT Rules 2021 ask us to keep a deleted account's details for 180 days, so
--    deleting an account first copies its data into a locked archive (only the server can
--    read it), and a daily job removes archive rows older than 180 days.
-- Safe to run more than once.

alter type platform add value if not exists 'drive';
alter type platform add value if not exists 'vimeo';

create table if not exists deleted_account_archive (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text,
  deleted_at timestamptz not null default now(),
  purge_after timestamptz not null default now() + interval '180 days',
  data jsonb not null
);
create index if not exists deleted_account_archive_purge on deleted_account_archive (purge_after);
alter table deleted_account_archive enable row level security;
-- No policies: nobody signed in can read or change it; only the server (service role) can.
revoke all on deleted_account_archive from anon, authenticated;

create or replace function archive_deleted_account() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid := old.id;
begin
  insert into deleted_account_archive (user_id, email, data)
  values (uid, old.email, jsonb_build_object(
    'account', to_jsonb(old) - 'encrypted_password' - 'confirmation_token' - 'recovery_token'
      - 'email_change_token_new' - 'email_change_token_current' - 'reauthentication_token',
    'profile', (select to_jsonb(p) from creator_profiles p where p.user_id = uid),
    'contacts', (select to_jsonb(c) from creator_contacts c where c.user_id = uid),
    'channels', (select coalesce(jsonb_agg(to_jsonb(a)), '[]') from platform_accounts a where a.user_id = uid),
    'videos', (select coalesce(jsonb_agg(to_jsonb(v)), '[]') from profile_videos v where v.user_id = uid),
    'posts', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from posts x where x.author_id = uid),
    'comments', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from post_comments x where x.author_id = uid),
    'messages', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]') from messages m where uid in (m.sender_id, m.recipient_id)),
    'connections', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from connections c where uid in (c.from_user, c.to_user)),
    'collabs', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from collab_posts c where c.author_id = uid),
    'collab_interests', (select coalesce(jsonb_agg(to_jsonb(i)), '[]') from collab_interests i where i.user_id = uid),
    'groups', (select coalesce(jsonb_agg(to_jsonb(g)), '[]') from group_members g where g.user_id = uid),
    'reports_about', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from reports r where r.target_user = uid)
  ));
  return old;
end $$;

drop trigger if exists archive_before_delete on auth.users;
create trigger archive_before_delete before delete on auth.users
  for each row execute function archive_deleted_account();

-- Called by the daily job.
create or replace function purge_deleted_accounts() returns int
language sql security definer set search_path = public as $$
  with gone as (delete from deleted_account_archive where purge_after < now() returning 1)
  select count(*)::int from gone
$$;
revoke execute on function purge_deleted_accounts() from public, anon, authenticated;
revoke execute on function archive_deleted_account() from public, anon, authenticated;
