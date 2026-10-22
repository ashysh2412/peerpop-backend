-- When on, the daily run approves the next idea by itself, so a post goes out every day without review.
alter table ig_account add column if not exists auto_post boolean not null default false;
