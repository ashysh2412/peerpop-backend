-- Tests for milestone 3: avatar folders and reordering videos.
\set A '''a1a1a1a1-0000-0000-0000-000000000000'''
\set B '''b1b1b1b1-0000-0000-0000-000000000000'''
insert into auth.users (id) values (:A), (:B);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1a1a1a1-0000-0000-0000-000000000000"}', false);
insert into creator_profiles (user_id, handle, display_name) values (:A, 'media_a', 'A');
insert into storage.objects (bucket_id, name) values ('avatars', 'a1a1a1a1-0000-0000-0000-000000000000/1.jpg');
select t.expect_error(
  $$insert into storage.objects (bucket_id, name) values ('avatars', 'b1b1b1b1-0000-0000-0000-000000000000/1.jpg')$$,
  'A uploads into B''s avatar folder');

insert into profile_videos (user_id, platform, url, external_id, position)
  select :A, 'youtube', 'https://youtu.be/m' || n, 'm' || n, n from generate_series(1, 4) n;
select move_profile_video((select id from profile_videos where external_id = 'm4'), 1::smallint);
select t.check(
  (select string_agg(external_id, ',' order by position) from profile_videos where user_id = :A) = 'm4,m1,m2,m3',
  'moving video 4 to the top shifts the rest down');
select move_profile_video((select id from profile_videos where external_id = 'm4'), 9::smallint);
select t.check(
  (select string_agg(external_id, ',' order by position) from profile_videos where user_id = :A) = 'm1,m2,m3,m4',
  'moving past the end lands in the last slot');

select set_config('request.jwt.claims', '{"sub":"b1b1b1b1-0000-0000-0000-000000000000"}', false);
select t.expect_error(
  $$select move_profile_video((select id from profile_videos where external_id = 'm1'), 2::smallint)$$,
  'B reorders A''s videos');

reset role;
\echo 'profile media tests: all checks passed'
