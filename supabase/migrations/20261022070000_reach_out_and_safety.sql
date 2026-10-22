-- Reaching out shares your profile, plus blocking and reporting.
-- 1. A private creator's work is visible to anyone they reached out to: someone they sent a
--    connection request, the author of a collab they're interested in, and anyone looking at
--    a collab they posted that is still open. Blocking always wins.
-- 2. Blocking someone also removes the connection, and you can see who you blocked to unblock them.
-- 3. Reports get a resolved time so the admin page can clear them.
-- Safe to run more than once.

create or replace function can_see_work(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select owner = (select auth.uid())
    or not coalesce((select is_private from creator_profiles where user_id = owner), false)
    or are_connected(owner, (select auth.uid()))
    or (
      not is_blocked_between(owner, (select auth.uid()))
      and (
        exists (
          select 1 from connections
          where from_user = owner and to_user = (select auth.uid()) and status = 'pending'
        )
        or exists (
          select 1 from collab_interests i
          join collab_posts p on p.id = i.post_id
          where i.user_id = owner and p.author_id = (select auth.uid())
        )
        or exists (
          select 1 from collab_posts
          where author_id = owner and status = 'open' and closes_at > now()
        )
      )
    )
$$;

-- Blocking ends the connection too, not only pending requests.
create or replace function on_block() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from connections
  where least(from_user, to_user) = least(new.blocker_id, new.blocked_id)
    and greatest(from_user, to_user) = greatest(new.blocker_id, new.blocked_id);
  return null;
end $$;

-- The people I blocked (their profiles are hidden from me, so this reads past that).
create or replace function my_blocks()
returns table (user_id uuid, display_name text, photo_path text, blocked_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.display_name, p.photo_path, b.created_at
  from blocks b join creator_profiles p on p.user_id = b.blocked_id
  where b.blocker_id = (select auth.uid())
  order by b.created_at desc
$$;
revoke execute on function my_blocks() from anon;
grant execute on function my_blocks() to authenticated;

alter table reports add column if not exists resolved_at timestamptz;
