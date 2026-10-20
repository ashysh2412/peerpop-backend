-- Collab alerts: when a collab is posted, creators who have a skill it needs,
-- or who live in its city, get a bell notification.

alter table notifications drop constraint notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in
  ('connection_request','connection_accepted','collab_interest','collab_accepted','post_like','post_comment','collab_new'));

-- entity_id is the collab, so the bell links straight to it.
create function notify_on_collab_post() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, kind, actor_id, entity_id)
  select p.user_id, 'collab_new', new.author_id, new.id
  from creator_profiles p
  where p.is_listed
    and p.user_id <> new.author_id
    and (p.skills && new.roles_needed or (new.city_slug is not null and p.city_slug = new.city_slug))
    and not is_blocked_between(p.user_id, new.author_id)
  order by (p.skills && new.roles_needed) desc, p.updated_at desc
  limit 500;
  return null;
end $$;

create trigger collab_posts_notify after insert on collab_posts
  for each row execute function notify_on_collab_post();
