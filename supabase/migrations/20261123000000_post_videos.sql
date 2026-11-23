-- Videos uploaded straight into a post (no YouTube or Instagram link).
-- Only the Peerpop account (official_accounts) can upload them, so members
-- don't fill up storage. Additive and safe to run more than once.

alter table posts add column if not exists video_path text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'posts_video_path_check') then
    alter table posts add constraint posts_video_path_check check (video_path is null or char_length(video_path) < 200);
  end if;
end $$;

-- Public bucket for post videos: up to 50 MB each, MP4 / MOV / WebM.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-videos', 'post-videos', true, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

drop policy if exists post_videos_official_insert on storage.objects;
create policy post_videos_official_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.official_accounts o where o.user_id = (select auth.uid()))
  );
drop policy if exists post_videos_owner_delete on storage.objects;
create policy post_videos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'post-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Same rules as before, plus: a video must be the Peerpop account's own file.
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
  if new.video_path is distinct from (case when tg_op = 'UPDATE' then old.video_path end) and new.video_path is not null then
    if storage_folder(new.video_path) is distinct from new.author_id::text then
      raise exception 'video must be in your own folder';
    end if;
    if not exists (select 1 from official_accounts where user_id = new.author_id) then
      raise exception 'only the Peerpop account can upload videos';
    end if;
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
