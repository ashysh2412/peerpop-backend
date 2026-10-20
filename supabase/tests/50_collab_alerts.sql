-- Tests for collab alerts: who gets told about a new collab.
\set A '''a5a5a5a5-0000-0000-0000-000000000000'''
\set B '''b5b5b5b5-0000-0000-0000-000000000000'''
\set C '''c5c5c5c5-0000-0000-0000-000000000000'''
\set D '''d5d5d5d5-0000-0000-0000-000000000000'''
\set E '''e5e5e5e5-0000-0000-0000-000000000000'''
\set F '''f5f5f5f5-0000-0000-0000-000000000000'''
update creator_profiles set is_listed = false;
insert into auth.users (id) values (:A), (:B), (:C), (:D), (:E), (:F);
-- A posts. B: anchor in Delhi. C: editor in Pune. D: editor in Delhi. E: anchor, unlisted. F: anchor who blocked A.
insert into creator_profiles (user_id, handle, display_name, city_slug, skills, is_listed) values
  (:A, 'alert_a', 'A', 'pune', '{}', true),
  (:B, 'alert_b', 'B', 'delhi', '{anchor}', true),
  (:C, 'alert_c', 'C', 'pune', '{editor}', true),
  (:D, 'alert_d', 'D', 'delhi', '{editor}', true),
  (:E, 'alert_e', 'E', 'pune', '{anchor}', false),
  (:F, 'alert_f', 'F', 'delhi', '{anchor}', true);
insert into blocks (blocker_id, blocked_id) values (:F, :A);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"a5a5a5a5-0000-0000-0000-000000000000"}', false);
insert into collab_posts (author_id, title, description, city_slug, roles_needed)
values (:A, 'Marathi anchor needed', 'Food series', 'pune', '{anchor}');
reset role;

select t.check((select string_agg(p.handle, ',' order by p.handle) from notifications n join creator_profiles p on p.user_id = n.user_id
  where n.kind = 'collab_new' and n.actor_id = :A) = 'alert_b,alert_c',
  'creators with a needed skill or in the city are told; others, hidden and blocking creators are not');
select t.check((select count(*) from notifications where kind = 'collab_new' and user_id = :A) = 0, 'the author is not told');
select t.check((select bool_and(entity_id = (select id from collab_posts where author_id = :A)) from notifications where kind = 'collab_new' and actor_id = :A),
  'alerts point at the collab');
\echo 'collab alert tests: all checks passed'
