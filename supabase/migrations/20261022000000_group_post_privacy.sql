-- Comments and likes on members-only group posts follow the post's own visibility,
-- and a single group can be opened by its link however many groups there are.

-- True when the signed-in person may see this post (same rule as posts_read).
create function post_visible(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from posts
    where id = p and can_see_author(author_id) and (group_id is null or can_see_group_posts(group_id))
  )
$$;

drop policy likes_read on post_likes;
drop policy likes_insert on post_likes;
drop policy comments_read on post_comments;
drop policy comments_insert on post_comments;

create policy likes_read on post_likes for select using (post_visible(post_id));
create policy likes_insert on post_likes for insert to authenticated with check (
  user_id = (select auth.uid()) and post_visible(post_id)
);
create policy comments_read on post_comments for select using (
  post_visible(post_id) and can_see_author(author_id)
);
create policy comments_insert on post_comments for insert to authenticated with check (
  author_id = (select auth.uid()) and post_visible(post_id)
);

-- One group by its link, in the same shape as get_groups().
create function get_group(p_slug text)
returns table (
  id uuid,
  slug text,
  name text,
  about text,
  join_type text,
  member_count int,
  my_status text,
  my_role text
)
language sql stable security definer set search_path = public as $$
  select g.id, g.slug, g.name, g.about, g.join_type,
    (select count(*)::int from group_members m where m.group_id = g.id and m.status = 'member'),
    mine.status, mine.role
  from groups g
  left join group_members mine on mine.group_id = g.id and mine.user_id = (select auth.uid())
  where g.slug = p_slug
$$;

grant execute on function get_group(text) to authenticated;
revoke execute on function get_group(text) from public, anon;
