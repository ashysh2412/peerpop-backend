-- Tests for videos uploaded into posts (Peerpop account only).
\set O '''c9c9c9c9-6666-0000-0000-000000000000'''
\set M '''d9d9d9d9-6666-0000-0000-000000000000'''
insert into auth.users (id) values (:O), (:M);
insert into creator_profiles (user_id, handle, display_name, is_listed) values (:O, 'pv_official', 'Official', true), (:M, 'pv_member', 'Member', true);
insert into official_accounts (user_id) values (:O);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"c9c9c9c9-6666-0000-0000-000000000000","role":"authenticated"}', false);
insert into posts (author_id, body, video_path) values ('c9c9c9c9-6666-0000-0000-000000000000', 'a video', 'c9c9c9c9-6666-0000-0000-000000000000/v.mp4');
select t.check((select video_path from posts where body = 'a video') = 'c9c9c9c9-6666-0000-0000-000000000000/v.mp4', 'the Peerpop account can post a video');
select t.expect_error($$insert into posts (author_id, body, video_path) values ('c9c9c9c9-6666-0000-0000-000000000000', 'x', 'd9d9d9d9-6666-0000-0000-000000000000/v.mp4')$$,
  'a video must be in your own folder');
select t.check((select count(*) from get_feed() where body = 'a video') = 1, 'video posts show in the feed');

select set_config('request.jwt.claims', '{"sub":"d9d9d9d9-6666-0000-0000-000000000000","role":"authenticated"}', false);
select t.expect_error($$insert into posts (author_id, body, video_path) values ('d9d9d9d9-6666-0000-0000-000000000000', 'x', 'd9d9d9d9-6666-0000-0000-000000000000/v.mp4')$$,
  'members cannot post videos');
insert into posts (author_id, body) values ('d9d9d9d9-6666-0000-0000-000000000000', 'member text');
select t.expect_error($$update posts set video_path = 'd9d9d9d9-6666-0000-0000-000000000000/v.mp4' where body = 'member text'$$,
  'members cannot add a video by editing');
select t.check((select count(*) from posts where body = 'member text') = 1, 'members can still post text');
reset role;
select set_config('request.jwt.claims', '', false);
\echo 'post video tests: all checks passed'
