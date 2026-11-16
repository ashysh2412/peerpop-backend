-- Who viewed your profile. Only adds new things; nothing existing changes. Safe to run more than once.
-- 1. A view is saved at most once per person per day (opening a profile again that day only updates the time).
-- 2. Nobody can read the views table directly. Members only get their own viewers through my_profile_views().
-- 3. "Browse privately": your views aren't saved, and in return you don't see names of who viewed you (only the count).
-- 4. Blocked people never show up, either way. Views older than 90 days are cleared.

create table if not exists profile_views (
  viewed_id uuid not null references creator_profiles on delete cascade,
  viewer_id uuid not null references creator_profiles on delete cascade,
  day date not null default current_date,
  viewed_at timestamptz not null default now(),
  primary key (viewed_id, viewer_id, day)
);
create index if not exists profile_views_recent on profile_views (viewed_id, viewed_at desc);
alter table profile_views enable row level security;
revoke all on profile_views from anon, authenticated;

create table if not exists view_settings (
  user_id uuid primary key references creator_profiles on delete cascade,
  browse_privately boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table view_settings enable row level security;
drop policy if exists "Read own view settings" on view_settings;
create policy "Read own view settings" on view_settings for select to authenticated using (user_id = auth.uid());
drop policy if exists "Add own view settings" on view_settings;
create policy "Add own view settings" on view_settings for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Change own view settings" on view_settings;
create policy "Change own view settings" on view_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function browses_privately(who uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select browse_privately from view_settings where user_id = who), false)
$$;

-- Called when a signed-in member opens someone's profile.
create or replace function record_profile_view(target uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null or target is null or me = target then return; end if;
  if browses_privately(me) or is_blocked_between(me, target) then return; end if;
  if not exists (select 1 from creator_profiles where user_id = me)
     or not exists (select 1 from creator_profiles where user_id = target) then return; end if;
  insert into profile_views (viewed_id, viewer_id) values (target, me)
  on conflict (viewed_id, viewer_id, day) do update set viewed_at = now();
  delete from profile_views where viewed_id = target and day < current_date - 90;
end $$;

-- The people who viewed me in the last 30 days, newest first. Skips blocked people, people who now
-- browse privately and people hidden from search. Empty when I browse privately myself.
create or replace function my_profile_views()
returns table (user_id uuid, handle text, display_name text, photo_path text, city_slug text, skills skill[], viewed_at timestamptz, times integer)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.handle, p.display_name, p.photo_path, p.city_slug, p.skills, max(v.viewed_at), count(*)::integer
  from profile_views v
  join creator_profiles p on p.user_id = v.viewer_id
  where v.viewed_id = (select auth.uid())
    and v.day >= current_date - 30
    and not browses_privately((select auth.uid()))
    and not browses_privately(v.viewer_id)
    and p.is_listed
    and not is_blocked_between(v.viewer_id, (select auth.uid()))
  group by p.user_id, p.handle, p.display_name, p.photo_path, p.city_slug, p.skills
  order by max(v.viewed_at) desc
  limit 100
$$;

-- How many people viewed me in the last 30 days (shown even when I browse privately).
create or replace function my_profile_view_count() returns integer
language sql stable security definer set search_path = public as $$
  select count(distinct v.viewer_id)::integer
  from profile_views v
  join creator_profiles p on p.user_id = v.viewer_id
  where v.viewed_id = (select auth.uid())
    and v.day >= current_date - 30
    and not browses_privately(v.viewer_id)
    and p.is_listed
    and not is_blocked_between(v.viewer_id, (select auth.uid()))
$$;

revoke execute on function browses_privately(uuid) from public, anon, authenticated;
revoke execute on function record_profile_view(uuid) from public, anon;
revoke execute on function my_profile_views() from public, anon;
revoke execute on function my_profile_view_count() from public, anon;
grant execute on function record_profile_view(uuid) to authenticated;
grant execute on function my_profile_views() to authenticated;
grant execute on function my_profile_view_count() to authenticated;
