-- Posts can carry up to 10 photos. The first stays in image_path (so the
-- feed functions, profile photo grid and old posts keep working); the other
-- photos, in order, go in more_images. Additive and safe to run more than once.

alter table posts add column if not exists more_images text[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'posts_more_images_check') then
    alter table posts add constraint posts_more_images_check check (
      cardinality(more_images) <= 9
      and (cardinality(more_images) = 0 or image_path is not null)
    );
  end if;
end $$;

-- Same rules as before, plus: every extra photo must be in the author's own folder.
create or replace function guard_posts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_client_role() then return new; end if;
  if new.image_path is not null and (storage_folder(new.image_path) <> new.author_id::text) then
    raise exception 'image must be in your own folder';
  end if;
  if exists (
    select 1 from unnest(new.more_images) m
    where m is null or char_length(m) >= 200 or storage_folder(m) is distinct from new.author_id::text
  ) then
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
