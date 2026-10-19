-- Milestone 3: profile photo storage and reordering pinned videos.

-- Public bucket for profile photos, up to 2 MB, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Each user writes only inside their own folder: avatars/<user id>/...
create policy avatars_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Moves one of the caller's pinned videos to a new slot, shifting the others.
-- Runs as the caller, so the videos table's own rules still apply.
create function move_profile_video(video_id uuid, new_position smallint) returns void
language plpgsql as $$
declare
  me uuid := auth.uid();
  old_position smallint;
  slots smallint;
begin
  select position into old_position from profile_videos where id = video_id and user_id = me;
  if old_position is null then
    raise exception 'video not found' using errcode = 'P0002';
  end if;
  select count(*) into slots from profile_videos where user_id = me;
  new_position := least(greatest(new_position, 1), slots);
  if new_position = old_position then
    return;
  end if;

  set constraints profile_videos_user_id_position_key deferred;
  if new_position < old_position then
    update profile_videos set position = position + 1
      where user_id = me and position >= new_position and position < old_position;
  else
    update profile_videos set position = position - 1
      where user_id = me and position <= new_position and position > old_position;
  end if;
  update profile_videos set position = new_position where id = video_id;
end $$;

revoke execute on function move_profile_video(uuid, smallint) from public, anon;
grant execute on function move_profile_video(uuid, smallint) to authenticated;
