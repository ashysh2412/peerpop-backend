-- Security tests for the initial schema. Each block fails loudly (and stops
-- the run) if a rule doesn't hold. Run with scripts/test-db.sh.

create schema t;
grant usage on schema t to anon, authenticated, service_role;

-- Runs `stmt` and raises if it succeeds.
create function t.expect_error(stmt text, label text) returns void
language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    return;
  end;
  raise exception 'FAIL (should have been rejected): %', label;
end $$;

create function t.check(ok boolean, label text) returns void
language plpgsql as $$
begin
  if ok is not true then
    raise exception 'FAIL: %', label;
  end if;
end $$;

grant execute on all functions in schema t to anon, authenticated, service_role;

-- Test users: A, B, C listed; D unlisted.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@test.dev'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@test.dev'),
  ('cccccccc-0000-0000-0000-000000000000', 'c@test.dev'),
  ('dddddddd-0000-0000-0000-000000000000', 'd@test.dev');

\set A '''aaaaaaaa-0000-0000-0000-000000000000'''
\set B '''bbbbbbbb-0000-0000-0000-000000000000'''
\set C '''cccccccc-0000-0000-0000-000000000000'''
\set D '''dddddddd-0000-0000-0000-000000000000'''

-- ---------------------------------------------------------------- profiles
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', false);
insert into creator_profiles (user_id, handle, display_name, city_slug, niches)
  values (:A, 'asha_cooks', 'Asha', 'pune', '{food}');
select t.expect_error(
  $$insert into creator_profiles (user_id, handle, display_name) values ('bbbbbbbb-0000-0000-0000-000000000000', 'fake_b', 'Fake')$$,
  'A creates a profile for B');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', false);
insert into creator_profiles (user_id, handle, display_name) values (:B, 'bharat_tech', 'Bharat');
insert into creator_contacts (user_id, contact_email) values (:B, 'bharat@example.com');

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', false);
insert into creator_profiles (user_id, handle, display_name) values (:C, 'chitra_films', 'Chitra');
insert into creator_contacts (user_id, contact_whatsapp) values (:C, '+919800000000');

select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000000","role":"authenticated"}', false);
insert into creator_profiles (user_id, handle, display_name, is_listed) values (:D, 'hidden_dev', 'Hidden', false);

-- Visitors see listed profiles only, and can't write.
reset role;
set role anon;
select set_config('request.jwt.claims', '', false);
select t.check((select count(*) from creator_profiles) = 3, 'anon sees exactly the 3 listed profiles');
select t.expect_error($$insert into creator_profiles (user_id, handle, display_name) values ('dddddddd-0000-0000-0000-000000000000', 'anon_x', 'X')$$,
  'anon inserts a profile');
select t.expect_error($$select * from creator_contacts$$, 'anon reads contacts');

-- A can't edit B's profile (RLS hides the row, so nothing changes).
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', false);
update creator_profiles set display_name = 'Hacked' where user_id = :B;
select t.check((select display_name from creator_profiles where user_id = :B) = 'Bharat', 'A cannot edit B''s profile');
select t.check((select count(*) from creator_contacts) = 0, 'A cannot read B''s contact row');

-- -------------------------------------------------------- verified stats
insert into platform_accounts (user_id, platform, handle, self_followers)
  values (:A, 'instagram', '@asha_cooks', 12000);
select t.check((select self_updated_at is not null from platform_accounts where user_id = :A and platform = 'instagram'),
  'self_updated_at is stamped');

select t.expect_error(
  $$insert into platform_accounts (user_id, platform, source) values ('aaaaaaaa-0000-0000-0000-000000000000', 'youtube', 'verified')$$,
  'A inserts an already-verified account');
insert into platform_accounts (user_id, platform, url) values (:A, 'youtube', 'https://youtube.com/@asha');
select t.expect_error(
  $$update platform_accounts set source = 'verified' where platform = 'youtube'$$,
  'A marks own YouTube as verified');
select t.expect_error(
  $$update platform_accounts set ownership_verified_at = now() where platform = 'youtube'$$,
  'A sets ownership_verified_at');
select t.expect_error(
  $$update platform_accounts set external_id = 'UC123' where platform = 'youtube'$$,
  'A sets the channel id');
select t.expect_error(
  $$insert into account_stats (account_id, followers) select id, 999999 from platform_accounts where platform = 'youtube'$$,
  'A writes account_stats');
select t.expect_error(
  $$insert into stat_snapshots (account_id, captured_on, followers) select id, current_date, 999999 from platform_accounts where platform = 'youtube'$$,
  'A writes stat_snapshots');

-- The server verifies the channel and writes stats.
reset role;
set role service_role;
update platform_accounts set source = 'verified', external_id = 'UCasha', ownership_verified_at = now(),
  verification_code = null
  where user_id = :A and platform = 'youtube';
insert into account_stats (account_id, followers) select id, 8400 from platform_accounts
  where user_id = :A and platform = 'youtube';

reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', false);
select t.expect_error(
  $$update platform_accounts set self_followers = 5000000 where platform = 'youtube'$$,
  'A edits a verified account');
select t.expect_error($$update account_stats set followers = 5000000$$, 'A updates account_stats');
select t.check((select followers from account_stats) = 8400, 'A cannot change verified follower count');

-- Others see only the public columns.
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', false);
select t.check((select count(*) from platform_accounts) = 0, 'B cannot read A''s raw platform rows');
select t.check((select count(*) from public_platform_accounts where user_id = :A) = 2, 'B sees A''s public platform rows');
select t.expect_error($$select verification_code from public_platform_accounts$$, 'public view exposes verification_code');

-- ---------------------------------------------------------------- videos
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', false);
insert into profile_videos (user_id, platform, url, external_id, position)
  select :A, 'youtube', 'https://youtu.be/v' || n, 'v' || n, n from generate_series(1, 6) n;
select t.expect_error(
  $$insert into profile_videos (user_id, platform, url, external_id, position) values ('aaaaaaaa-0000-0000-0000-000000000000', 'youtube', 'https://youtu.be/v7', 'v7', 7)$$,
  'A pins a 7th video');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', false);
select t.expect_error(
  $$insert into profile_videos (user_id, platform, url, external_id, position) values ('aaaaaaaa-0000-0000-0000-000000000000', 'youtube', 'https://youtu.be/x', 'x', 1)$$,
  'B adds a video to A''s profile');
delete from profile_videos where user_id = :A;
select t.check((select count(*) from profile_videos where user_id = :A) = 6, 'B cannot delete A''s videos');

-- ----------------------------------------------------------- connections
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', false);
select t.check((select count(*) from get_contact(:B)) = 0, 'A cannot see B''s contact before connecting');
insert into connections (from_user, to_user, message) values (:A, :B, 'Hi, let''s collab!');
select t.expect_error(
  $$insert into connections (from_user, to_user, status) values ('aaaaaaaa-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000000', 'accepted')$$,
  'A creates an already-accepted connection');
select t.expect_error(
  $$insert into connections (from_user, to_user) values ('bbbbbbbb-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000000')$$,
  'A sends a request on behalf of B');
update connections set status = 'accepted' where from_user = :A;
select t.check((select status from connections where from_user = :A) = 'pending', 'A cannot accept own request');

select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000000","role":"authenticated"}', false);
select t.expect_error(
  $$insert into connections (from_user, to_user) values ('dddddddd-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000')$$,
  'unlisted D sends a request');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', false);
select t.check((select count(*) from notifications where kind = 'connection_request') = 1, 'B is notified of the request');
select t.expect_error(
  $$insert into connections (from_user, to_user) values ('bbbbbbbb-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000')$$,
  'B sends a duplicate request back to A');
select t.expect_error($$update connections set message = 'edited' where to_user = 'bbbbbbbb-0000-0000-0000-000000000000'$$,
  'B edits the request message');
update connections set status = 'accepted' where to_user = :B;
select t.check((select responded_at is not null from connections where to_user = :B), 'responded_at is set');
select t.check((select count(*) from get_contact(:A)) = 0, 'A saved no contact details, so B gets none');
select t.expect_error($$update notifications set kind = 'collab_interest'$$, 'B rewrites a notification');
update notifications set read_at = now();

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', false);
select t.check((select contact_email from get_contact(:B)) = 'bharat@example.com', 'A sees B''s contact after connecting');
select t.check((select count(*) from my_connections) = 1, 'A has one connection');
select t.check((select count(*) from notifications where kind = 'connection_accepted') = 1, 'A is notified of acceptance');
select t.check((select count(*) from notifications where kind = 'connection_request') = 0, 'A cannot see B''s notifications');

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', false);
select t.check((select count(*) from get_contact(:B)) = 0, 'C (not connected) cannot see B''s contact');
select t.check((select count(*) from connections) = 0, 'C cannot see A and B''s connection');

-- -------------------------------------------------------------- collabs
insert into collab_posts (author_id, title, description, city_slug, roles_needed)
  values (:C, 'Need a Marathi anchor', 'Food series shoot in Kothrud', 'pune', '{anchor}');
select t.expect_error(
  $$insert into collab_interests (post_id, user_id) select id, 'cccccccc-0000-0000-0000-000000000000' from collab_posts$$,
  'C shows interest in own post');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', false);
insert into collab_interests (post_id, user_id, message) select id, :A, 'I can anchor!' from collab_posts;
update collab_interests set status = 'accepted';
select t.check((select status from collab_interests) = 'pending', 'A cannot accept own interest');
select t.check((select count(*) from get_contact(:C)) = 0, 'A cannot see C''s contact before acceptance');

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', false);
select t.check((select count(*) from notifications where kind = 'collab_interest') = 1, 'C is notified of interest');
update collab_interests set status = 'accepted';

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}', false);
select t.check((select contact_whatsapp from get_contact(:C)) = '+919800000000', 'A sees C''s contact after collab acceptance');
select t.check((select count(*) from mutual_connections(:C)) = 0, 'no mutual connections yet');

select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000000","role":"authenticated"}', false);
select t.check((select count(*) from collab_interests) = 0, 'D cannot see others'' collab interest');

-- --------------------------------------------------------------- blocks
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', false);
insert into connections (from_user, to_user) values (:C, :B);
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}', false);
insert into blocks (blocker_id, blocked_id) values (:B, :C);
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000000","role":"authenticated"}', false);
select t.check((select count(*) from connections) = 0, 'blocking cancels the pending request');
select t.check((select count(*) from creator_profiles where user_id = :B) = 0, 'C cannot see B after being blocked');
select t.expect_error(
  $$insert into connections (from_user, to_user) values ('cccccccc-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000')$$,
  'C sends a request to B after being blocked');

-- ---------------------------------------------------------------- reports
insert into reports (reporter_id, target_user, reason) values (:C, :B, 'test');
select t.expect_error($$select * from reports$$, 'C reads reports');

reset role;
\echo 'security tests: all checks passed'
