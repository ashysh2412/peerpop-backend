-- Tests for the feed: who sees which posts, likes, comments, notifications and limits.
\set A '''a4a4a4a4-0000-0000-0000-000000000000'''
\set B '''b4b4b4b4-0000-0000-0000-000000000000'''
\set C '''c4c4c4c4-0000-0000-0000-000000000000'''
\set D '''d4d4d4d4-0000-0000-0000-000000000000'''
\set E '''e4e4e4e4-0000-0000-0000-000000000000'''
update creator_profiles set is_listed = false;
insert into auth.users (id) values (:A), (:B), (:C), (:D), (:E);
-- A (Pune, food). B: A's connection in Mumbai. C: Pune, fitness. D: Delhi, tech, unrelated. E: unlisted, Pune.
insert into creator_profiles (user_id, handle, display_name, city_slug, niches, is_listed) values
  (:A, 'feed_a', 'A', 'pune', '{food}', true),
  (:B, 'feed_b', 'B', 'mumbai', '{tech}', true),
  (:C, 'feed_c', 'C', 'pune', '{fitness}', true),
  (:D, 'feed_d', 'D', 'delhi', '{tech}', true),
  (:E, 'feed_e', 'E', 'pune', '{food}', false);
insert into connections (from_user, to_user, status) values (:A, :B, 'accepted');

insert into posts (id, author_id, body, created_at) values
  ('a4000000-0000-0000-0000-000000000001', :A, 'A post', now() - interval '5 min'),
  ('b4000000-0000-0000-0000-000000000001', :B, 'B post', now() - interval '4 min'),
  ('c4000000-0000-0000-0000-000000000001', :C, 'C post', now() - interval '3 min'),
  ('d4000000-0000-0000-0000-000000000001', :D, 'D post', now() - interval '2 min'),
  ('e4000000-0000-0000-0000-000000000001', :E, 'E post', now() - interval '1 min');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"a4a4a4a4-0000-0000-0000-000000000000"}', false);

select t.check((select string_agg(body, ',') from get_feed()) = 'C post,B post,A post',
  'feed shows own, connections and same-city posts, newest first, never unlisted authors');
select t.check((select is_connection from get_feed() where author_id = :B), 'connection posts are marked');
select t.check((select string_agg(body, ',') from get_feed(p_before => now() - interval '3 min 30 sec')) = 'B post,A post',
  'older pages continue before a timestamp');
select t.check((select count(*) from get_feed(p_limit => 1)) = 1, 'limit works');
select t.check((select count(*) from posts where author_id = :E) = 0, 'posts by unlisted creators are hidden');
select t.check((select count(*) from posts where author_id = :D) = 1, 'any listed creator''s post can be opened directly');

-- Writing.
select t.expect_error($$insert into posts (author_id, body) values ('b4b4b4b4-0000-0000-0000-000000000000', 'fake')$$,
  'cannot post as someone else');
select t.expect_error($$insert into posts (author_id, body, image_path) values ('a4a4a4a4-0000-0000-0000-000000000000', 'x', 'b4b4b4b4-0000-0000-0000-000000000000/p.jpg')$$,
  'photo must be in your own folder');
select t.expect_error($$insert into posts (author_id, body, link_url) values ('a4a4a4a4-0000-0000-0000-000000000000', 'x', 'javascript:alert(1)')$$,
  'links must be http(s)');
update posts set body = 'hacked' where author_id = :B;
reset role;
select t.check((select body from posts where author_id = :B) = 'B post', 'cannot edit someone else''s post');
set role authenticated;
select t.expect_error($$update posts set author_id = 'b4b4b4b4-0000-0000-0000-000000000000' where author_id = 'a4a4a4a4-0000-0000-0000-000000000000'$$,
  'cannot move a post to another author');

-- Likes and comments notify the author once per like.
insert into post_likes (post_id, user_id) values ('b4000000-0000-0000-0000-000000000001', :A);
delete from post_likes where user_id = :A;
insert into post_likes (post_id, user_id) values ('b4000000-0000-0000-0000-000000000001', :A);
insert into post_comments (post_id, author_id, body) values ('b4000000-0000-0000-0000-000000000001', :A, 'Nice!');
insert into post_likes (post_id, user_id) values ('a4000000-0000-0000-0000-000000000001', :A);
select t.expect_error($$insert into post_likes (post_id, user_id) values ('c4000000-0000-0000-0000-000000000001', 'b4b4b4b4-0000-0000-0000-000000000000')$$,
  'cannot like as someone else');
select t.check((select like_count = 1 and comment_count = 1 and liked_by_me from get_feed() where author_id = :B),
  'feed counts likes and comments');
reset role;
select t.check((select count(*) from notifications where user_id = :B and kind = 'post_like') = 1,
  'unlike and like again notifies once');
select t.check((select count(*) from notifications where user_id = :B and kind = 'post_comment') = 1, 'comment notifies the author');
select t.check((select count(*) from notifications where user_id = :A and kind in ('post_like','post_comment')) = 0,
  'liking your own post notifies nobody');

-- The post author can remove a comment on their post; others can't.
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"c4c4c4c4-0000-0000-0000-000000000000"}', false);
delete from post_comments;
reset role;
select t.check((select count(*) from post_comments) = 1, 'a stranger cannot delete comments');
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"b4b4b4b4-0000-0000-0000-000000000000"}', false);
delete from post_comments where post_id = 'b4000000-0000-0000-0000-000000000001';
reset role;
select t.check((select count(*) from post_comments) = 0, 'the post author can delete comments on their post');

-- Blocking hides posts both ways and stops likes and comments.
insert into blocks (blocker_id, blocked_id) values (:C, :A);
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"a4a4a4a4-0000-0000-0000-000000000000"}', false);
select t.check((select count(*) from get_feed() where author_id = :C) = 0, 'blocked creator''s posts leave the feed');
select t.expect_error($$insert into post_comments (post_id, author_id, body) values ('c4000000-0000-0000-0000-000000000001', 'a4a4a4a4-0000-0000-0000-000000000000', 'hi')$$,
  'cannot comment across a block');
select t.expect_error($$insert into post_likes (post_id, user_id) values ('c4000000-0000-0000-0000-000000000001', 'a4a4a4a4-0000-0000-0000-000000000000')$$,
  'cannot like across a block');

-- Visitors can't read the feed function.
reset role;
set role anon;
select set_config('request.jwt.claims', '', false);
select t.expect_error($$select * from get_feed()$$, 'visitors cannot call get_feed');
select t.expect_error($$insert into posts (author_id, body) values ('a4a4a4a4-0000-0000-0000-000000000000', 'x')$$, 'visitors cannot post');

-- Daily limit.
reset role;
insert into posts (author_id, body) select :D, 'spam ' || g from generate_series(1, 19) g;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"d4d4d4d4-0000-0000-0000-000000000000"}', false);
select t.expect_error($$insert into posts (author_id, body) values ('d4d4d4d4-0000-0000-0000-000000000000', 'one too many')$$,
  'at most 20 posts a day');
reset role;
\echo 'feed tests: all checks passed'
