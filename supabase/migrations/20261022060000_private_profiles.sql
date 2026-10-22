-- Private profiles: only connections see a private creator's feed posts, photos,
-- pinned videos and channels. Everyone still sees the name, photo, city and
-- skills (so they can send a request), open collab calls and group posts.
-- Safe to run more than once.

alter table creator_profiles add column if not exists is_private boolean not null default false;

-- True when the signed-in person may see this creator's work.
create or replace function can_see_work(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select owner = (select auth.uid())
    or not coalesce((select is_private from creator_profiles where user_id = owner), false)
    or are_connected(owner, (select auth.uid()))
$$;

-- Feed posts (not group posts) of a private creator need a connection.
drop policy if exists posts_read on posts;
create policy posts_read on posts for select using (
  can_see_author(author_id)
  and (group_id is null or can_see_group_posts(group_id))
  and (group_id is not null or can_see_work(author_id))
);

-- Likes and comments follow the post.
create or replace function post_visible(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from posts
    where id = p and can_see_author(author_id)
      and (group_id is null or can_see_group_posts(group_id))
      and (group_id is not null or can_see_work(author_id))
  )
$$;

drop policy if exists videos_read on profile_videos;
create policy videos_read on profile_videos for select using (
  exists (select 1 from creator_profiles p where p.user_id = profile_videos.user_id)
  and can_see_work(user_id)
);

create or replace view public_platform_accounts as
  select pa.id, pa.user_id, pa.platform, pa.handle, pa.url, pa.source,
         pa.ownership_verified_at, pa.self_followers, pa.self_avg_views,
         pa.self_updated_at, pa.last_fetch_at
  from platform_accounts pa
  join creator_profiles cp on cp.user_id = pa.user_id
  where cp.is_listed
    and not is_blocked_between(cp.user_id, auth.uid())
    and can_see_work(cp.user_id);

grant execute on function can_see_work(uuid) to anon, authenticated;
