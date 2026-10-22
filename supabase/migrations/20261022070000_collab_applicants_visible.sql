-- A private creator who taps "Interested" on a collab shows their work to that collab's author,
-- so the author can judge whether they fit. Nobody else's view changes. Safe to run more than once.
create or replace function can_see_work(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select owner = (select auth.uid())
    or not coalesce((select is_private from creator_profiles where user_id = owner), false)
    or are_connected(owner, (select auth.uid()))
    or exists (
      select 1 from collab_interests i
      join collab_posts p on p.id = i.post_id
      where i.user_id = owner and p.author_id = (select auth.uid())
    )
$$;
