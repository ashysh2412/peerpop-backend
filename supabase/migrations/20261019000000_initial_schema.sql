-- Peerpop initial schema (milestone 2)
--
-- Covers section 2 of creator-search-build-spec.md and section 4 of
-- peerpop-mvp-plan.md: profiles, linked platforms, verified stats,
-- pinned videos, connections, collabs, notifications, blocks and reports.
--
-- Security model in one line: creators can edit only their own rows, and
-- only the server (service_role) can write anything that backs a
-- "Verified" badge.

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

create table cities (
  slug text primary key,
  name text not null,
  is_active boolean not null default true
);
insert into cities (slug, name) values ('pune', 'Pune');

create type niche as enum ('food','fitness','comedy','tech','fashion','beauty','travel',
  'education','finance','gaming','music','lifestyle','other');
create type skill as enum ('editor','anchor','scriptwriter','videographer','photographer','voiceover');
create type lang as enum ('marathi','hindi','english');
create type platform as enum ('youtube','instagram');
create type stat_source as enum ('verified','self_reported');
create type connection_status as enum ('pending','accepted','declined');
create type collab_status as enum ('open','closed');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- True when the current request comes from a browser/app user (anon key or a
-- signed-in user) rather than the server or a migration. Checks the role the
-- API switched to, so it still works inside security definer functions,
-- where current_user is the function owner.
create function is_client_role() returns boolean
language sql stable as $$
  select current_setting('role', true) in ('anon', 'authenticated')
      or current_user in ('anon', 'authenticated')
$$;

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table creator_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  photo_path text,
  bio text check (char_length(bio) <= 500),
  city_slug text references cities,
  niches niche[] not null default '{}',
  skills skill[] not null default '{}',
  languages lang[] not null default '{}',
  open_to_collab boolean not null default false,
  is_listed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger creator_profiles_updated_at before update on creator_profiles
  for each row execute function set_updated_at();

create index on creator_profiles (city_slug) where is_listed;
create index on creator_profiles using gin (niches);
create index on creator_profiles using gin (skills);
create index on creator_profiles using gin (languages);
create index on creator_profiles (open_to_collab) where is_listed;

-- Contact details are kept apart from the profile so they are never readable
-- through normal selects; see get_contact() below.
create table creator_contacts (
  user_id uuid primary key references creator_profiles on delete cascade,
  contact_email text check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_whatsapp text check (contact_whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  contact_note text check (char_length(contact_note) <= 200),
  updated_at timestamptz not null default now()
);
create trigger creator_contacts_updated_at before update on creator_contacts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Blocks (defined early because visibility rules below depend on them)
-- ---------------------------------------------------------------------------

create table blocks (
  blocker_id uuid not null references creator_profiles on delete cascade,
  blocked_id uuid not null references creator_profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Either user has blocked the other.
create function is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

-- ---------------------------------------------------------------------------
-- Linked platform accounts and stats
-- ---------------------------------------------------------------------------

create table platform_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references creator_profiles on delete cascade,
  platform platform not null,
  external_id text,
  handle text check (char_length(handle) <= 100),
  url text check (char_length(url) <= 300),
  source stat_source not null default 'self_reported',
  ownership_verified_at timestamptz,
  verification_code text,
  self_followers bigint check (self_followers between 0 and 1000000000),
  self_avg_views bigint check (self_avg_views between 0 and 1000000000),
  self_updated_at timestamptz,
  last_fetch_at timestamptz,
  last_fetch_error text,
  unique (user_id, platform),
  unique (platform, external_id)
);

-- Creators may only touch handle, url and self-reported numbers, and only
-- while the account is self-reported. Everything that proves ownership or
-- backs the Verified badge is written by the server.
create function guard_platform_accounts() returns trigger
language plpgsql as $$
begin
  if not is_client_role() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.source <> 'self_reported'
       or new.external_id is not null
       or new.ownership_verified_at is not null
       or new.verification_code is not null
       or new.last_fetch_at is not null
       or new.last_fetch_error is not null then
      raise exception 'only the server can set verification fields'
        using errcode = '42501';
    end if;
  else
    if old.source <> 'self_reported' then
      raise exception 'verified accounts can only be changed by the server'
        using errcode = '42501';
    end if;
    if new.user_id is distinct from old.user_id
       or new.platform is distinct from old.platform
       or new.source is distinct from old.source
       or new.external_id is distinct from old.external_id
       or new.ownership_verified_at is distinct from old.ownership_verified_at
       or new.verification_code is distinct from old.verification_code
       or new.last_fetch_at is distinct from old.last_fetch_at
       or new.last_fetch_error is distinct from old.last_fetch_error then
      raise exception 'only the server can change verification fields'
        using errcode = '42501';
    end if;
  end if;

  if new.self_followers is distinct from (case when tg_op = 'UPDATE' then old.self_followers end)
     or new.self_avg_views is distinct from (case when tg_op = 'UPDATE' then old.self_avg_views end) then
    new.self_updated_at := now();
  end if;
  return new;
end $$;

create trigger platform_accounts_guard before insert or update on platform_accounts
  for each row execute function guard_platform_accounts();

create table stat_snapshots (
  account_id uuid not null references platform_accounts on delete cascade,
  captured_on date not null,
  followers bigint,
  total_views bigint,
  video_count integer,
  primary key (account_id, captured_on)
);

create table account_stats (
  account_id uuid primary key references platform_accounts on delete cascade,
  followers bigint,
  avg_views_last10 bigint,
  uploads_per_week numeric(4,1),
  growth_30d_abs bigint,
  growth_30d_pct numeric(6,2),
  followers_hidden boolean not null default false,
  computed_at timestamptz not null default now()
);

create table job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  accounts_ok integer not null default 0,
  accounts_failed integer not null default 0,
  units_used integer not null default 0
);

-- Public, safe columns of linked accounts (hides verification_code and
-- last_fetch_error). Runs with the view owner's rights so it can read rows
-- that the table's own policy hides from other users.
create view public_platform_accounts as
  select pa.id, pa.user_id, pa.platform, pa.handle, pa.url, pa.source,
         pa.ownership_verified_at, pa.self_followers, pa.self_avg_views,
         pa.self_updated_at, pa.last_fetch_at
  from platform_accounts pa
  join creator_profiles cp on cp.user_id = pa.user_id
  where cp.is_listed
    and not is_blocked_between(cp.user_id, auth.uid());

-- ---------------------------------------------------------------------------
-- Pinned videos
-- ---------------------------------------------------------------------------

create table profile_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references creator_profiles on delete cascade,
  platform platform not null,
  url text not null check (char_length(url) <= 300),
  external_id text not null check (char_length(external_id) <= 64),
  title text check (char_length(title) <= 200),
  thumbnail_url text check (char_length(thumbnail_url) <= 500),
  position smallint not null check (position between 1 and 6),
  created_at timestamptz not null default now(),
  unique (user_id, position) deferrable initially immediate,
  unique (user_id, platform, external_id)
);

-- ---------------------------------------------------------------------------
-- Connections
-- ---------------------------------------------------------------------------

create table connections (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references creator_profiles on delete cascade,
  to_user uuid not null references creator_profiles on delete cascade,
  message text check (char_length(message) <= 300),
  status connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_user <> to_user)
);
-- One row per pair, whichever direction it was sent in.
create unique index connections_pair on connections
  (least(from_user, to_user), greatest(from_user, to_user));
create index on connections (to_user, status);
create index on connections (from_user, status);

create function guard_connections() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if is_client_role() then
      if new.status <> 'pending' or new.responded_at is not null then
        raise exception 'new connection requests must be pending' using errcode = '42501';
      end if;
      if is_blocked_between(new.from_user, new.to_user) then
        raise exception 'cannot connect with this user' using errcode = '42501';
      end if;
      if not exists (select 1 from creator_profiles where user_id = new.from_user and is_listed) then
        raise exception 'create a listed profile before connecting' using errcode = '42501';
      end if;
      if (select count(*) from connections
          where from_user = new.from_user and created_at > now() - interval '1 day') >= 30 then
        raise exception 'daily connection request limit reached' using errcode = 'P0001';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE: only the recipient answers a pending request, once.
  if is_client_role() then
    if old.status <> 'pending' or new.status = 'pending' then
      raise exception 'only pending requests can be answered' using errcode = '42501';
    end if;
  end if;
  if new.status is distinct from old.status then
    new.responded_at := now();
  end if;
  return new;
end $$;

create trigger connections_guard before insert or update on connections
  for each row execute function guard_connections();

-- The signed-in user's accepted connections, as the other person's id.
create view my_connections with (security_invoker = true) as
  select c.id as connection_id,
         case when c.from_user = auth.uid() then c.to_user else c.from_user end as other_user,
         c.responded_at as connected_at
  from connections c
  where c.status = 'accepted'
    and auth.uid() in (c.from_user, c.to_user);

create function are_connected(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from connections
    where status = 'accepted'
      and least(from_user, to_user) = least(a, b)
      and greatest(from_user, to_user) = greatest(a, b)
  )
$$;

-- People both the signed-in user and `other` are connected to.
create function mutual_connections(other uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  with mine as (
    select case when from_user = auth.uid() then to_user else from_user end as u
    from connections
    where status = 'accepted' and auth.uid() in (from_user, to_user)
  ), theirs as (
    select case when from_user = other then to_user else from_user end as u
    from connections
    where status = 'accepted' and other in (from_user, to_user)
  )
  select mine.u from mine join theirs using (u)
  where auth.uid() is not null and mine.u <> other
$$;

-- ---------------------------------------------------------------------------
-- Collabs
-- ---------------------------------------------------------------------------

create table collab_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references creator_profiles on delete cascade,
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) <= 1500),
  city_slug text references cities,
  niches niche[] not null default '{}',
  roles_needed skill[] not null default '{}',
  languages lang[] not null default '{}',
  shoot_date date,
  status collab_status not null default 'open',
  created_at timestamptz not null default now(),
  closes_at timestamptz not null default now() + interval '30 days'
);
create index on collab_posts (city_slug, created_at desc) where status = 'open';
create index on collab_posts using gin (niches);
create index on collab_posts using gin (roles_needed);

create table collab_interests (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references collab_posts on delete cascade,
  user_id uuid not null references creator_profiles on delete cascade,
  message text check (char_length(message) <= 300),
  status connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (post_id, user_id)
);

create function collab_post_author(p uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select author_id from collab_posts where id = p
$$;

create function guard_collab_interests() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  post collab_posts;
begin
  select * into post from collab_posts where id = new.post_id;

  if tg_op = 'INSERT' then
    if is_client_role() then
      if new.status <> 'pending' or new.responded_at is not null then
        raise exception 'new interest must be pending' using errcode = '42501';
      end if;
      if post.author_id = new.user_id then
        raise exception 'cannot express interest in your own post' using errcode = '42501';
      end if;
      if post.status <> 'open' or post.closes_at <= now() then
        raise exception 'this collab is closed' using errcode = '42501';
      end if;
      if is_blocked_between(post.author_id, new.user_id) then
        raise exception 'cannot respond to this collab' using errcode = '42501';
      end if;
    end if;
    return new;
  end if;

  if is_client_role() then
    if old.status <> 'pending' or new.status = 'pending' then
      raise exception 'only pending interest can be answered' using errcode = '42501';
    end if;
  end if;
  if new.status is distinct from old.status then
    new.responded_at := now();
  end if;
  return new;
end $$;

create trigger collab_interests_guard before insert or update on collab_interests
  for each row execute function guard_collab_interests();

-- ---------------------------------------------------------------------------
-- Contact reveal
-- ---------------------------------------------------------------------------

-- Returns `other`'s contact details only to themselves, to an accepted
-- connection, or to someone with accepted collab interest either way.
create function get_contact(other uuid)
returns table (contact_email text, contact_whatsapp text, contact_note text)
language sql stable security definer set search_path = public as $$
  select c.contact_email, c.contact_whatsapp, c.contact_note
  from creator_contacts c
  where c.user_id = other
    and auth.uid() is not null
    and not is_blocked_between(auth.uid(), other)
    and (
      other = auth.uid()
      or are_connected(auth.uid(), other)
      or exists (
        select 1 from collab_interests i join collab_posts p on p.id = i.post_id
        where i.status = 'accepted'
          and ((p.author_id = other and i.user_id = auth.uid())
            or (p.author_id = auth.uid() and i.user_id = other))
      )
    )
$$;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references creator_profiles on delete cascade,
  kind text not null check (kind in
    ('connection_request','connection_accepted','collab_interest','collab_accepted')),
  actor_id uuid references creator_profiles on delete cascade,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);

create function notify_on_connection() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into notifications (user_id, kind, actor_id, entity_id)
    values (new.to_user, 'connection_request', new.from_user, new.id);
  elsif new.status = 'accepted' and old.status <> 'accepted' then
    insert into notifications (user_id, kind, actor_id, entity_id)
    values (new.from_user, 'connection_accepted', new.to_user, new.id);
  end if;
  return null;
end $$;

create trigger connections_notify after insert or update of status on connections
  for each row execute function notify_on_connection();

create function notify_on_collab_interest() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  author uuid := collab_post_author(new.post_id);
begin
  if tg_op = 'INSERT' then
    insert into notifications (user_id, kind, actor_id, entity_id)
    values (author, 'collab_interest', new.user_id, new.id);
  elsif new.status = 'accepted' and old.status <> 'accepted' then
    insert into notifications (user_id, kind, actor_id, entity_id)
    values (new.user_id, 'collab_accepted', author, new.id);
  end if;
  return null;
end $$;

create trigger collab_interests_notify after insert or update of status on collab_interests
  for each row execute function notify_on_collab_interest();

-- Blocking cancels any pending requests between the two people.
create function on_block() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from connections
  where status = 'pending'
    and least(from_user, to_user) = least(new.blocker_id, new.blocked_id)
    and greatest(from_user, to_user) = greatest(new.blocker_id, new.blocked_id);
  return null;
end $$;

create trigger blocks_cancel_requests after insert on blocks
  for each row execute function on_block();

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references creator_profiles on delete cascade,
  target_user uuid references creator_profiles on delete cascade,
  target_post uuid references collab_posts on delete cascade,
  reason text not null check (char_length(reason) between 1 and 1000),
  created_at timestamptz not null default now(),
  check (target_user is not null or target_post is not null)
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table cities enable row level security;
alter table creator_profiles enable row level security;
alter table creator_contacts enable row level security;
alter table blocks enable row level security;
alter table platform_accounts enable row level security;
alter table stat_snapshots enable row level security;
alter table account_stats enable row level security;
alter table job_runs enable row level security;
alter table profile_videos enable row level security;
alter table connections enable row level security;
alter table collab_posts enable row level security;
alter table collab_interests enable row level security;
alter table notifications enable row level security;
alter table reports enable row level security;

-- cities: read-only reference data
create policy cities_read on cities for select using (true);

-- creator_profiles
create policy profiles_read on creator_profiles for select using (
  user_id = (select auth.uid())
  or (is_listed and not is_blocked_between(user_id, (select auth.uid())))
);
create policy profiles_insert on creator_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy profiles_update on creator_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy profiles_delete on creator_profiles for delete to authenticated
  using (user_id = (select auth.uid()));

-- creator_contacts: owner only (others go through get_contact)
create policy contacts_owner on creator_contacts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- blocks: the blocker manages their own list
create policy blocks_owner on blocks for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

-- platform_accounts: owner reads full rows; everyone else uses
-- public_platform_accounts. The guard trigger limits which columns change.
create policy platform_owner_read on platform_accounts for select to authenticated
  using (user_id = (select auth.uid()));
create policy platform_owner_insert on platform_accounts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy platform_owner_update on platform_accounts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy platform_owner_delete on platform_accounts for delete to authenticated
  using (user_id = (select auth.uid()));

-- stats: public read, server-only write (no write policies on purpose)
create policy snapshots_read on stat_snapshots for select using (true);
create policy stats_read on account_stats for select using (true);
-- job_runs: server only (no policies)

-- profile_videos: visible when the profile is visible
create policy videos_read on profile_videos for select using (
  exists (select 1 from creator_profiles p where p.user_id = profile_videos.user_id)
);
create policy videos_owner_write on profile_videos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- connections: the two people involved
create policy connections_read on connections for select to authenticated
  using ((select auth.uid()) in (from_user, to_user));
create policy connections_send on connections for insert to authenticated
  with check (from_user = (select auth.uid()));
create policy connections_answer on connections for update to authenticated
  using (to_user = (select auth.uid())) with check (to_user = (select auth.uid()));
-- Either side can remove a connection or withdraw/decline a request, but a
-- sender can't clear a fresh decline to ask again within 30 days.
create policy connections_remove on connections for delete to authenticated using (
  to_user = (select auth.uid())
  or (from_user = (select auth.uid())
      and (status <> 'declined' or responded_at < now() - interval '30 days'))
);

-- collab_posts
create policy posts_read on collab_posts for select using (
  author_id = (select auth.uid())
  or not is_blocked_between(author_id, (select auth.uid()))
);
create policy posts_author_insert on collab_posts for insert to authenticated with check (
  author_id = (select auth.uid())
  and exists (select 1 from creator_profiles p where p.user_id = author_id and p.is_listed)
);
create policy posts_author_update on collab_posts for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy posts_author_delete on collab_posts for delete to authenticated
  using (author_id = (select auth.uid()));

-- collab_interests: the interested creator and the post author
create policy interests_read on collab_interests for select to authenticated using (
  user_id = (select auth.uid()) or collab_post_author(post_id) = (select auth.uid())
);
create policy interests_send on collab_interests for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy interests_answer on collab_interests for update to authenticated
  using (collab_post_author(post_id) = (select auth.uid()))
  with check (collab_post_author(post_id) = (select auth.uid()));
create policy interests_withdraw on collab_interests for delete to authenticated
  using (user_id = (select auth.uid()));

-- notifications: owner reads and marks read; created by triggers only
create policy notifications_read on notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_mark_read on notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- reports: anyone signed in can file one; nobody but the server reads them
create policy reports_file on reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Column-level limits on top of RLS
-- ---------------------------------------------------------------------------

-- Answering a request changes only its status (responded_at is set by trigger).
revoke update on connections from anon, authenticated;
grant update (status) on connections to authenticated;
revoke update on collab_interests from anon, authenticated;
grant update (status) on collab_interests to authenticated;
-- Notifications can only be marked as read.
revoke insert, update, delete on notifications from anon, authenticated;
grant update (read_at) on notifications to authenticated;
-- Server-only tables.
revoke insert, update, delete on stat_snapshots, account_stats, job_runs from anon, authenticated;
revoke select on job_runs from anon, authenticated;
-- Nobody writes reference data from the app.
revoke insert, update, delete on cities from anon, authenticated;
-- Contact details are never readable by visitors, even as empty results.
revoke all on creator_contacts from anon;
-- Reports are write-only for users.
revoke select, update, delete on reports from anon, authenticated;

-- Signed-in only helpers. is_blocked_between stays callable by everyone
-- because the public read policies use it.
revoke execute on function get_contact(uuid) from public, anon;
revoke execute on function mutual_connections(uuid) from public, anon;
revoke execute on function are_connected(uuid, uuid) from public, anon;
revoke execute on function collab_post_author(uuid) from public, anon;
grant execute on function get_contact(uuid) to authenticated;
grant execute on function mutual_connections(uuid) to authenticated;
grant execute on function are_connected(uuid, uuid) to authenticated;
grant execute on function collab_post_author(uuid) to authenticated;
