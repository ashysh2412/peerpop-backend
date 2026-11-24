-- Official accounts (the "Peerpop" account): their home-feed posts reach every
-- member, not only connections, same city or shared niche.
-- Safe to run more than once. Adds one small table and updates get_feed.

-- A separate table (not a column on creator_profiles) so nobody can mark
-- their own profile official: there are no insert/update policies, so only
-- the SQL Editor can change it.
create table if not exists official_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table official_accounts enable row level security;
drop policy if exists official_accounts_read on official_accounts;
create policy official_accounts_read on official_accounts for select using (true);

-- The Peerpop account.
insert into official_accounts (user_id)
select user_id from creator_profiles where handle = 'ashyshpeerpop'
on conflict do nothing;

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
      or p.author_id in (select user_id from official_accounts)
      or (me.city_slug is not null and a.city_slug = me.city_slug)
      or a.niches && me.niches
    )
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 50)
$$;
