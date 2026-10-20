-- Tests for milestone 6: search filters, ordering and privacy.
\set A '''a3a3a3a3-0000-0000-0000-000000000000'''
\set B '''b3b3b3b3-0000-0000-0000-000000000000'''
\set C '''c3c3c3c3-0000-0000-0000-000000000000'''
\set D '''d3d3d3d3-0000-0000-0000-000000000000'''
-- Hide profiles left over from earlier test files so counts are exact.
update creator_profiles set is_listed = false;
insert into auth.users (id) values (:A), (:B), (:C), (:D);
insert into creator_profiles (user_id, handle, display_name, city_slug, niches, skills, languages, open_to_collab, is_listed) values
  (:A, 'search_a', 'A', 'pune', '{food,tech}', '{editor}', '{marathi}', true, true),
  (:B, 'search_b', 'B', 'pune', '{fitness}', '{anchor}', '{hindi,english}', false, true),
  (:C, 'search_c', 'C', null, '{food}', '{}', '{english}', true, true),
  (:D, 'search_d', 'D', 'pune', '{food}', '{}', '{}', true, false);

-- A: verified YouTube 120K (as the server would write it) and self-reported Instagram 30K.
insert into platform_accounts (id, user_id, platform, external_id, source, ownership_verified_at)
  values ('a3000000-0000-0000-0000-000000000001', :A, 'youtube', 'UCa', 'verified', now());
insert into account_stats (account_id, followers, avg_views_last10) values ('a3000000-0000-0000-0000-000000000001', 120000, 9000);
insert into platform_accounts (user_id, platform, handle, self_followers, self_avg_views) values (:A, 'instagram', '@a', 30000, 50000);
-- B: self-reported Instagram 45K. C: nothing linked.
insert into platform_accounts (user_id, platform, handle, self_followers, self_avg_views) values (:B, 'instagram', '@b', 45000, 70000);

set role anon;
select set_config('request.jwt.claims', '', false);

select t.check((select string_agg(handle, ',' order by handle) from search_creators()) = 'search_a,search_b,search_c',
  'unlisted profiles never appear');
select t.check((select string_agg(handle, ',') from search_creators()) = 'search_a,search_b,search_c',
  'verified creators come first, then the biggest audience, then unlinked');

select t.check((select r.max_followers = 120000 and r.max_followers_verified and r.avg_views = 9000 and r.avg_views_verified
  from search_creators() r where handle = 'search_a'), 'verified YouTube numbers win over self-reported');
select t.check((select not r.max_followers_verified and r.avg_views = 70000 and not r.avg_views_verified
  from search_creators() r where handle = 'search_b'), 'self-reported numbers are labelled as such');

select t.check((select count(*) from search_creators(p_city => 'pune')) = 2, 'city filter');
select t.check((select string_agg(handle, ',' order by handle) from search_creators(p_niches => '{food,fitness}')) = 'search_a,search_b,search_c',
  'niches match any of the chosen ones');
select t.check((select string_agg(handle, ',') from search_creators(p_skills => '{anchor}')) = 'search_b', 'skills filter');
select t.check((select string_agg(handle, ',' order by handle) from search_creators(p_langs => '{english}')) = 'search_b,search_c',
  'language filter');
select t.check((select string_agg(handle, ',') from search_creators(p_min => 10000, p_max => 50000)) = 'search_b',
  '10K-50K bucket uses the biggest audience');
select t.check((select string_agg(handle, ',') from search_creators(p_min => 50000, p_max => 200000)) = 'search_a', '50K-200K bucket');
select t.check((select count(*) from search_creators(p_max => 10000)) = 0, 'creators with no numbers never match a follower range');
select t.check((select string_agg(handle, ',' order by handle) from search_creators(p_collab => true)) = 'search_a,search_c',
  'open to collab filter');
select t.check((select string_agg(handle, ',') from search_creators(p_verified_only => true)) = 'search_a', 'verified only');
select t.check((select string_agg(handle, ',') from search_creators(p_sort => 'views')) = 'search_b,search_a,search_c',
  'sort by average views');
select t.check((select string_agg(handle || ':' || total_count, ',') from search_creators(p_limit => 1, p_offset => 1)) = 'search_b:3',
  'pages carry the total count');

-- Blocking hides creators from each other.
reset role;
insert into blocks (blocker_id, blocked_id) values (:B, :A);
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"a3a3a3a3-0000-0000-0000-000000000000"}', false);
select t.check((select string_agg(handle, ',' order by handle) from search_creators()) = 'search_a,search_c',
  'a blocked creator disappears from search');

select t.expect_error($$select verification_code from creator_search_rows$$, 'the search view has no private columns');

reset role;
\echo 'search tests: all checks passed'
