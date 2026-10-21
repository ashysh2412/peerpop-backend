-- Groups: creators gather around a niche or a city and post to the group.
-- A group is open (anyone joins straight away) or asks to join (an admin approves).

create table groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name text not null check (char_length(name) between 3 and 60),
  about text check (char_length(about) <= 500),
  join_type text not null default 'open' check (join_type in ('open', 'approval')),
  created_by uuid not null references creator_profiles on delete cascade,
  created_at timestamptz not null default now()
);
create index on groups (created_at desc);

-- One row per person per group; 'pending' rows are join requests.
create table group_members (
  group_id uuid not null references groups on delete cascade,
  user_id uuid not null references creator_profiles on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'member' check (status in ('pending', 'member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index on group_members (user_id);
create index on group_members (group_id) where status = 'pending';

alter table posts add column group_id uuid references groups on delete cascade;
create index on posts (group_id, created_at desc) where group_id is not null;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function is_group_member(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = g and user_id = (select auth.uid()) and status = 'member')
$$;

create function is_group_admin(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = g and user_id = (select auth.uid()) and status = 'member' and role = 'admin')
$$;

-- Open groups are readable by anyone signed in; groups that ask to join show posts to members only.
create function can_see_group_posts(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from groups where id = g and join_type = 'open') or is_group_member(g)
$$;

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------

-- At most 5 new groups a day; the creator becomes its first admin.
create function guard_groups() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_client_role() then return new; end if;
  if tg_op = 'INSERT' then
    new.created_at := now();
    if (select count(*) from groups where created_by = new.created_by and created_at > now() - interval '1 day') >= 5 then
      raise exception 'daily group limit reached';
    end if;
  else
    new.slug := old.slug;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger groups_guard before insert or update on groups for each row execute function guard_groups();

create function add_group_creator() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into group_members (group_id, user_id, role, status) values (new.id, new.created_by, 'admin', 'member');
  return null;
end $$;
create trigger groups_add_creator after insert on groups for each row execute function add_group_creator();

-- Joining: open groups let you straight in, others record a request. Nobody makes themselves an admin.
create function guard_group_members() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_client_role() then return new; end if;
  new.created_at := now();
  -- The creator's own first row (added by add_group_creator) makes them admin.
  if exists (select 1 from groups where id = new.group_id and created_by = new.user_id)
    and not exists (select 1 from group_members where group_id = new.group_id) then
    new.role := 'admin';
    new.status := 'member';
    return new;
  end if;
  new.role := 'member';
  new.status := case when (select join_type from groups where id = new.group_id) = 'open' then 'member' else 'pending' end;
  if (select count(*) from group_members where user_id = new.user_id and created_at > now() - interval '1 day') >= 30 then
    raise exception 'daily join limit reached';
  end if;
  return new;
end $$;
create trigger group_members_guard before insert on group_members for each row execute function guard_group_members();

-- The last admin can't leave a group that still has other members.
create function guard_group_leave() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_client_role() then return old; end if;
  -- The whole group is being deleted.
  if not exists (select 1 from groups where id = old.group_id) then return old; end if;
  if old.role = 'admin' and old.status = 'member'
    and not exists (select 1 from group_members where group_id = old.group_id and role = 'admin' and status = 'member' and user_id <> old.user_id)
    and exists (select 1 from group_members where group_id = old.group_id and status = 'member' and user_id <> old.user_id)
  then
    raise exception 'last admin cannot leave';
  end if;
  return old;
end $$;
create trigger group_members_leave before delete on group_members for each row execute function guard_group_leave();

-- Posting to a group needs membership.
create or replace function guard_posts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_client_role() then return new; end if;
  if new.image_path is not null and (storage_folder(new.image_path) <> new.author_id::text) then
    raise exception 'image must be in your own folder';
  end if;
  if tg_op = 'INSERT' then
    new.created_at := now();
    if new.group_id is not null and not is_group_member(new.group_id) then
      raise exception 'join the group to post';
    end if;
    if (select count(*) from posts where author_id = new.author_id and created_at > now() - interval '1 day') >= 20 then
      raise exception 'daily post limit reached';
    end if;
  else
    new.author_id := old.author_id;
    new.created_at := old.created_at;
    new.group_id := old.group_id;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Admin actions
-- ---------------------------------------------------------------------------

create function respond_group_request(g uuid, member uuid, accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_group_admin(g) then raise exception 'only admins can do that'; end if;
  if accept then
    update group_members set status = 'member' where group_id = g and user_id = member and status = 'pending';
  else
    delete from group_members where group_id = g and user_id = member and status = 'pending';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Notifications: requests go to the admins, approvals go to the person
-- ---------------------------------------------------------------------------

alter table notifications drop constraint notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in
  ('connection_request','connection_accepted','collab_interest','collab_accepted','post_like','post_comment','collab_new',
   'group_request','group_accepted'));

-- entity_id is the group, so the bell can link straight to it.
create function notify_on_group_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into notifications (user_id, kind, actor_id, entity_id)
    select m.user_id, 'group_request', new.user_id, new.group_id
    from group_members m where m.group_id = new.group_id and m.role = 'admin' and m.status = 'member';
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'member' then
    insert into notifications (user_id, kind, actor_id, entity_id)
    values (new.user_id, 'group_accepted', (select auth.uid()), new.group_id);
  end if;
  return null;
end $$;
create trigger group_members_notify after insert or update on group_members for each row execute function notify_on_group_member();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table groups enable row level security;
alter table group_members enable row level security;

create policy groups_read on groups for select to authenticated using (true);
create policy groups_insert on groups for insert to authenticated with check (created_by = (select auth.uid()));
create policy groups_update on groups for update to authenticated using (is_group_admin(id)) with check (is_group_admin(id));
create policy groups_delete on groups for delete to authenticated using (is_group_admin(id));
revoke update on groups from anon, authenticated;
grant update (name, about, join_type) on groups to authenticated;
revoke insert, delete on groups from anon;

-- You see your own rows, a group's members if you can see its posts, and requests if you're its admin.
create policy members_read on group_members for select to authenticated using (
  user_id = (select auth.uid())
  or (status = 'member' and can_see_group_posts(group_id))
  or is_group_admin(group_id)
);
create policy members_join on group_members for insert to authenticated with check (user_id = (select auth.uid()));
-- Leave (or cancel a request) yourself; admins can remove others.
create policy members_leave on group_members for delete to authenticated using (
  user_id = (select auth.uid()) or is_group_admin(group_id)
);
revoke update on group_members from anon, authenticated;
revoke insert, delete on group_members from anon;

-- Group posts follow the group's privacy; group admins can remove posts in their group.
drop policy posts_read on posts;
create policy posts_read on posts for select using (
  can_see_author(author_id) and (group_id is null or can_see_group_posts(group_id))
);
drop policy posts_delete on posts;
create policy posts_delete on posts for delete to authenticated using (
  author_id = (select auth.uid()) or (group_id is not null and is_group_admin(group_id))
);

-- Groups list: every group with its member count and where I stand, biggest first.
create function get_groups()
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
  order by (mine.status = 'member') desc nulls last,
    (select count(*) from group_members m where m.group_id = g.id and m.status = 'member') desc,
    g.created_at desc
  limit 200
$$;

-- A group's posts in the same shape as the feed.
create function get_group_feed(g uuid, p_before timestamptz default null, p_limit int default 20)
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
  select
    p.id, p.author_id, p.body, p.link_url, p.image_path, p.created_at,
    a.handle, a.display_name, a.photo_path, a.city_slug,
    (select count(*) from post_likes l where l.post_id = p.id),
    (select count(*) from post_comments c where c.post_id = p.id),
    exists (select 1 from post_likes l where l.post_id = p.id and l.user_id = (select auth.uid())),
    false
  from posts p
  join creator_profiles a on a.user_id = p.author_id
  where p.group_id = g and (p_before is null or p.created_at < p_before)
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 50)
$$;

-- The home feed stays the people you follow and your city; group posts live in their group.
create or replace function get_feed(p_before timestamptz default null, p_limit int default 20)
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
  where p.group_id is null
    and (p_before is null or p.created_at < p_before)
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

grant execute on function get_groups() to authenticated;
grant execute on function get_group_feed(uuid, timestamptz, int) to authenticated;
grant execute on function respond_group_request(uuid, uuid, boolean) to authenticated;
revoke execute on function get_groups() from public, anon;
revoke execute on function get_group_feed(uuid, timestamptz, int) from public, anon;
revoke execute on function respond_group_request(uuid, uuid, boolean) from public, anon;
