-- Tests for private profiles: only connections see a private creator's work.
\set P '''a7a7a7a7-2222-0000-0000-000000000000'''
\set F '''b7b7b7b7-2222-0000-0000-000000000000'''
\set S '''c7c7c7c7-2222-0000-0000-000000000000'''
insert into auth.users (id) values (:P), (:F), (:S);
insert into creator_profiles (user_id, handle, display_name, is_listed, is_private) values
  (:P, 'pv_private', 'Private', true, true),
  (:F, 'pv_friend', 'Friend', true, false),
  (:S, 'pv_stranger', 'Stranger', true, false);
insert into connections (from_user, to_user, status, responded_at) values (:F, :P, 'accepted', now());
insert into posts (author_id, body) values (:P, 'private post');
insert into profile_videos (user_id, platform, url, external_id, position)
  values (:P, 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 1);
insert into platform_accounts (user_id, platform, handle, url, source)
  values (:P, 'instagram', 'privateig', 'https://www.instagram.com/privateig', 'self_reported');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"c7c7c7c7-2222-0000-0000-000000000000","role":"authenticated"}', false);
select t.check(exists (select 1 from creator_profiles where handle = 'pv_private'), 'a stranger still sees the private profile itself');
select t.check(not exists (select 1 from posts where author_id = 'a7a7a7a7-2222-0000-0000-000000000000'), 'a stranger cannot see private posts');
select t.check(not exists (select 1 from profile_videos where user_id = 'a7a7a7a7-2222-0000-0000-000000000000'), 'a stranger cannot see private videos');
select t.check(not exists (select 1 from public_platform_accounts where user_id = 'a7a7a7a7-2222-0000-0000-000000000000'), 'a stranger cannot see private channels');

select set_config('request.jwt.claims', '{"sub":"b7b7b7b7-2222-0000-0000-000000000000","role":"authenticated"}', false);
select t.check(exists (select 1 from posts where author_id = 'a7a7a7a7-2222-0000-0000-000000000000'), 'a connection sees private posts');
select t.check(exists (select 1 from profile_videos where user_id = 'a7a7a7a7-2222-0000-0000-000000000000'), 'a connection sees private videos');
select t.check(exists (select 1 from public_platform_accounts where user_id = 'a7a7a7a7-2222-0000-0000-000000000000'), 'a connection sees private channels');

select set_config('request.jwt.claims', '{"sub":"a7a7a7a7-2222-0000-0000-000000000000","role":"authenticated"}', false);
select t.check(exists (select 1 from posts where author_id = 'a7a7a7a7-2222-0000-0000-000000000000'), 'the owner sees their own posts');
reset role;

-- A private creator who taps Interested on a stranger's collab shows that author their work.
insert into collab_posts (id, author_id, title, description) values
  ('d7d7d7d7-2222-0000-0000-000000000000', :S, 'Food reel this Sunday', 'Need an editor');
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"c7c7c7c7-2222-0000-0000-000000000000","role":"authenticated"}', false);
select t.check(not can_see_work('a7a7a7a7-2222-0000-0000-000000000000'), 'before applying, the collab author cannot see private work');
reset role;
insert into collab_interests (post_id, user_id) values ('d7d7d7d7-2222-0000-0000-000000000000', :P);
set role authenticated;
select t.check(can_see_work('a7a7a7a7-2222-0000-0000-000000000000'), 'after applying, the collab author can see private work');
select t.check(exists (select 1 from posts where author_id = 'a7a7a7a7-2222-0000-0000-000000000000'), 'the collab author sees the applicant''s posts');
select t.check(exists (select 1 from public_platform_accounts where user_id = 'a7a7a7a7-2222-0000-0000-000000000000'), 'the collab author sees the applicant''s channels');
reset role;
select set_config('request.jwt.claims', '', false);
\echo 'private profile tests: all checks passed'
