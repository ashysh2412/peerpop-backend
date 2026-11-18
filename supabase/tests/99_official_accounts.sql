-- Official accounts: their posts reach every member's home feed.
\set M '''f9f9f9f9-0000-0000-0000-000000000001'''
\set O '''f9f9f9f9-0000-0000-0000-000000000002'''
\set X '''f9f9f9f9-0000-0000-0000-000000000003'''
reset role;
insert into auth.users (id) values (:M), (:O), (:X);
-- M (Nagpur, dance) shares nothing with O or X.
insert into creator_profiles (user_id, handle, display_name, city_slug, niches, is_listed) values
  (:M, 'off_m', 'M', 'nagpur', '{dance}', true),
  (:O, 'off_o', 'Peerpop', null, '{gaming}', true),
  (:X, 'off_x', 'X', null, '{gaming}', true);
insert into official_accounts (user_id) values (:O);
insert into posts (author_id, body) values (:O, 'Official post'), (:X, 'Stranger post');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"f9f9f9f9-0000-0000-0000-000000000001"}', false);
select t.check((select count(*) from get_feed() where author_id = :O) = 1, 'official posts reach members with no link to the account');
select t.check((select count(*) from get_feed() where author_id = :X) = 0, 'other unrelated posts still stay out');
select t.expect_error($$insert into official_accounts (user_id) values ('f9f9f9f9-0000-0000-0000-000000000001')$$, 'members cannot make themselves official');

-- Blocking still wins.
reset role;
insert into blocks (blocker_id, blocked_id) values (:M, :O);
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"f9f9f9f9-0000-0000-0000-000000000001"}', false);
select t.check((select count(*) from get_feed() where author_id = :O) = 0, 'a blocked official account stays hidden');
reset role;
\echo 'official account tests: all checks passed'
