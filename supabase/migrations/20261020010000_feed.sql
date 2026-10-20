-- Feed: creators post updates (text, a link, an optional photo), and others like and comment.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references creator_profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  link_url text check (link_url ~ '^https?://' and char_length(link_url) <= 500),
  image_path text check (char_length(image_path) < 200),
  created_at timestamptz not null default now()
);
create index on posts (created_at desc);
create index on posts (author_id, created_at desc);

create table post_likes (
  post_id uuid not null references posts on delete cascade,
  user_id uuid not null references creator_profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index on post_likes (user_id);

create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts on delete cascade,
  author_id uuid not null references creator_profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index on post_comments (post_id, created_at);

create function post_author(p uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select author_id from posts where id = p
$$;

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------

-- Posts: the photo must sit in the author's own folder, and at most 20 posts a day.
create function guard_posts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_client_role() then return new; end if;
  if new.image_path is not null and (storage_folder(new.image_path) <> new.author_id::text) then
    raise exception 'image must be in your own folder';
  end if;
  if tg_op = 'INSERT' then
    new.created_at := now();
    if (select count(*) from posts where author_id = new.author_id and created_at > now() - interval '1 day') >= 20 then
      raise exception 'daily post limit reached';
    end if;
  else
    new.author_id := old.author_id;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

create function storage_folder(path text) returns text
language sql immutable as $$
  select split_part(path, '/', 1)
$$;

create trigger posts_guard before insert or update on posts
  for each row execute function guard_posts();

-- Comments: not on posts by someone you blocked or who blocked you, at most 200 a day.
create function guard_post_comments() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_client_role() then return new; end if;
  if is_blocked_between(new.author_id, post_author(new.post_id)) then
    raise exception 'cannot comment on this post';
  end if;
  new.created_at := now();
  if (select count(*) from post_comments where author_id = new.author_id and created_at > now() - interval '1 day') >= 200 then
    raise exception 'daily comment limit reached';
  end if;
  return new;
end $$;

create trigger post_comments_guard before insert on post_comments
  for each row execute function guard_post_comments();

create function guard_post_likes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_client_role() then return new; end if;
  if is_blocked_between(new.user_id, post_author(new.post_id)) then
    raise exception 'cannot like this post';
  end if;
  new.created_at := now();
  return new;
end $$;

create trigger post_likes_guard before insert on post_likes
  for each row execute function guard_post_likes();

-- ---------------------------------------------------------------------------
-- Notifications for likes and comments
-- ---------------------------------------------------------------------------

alter table notifications drop constraint notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in
  ('connection_request','connection_accepted','collab_interest','collab_accepted','post_like','post_comment'));

-- entity_id is the post, so the bell can link straight to it.
create function notify_on_post_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  author uuid := post_author(new.post_id);
begin
  if author <> new.user_id and not exists (
    select 1 from notifications
    where user_id = author and actor_id = new.user_id and kind = 'post_like' and entity_id = new.post_id
  ) then
    insert into notifications (user_id, kind, actor_id, entity_id)
    values (author, 'post_like', new.user_id, new.post_id);
  end if;
  return null;
end $$;

create trigger post_likes_notify after insert on post_likes
  for each row execute function notify_on_post_like();

create function notify_on_post_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  author uuid := post_author(new.post_id);
begin
  if author <> new.author_id then
    insert into notifications (user_id, kind, actor_id, entity_id)
    values (author, 'post_comment', new.author_id, new.post_id);
  end if;
  return null;
end $$;

create trigger post_comments_notify after insert on post_comments
  for each row execute function notify_on_post_comment();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table posts enable row level security;
alter table post_likes enable row level security;
alter table post_comments enable row level security;

-- A post is visible when its author's profile is (listed, or yours, and nobody blocked anybody).
create function can_see_author(author uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select author = (select auth.uid())
    or exists (
      select 1 from creator_profiles p
      where p.user_id = author and p.is_listed and not is_blocked_between(author, (select auth.uid()))
    )
$$;

create policy posts_read on posts for select using (can_see_author(author_id));
create policy posts_insert on posts for insert to authenticated with check (author_id = (select auth.uid()));
create policy posts_update on posts for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy posts_delete on posts for delete to authenticated using (author_id = (select auth.uid()));

create policy likes_read on post_likes for select using (can_see_author(post_author(post_id)));
create policy likes_insert on post_likes for insert to authenticated with check (
  user_id = (select auth.uid()) and can_see_author(post_author(post_id))
);
create policy likes_delete on post_likes for delete to authenticated using (user_id = (select auth.uid()));

create policy comments_read on post_comments for select using (
  can_see_author(post_author(post_id)) and can_see_author(author_id)
);
create policy comments_insert on post_comments for insert to authenticated with check (
  author_id = (select auth.uid()) and can_see_author(post_author(post_id))
);
-- The commenter, or the post's author, can remove a comment.
create policy comments_delete on post_comments for delete to authenticated using (
  author_id = (select auth.uid()) or post_author(post_id) = (select auth.uid())
);

-- Only the text and link of a post can be edited; comments and likes can't be edited.
revoke update on posts, post_likes, post_comments from anon, authenticated;
grant update (body, link_url, image_path) on posts to authenticated;
revoke insert, delete on posts, post_likes, post_comments from anon;

-- ---------------------------------------------------------------------------
-- The feed
-- ---------------------------------------------------------------------------

-- Posts from you, your connections, and creators in your city or niches, newest first.
-- Runs as the caller, so the rules above still decide what is visible.
create function get_feed(p_before timestamptz default null, p_limit int default 20)
returns table (
  id uuid,
  author_id uuid,
  body text,
  link_url text,
  image_path text,
  created_at timestamptz,
  author_handle text,
  author_name text,
  author_photo text,
  author_city text,
  like_count bigint,
  comment_count bigint,
  liked_by_me boolean,
  is_connection boolean
)
language sql stable set search_path = public as $$
  with me as (
    select user_id, city_slug, niches from creator_profiles where user_id = (select auth.uid())
  ),
  friends as (
    select case when c.from_user = me.user_id then c.to_user else c.from_user end as user_id
    from connections c, me
    where c.status = 'accepted' and me.user_id in (c.from_user, c.to_user)
  )
  select
    p.id, p.author_id, p.body, p.link_url, p.image_path, p.created_at,
    a.handle, a.display_name, a.photo_path, a.city_slug,
    (select count(*) from post_likes l where l.post_id = p.id),
    (select count(*) from post_comments c where c.post_id = p.id),
    exists (select 1 from post_likes l where l.post_id = p.id and l.user_id = (select auth.uid())),
    p.author_id in (select user_id from friends)
  from posts p
  join creator_profiles a on a.user_id = p.author_id
  left join me on true
  where (p_before is null or p.created_at < p_before)
    and (
      me.user_id is null
      or p.author_id = me.user_id
      or p.author_id in (select user_id from friends)
      or (me.city_slug is not null and a.city_slug = me.city_slug)
      or a.niches && me.niches
    )
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 50)
$$;

grant execute on function get_feed(timestamptz, int) to authenticated;
revoke execute on function get_feed(timestamptz, int) from public, anon;

-- ---------------------------------------------------------------------------
-- Post photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy post_images_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy post_images_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
