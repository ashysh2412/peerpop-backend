-- Collab idea matching: remembers which creators Peerpop matched to each posted
-- collab idea, so nobody is matched to the same idea twice and each person gets
-- at most a couple of idea chats a week. Only the server (secret key) reads or
-- writes it. Additive and safe to run more than once.

create table if not exists collab_matches (
  id bigint generated always as identity primary key,
  post_id uuid not null references collab_posts (id) on delete cascade,
  user_id uuid not null references creator_profiles (user_id) on delete cascade,
  messaged boolean not null default false,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists collab_matches_user on collab_matches (user_id, created_at desc);

-- Row-level security on with no policies: members can't see or change it.
alter table collab_matches enable row level security;
