-- Peerpop's own Instagram: posts waiting for approval, and the connected account.
-- Only the server (secret key) reads or writes these; no app user can.

create table ig_posts (
  id uuid primary key default gen_random_uuid(),
  idea_key text not null unique,
  kind text not null check (kind in ('tip', 'collab', 'milestone')),
  headline text not null check (char_length(headline) between 1 and 120),
  subline text check (char_length(subline) <= 200),
  caption text not null check (char_length(caption) <= 2200),
  status text not null default 'draft' check (status in ('draft', 'approved', 'posted', 'skipped', 'failed')),
  error text,
  ig_media_id text,
  permalink text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  posted_at timestamptz
);
create index on ig_posts (status, approved_at);

create table ig_account (
  id int primary key default 1 check (id = 1),
  ig_user_id text not null,
  username text,
  access_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table ig_posts enable row level security;
alter table ig_account enable row level security;
revoke all on ig_posts, ig_account from anon, authenticated;
