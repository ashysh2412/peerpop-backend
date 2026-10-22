-- Tests for "just joined" alerts: who hears about a new creator, and how often.
\set A '''a9a9a9a9-1111-0000-0000-000000000000'''
\set B '''b9b9b9b9-1111-0000-0000-000000000000'''
\set C '''c9c9c9c9-1111-0000-0000-000000000000'''
\set D '''d9d9d9d9-1111-0000-0000-000000000000'''
\set E '''e9e9e9e9-1111-0000-0000-000000000000'''
\set N '''f9f9f9f9-1111-0000-0000-000000000000'''
\set M '''f8f8f8f8-1111-0000-0000-000000000000'''
update creator_profiles set is_listed = false;
delete from notifications;
insert into auth.users (id) values (:A), (:B), (:C), (:D), (:E), (:N), (:M);
-- A: Pune food. B: Delhi food. C: Delhi tech. D: Pune, unlisted. E: Pune, blocked the newcomer.
insert into creator_profiles (user_id, handle, display_name, city_slug, niches, is_listed) values
  (:A, 'nm_a', 'A', 'pune', '{food}', true),
  (:B, 'nm_b', 'B', 'delhi', '{food}', true),
  (:C, 'nm_c', 'C', 'delhi', '{tech}', true),
  (:D, 'nm_d', 'D', 'pune', '{}', false),
  (:E, 'nm_e', 'E', 'pune', '{}', true);
delete from notifications;
-- The newcomer signs up with no city or niche yet: nobody is told.
insert into creator_profiles (user_id, handle, display_name) values (:N, 'nm_new', 'New');
insert into blocks (blocker_id, blocked_id) values (:E, :N);
select t.check((select count(*) from notifications where kind = 'new_member') = 0, 'a blank new profile alerts nobody');

-- They pick Pune and food.
update creator_profiles set city_slug = 'pune', niches = '{food}' where user_id = :N;
select t.check((select string_agg(p.handle, ',' order by p.handle) from notifications n join creator_profiles p on p.user_id = n.user_id
  where n.kind = 'new_member' and n.actor_id = :N) = 'nm_a,nm_b',
  'people in the same city or niche are told; others, hidden and blocking creators are not');

-- Changing city later doesn't alert again.
update creator_profiles set city_slug = 'delhi' where user_id = :N;
select t.check((select count(*) from notifications where kind = 'new_member' and actor_id = :N) = 2, 'only the first city or niche counts');

-- A second newcomer the same day doesn't alert A again.
insert into creator_profiles (user_id, handle, display_name, city_slug) values (:M, 'nm_new2', 'New 2', 'pune');
select t.check((select count(*) from notifications where kind = 'new_member' and user_id = :A) = 1, 'at most one "just joined" alert a day');
\echo 'new member alert tests: all checks passed'
