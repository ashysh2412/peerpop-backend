-- Tests for posts with several photos.
\set M '''a9a9a9a9-5555-0000-0000-000000000000'''
\set N '''b9b9b9b9-5555-0000-0000-000000000000'''
insert into auth.users (id) values (:M), (:N);
insert into creator_profiles (user_id, handle, display_name, is_listed) values (:M, 'mp_me', 'Me', true), (:N, 'mp_other', 'Other', true);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"a9a9a9a9-5555-0000-0000-000000000000","role":"authenticated"}', false);
insert into posts (author_id, body, image_path, more_images) values
  ('a9a9a9a9-5555-0000-0000-000000000000', 'three photos', 'a9a9a9a9-5555-0000-0000-000000000000/1.jpg',
   '{a9a9a9a9-5555-0000-0000-000000000000/2.jpg,a9a9a9a9-5555-0000-0000-000000000000/3.jpg}');
select t.check((select cardinality(more_images) from posts where body = 'three photos') = 2, 'a post can hold several photos, in order');
select t.check((select more_images[1] from posts where body = 'three photos') = 'a9a9a9a9-5555-0000-0000-000000000000/2.jpg', 'extra photos keep their order');
select t.expect_error($$insert into posts (author_id, body, image_path, more_images) values ('a9a9a9a9-5555-0000-0000-000000000000', 'x', 'a9a9a9a9-5555-0000-0000-000000000000/1.jpg', '{b9b9b9b9-5555-0000-0000-000000000000/p.jpg}')$$,
  'extra photos must be in your own folder');
select t.expect_error($$insert into posts (author_id, body, more_images) values ('a9a9a9a9-5555-0000-0000-000000000000', 'x', '{a9a9a9a9-5555-0000-0000-000000000000/p.jpg}')$$,
  'extra photos need a first photo');
select t.expect_error($$insert into posts (author_id, body, image_path, more_images) select 'a9a9a9a9-5555-0000-0000-000000000000', 'x', 'a9a9a9a9-5555-0000-0000-000000000000/1.jpg', array_agg('a9a9a9a9-5555-0000-0000-000000000000/' || g || '.jpg') from generate_series(1, 10) g$$,
  'at most 10 photos in a post');
select t.check((select count(*) from get_feed() where body = 'three photos') = 1, 'multi-photo posts still show in the feed');
reset role;
select set_config('request.jwt.claims', '', false);
\echo 'multi-photo tests: all checks passed'
