-- Verified YouTube channels can share their new uploads to the feed by
-- themselves, so creators don't have to paste the same link again.
-- On by default; only videos published after auto_share_since are shared,
-- so turning it on never floods the feed with old uploads.
alter table platform_accounts
  add column if not exists auto_share boolean not null default true,
  add column if not exists auto_share_since timestamptz not null default now();

-- Authors can now change a post's photos (the first stays in image_path).
grant update (more_images) on posts to authenticated;
