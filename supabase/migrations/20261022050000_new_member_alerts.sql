-- Alerts for new people nearby or in your niche, and a safe re-run of the collab alerts.

-- Collab alerts (first added in 20261020020000). Recreated here so this file also fixes
-- databases where that earlier file was never run. Without the trigger, nobody hears about new collabs.
create or replace function notify_on_collab_post() returns trigger
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

drop trigger if exists collab_posts_notify on collab_posts;
create trigger collab_posts_notify after insert on collab_posts
  for each row execute function notify_on_collab_post();

alter table notifications drop constraint notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in
  ('connection_request','connection_accepted','collab_interest','collab_accepted','post_like','post_comment','collab_new',
   'group_request','group_accepted','new_member'));

-- When someone first sets their city or niches, people in the same city or with a shared
-- niche get a "just joined" bell alert. Each person gets at most one such alert a day, so a
-- busy city doesn't flood anyone.
create or replace function notify_on_new_member() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  city_new boolean := new.city_slug is not null and (tg_op = 'INSERT' or old.city_slug is null);
  niches_new boolean := cardinality(new.niches) > 0 and (tg_op = 'INSERT' or cardinality(old.niches) = 0);
begin
  if not new.is_listed or not (city_new or niches_new) then
    return null;
  end if;
  insert into notifications (user_id, kind, actor_id)
  select p.user_id, 'new_member', new.user_id
  from creator_profiles p
  where p.is_listed
    and p.user_id <> new.user_id
    and ((new.city_slug is not null and p.city_slug = new.city_slug) or p.niches && new.niches)
    and not is_blocked_between(p.user_id, new.user_id)
    and not exists (
      select 1 from notifications n
      where n.user_id = p.user_id and n.kind = 'new_member'
        and (n.actor_id = new.user_id or n.created_at > now() - interval '20 hours')
    )
  order by (new.city_slug is not null and p.city_slug = new.city_slug) desc, p.updated_at desc
  limit 200;
  return null;
end $$;

drop trigger if exists creator_profiles_new_member on creator_profiles;
create trigger creator_profiles_new_member after insert or update of city_slug, niches on creator_profiles
  for each row execute function notify_on_new_member();
