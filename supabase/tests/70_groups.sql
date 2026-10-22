-- Tests for groups: joining, approvals, who sees posts, and admin powers.
\set A '''a7a7a7a7-0000-0000-0000-000000000000'''
\set B '''b7b7b7b7-0000-0000-0000-000000000000'''
\set C '''c7c7c7c7-0000-0000-0000-000000000000'''
insert into auth.users (id) values (:A), (:B), (:C);
insert into creator_profiles (user_id, handle, display_name, is_listed) values (:A, 'grp_a', 'A', true), (:B, 'grp_b', 'B', true), (:C, 'grp_c', 'C', true);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"a7a7a7a7-0000-0000-0000-000000000000"}', false);
insert into groups (slug, name, join_type, created_by) values ('pune-food', 'Pune food creators', 'open', :A);
insert into groups (slug, name, join_type, created_by) values ('secret-club', 'Secret club', 'approval', :A);
select t.check((select count(*) from group_members where user_id = :A and role = 'admin' and status = 'member') = 2,
  'the creator becomes admin of each group');
insert into posts (author_id, body, group_id) values (:A, 'welcome to food', (select id from groups where slug = 'pune-food'));
insert into posts (author_id, body, group_id) values (:A, 'welcome to secret', (select id from groups where slug = 'secret-club'));
select t.check((select count(*) from get_feed()) = 0, 'group posts stay out of the home feed');

select set_config('request.jwt.claims', '{"sub":"b7b7b7b7-0000-0000-0000-000000000000"}', false);
select t.check((select count(*) from get_groups()) = 2, 'everyone can browse groups');
select t.check((select count(*) from get_group_feed((select id from groups where slug = 'pune-food'))) = 1, 'open group posts are visible');
select t.check((select count(*) from get_group_feed((select id from groups where slug = 'secret-club'))) = 0, 'private group posts are hidden');
select t.expect_error($$insert into posts (author_id, body, group_id) values ('b7b7b7b7-0000-0000-0000-000000000000', 'hi', (select id from groups where slug = 'pune-food'))$$,
  'cannot post before joining');
insert into group_members (group_id, user_id, role, status) values ((select id from groups where slug = 'pune-food'), :B, 'admin', 'member');
select t.check((select role = 'member' and status = 'member' from group_members where user_id = :B), 'joining an open group is instant and never as admin');
insert into posts (author_id, body, group_id) values (:B, 'hello food', (select id from groups where slug = 'pune-food'));
insert into group_members (group_id, user_id) values ((select id from groups where slug = 'secret-club'), :B);
select t.check((select status from group_members where user_id = :B and group_id = (select id from groups where slug = 'secret-club')) = 'pending',
  'asking to join a private group waits for approval');
select t.expect_error($$select respond_group_request((select id from groups where slug = 'secret-club'), 'b7b7b7b7-0000-0000-0000-000000000000', true)$$,
  'cannot approve yourself');
update groups set name = 'mine now';
select t.check((select count(*) from groups where name = 'mine now') = 0, 'non-admins cannot edit a group');

select set_config('request.jwt.claims', '{"sub":"a7a7a7a7-0000-0000-0000-000000000000"}', false);
select t.check((select count(*) from notifications where user_id = :A and kind = 'group_request') = 1, 'admins hear about requests');
select respond_group_request((select id from groups where slug = 'secret-club'), :B, true);
select t.expect_error($$delete from group_members where user_id = 'a7a7a7a7-0000-0000-0000-000000000000' and group_id = (select id from groups where slug = 'secret-club')$$,
  'the last admin cannot leave while others remain');
update groups set about = 'For members' where slug = 'secret-club';

select set_config('request.jwt.claims', '{"sub":"b7b7b7b7-0000-0000-0000-000000000000"}', false);
select t.check((select count(*) from notifications where user_id = :B and kind = 'group_accepted') = 1, 'the person hears they were approved');
select t.check((select count(*) from get_group_feed((select id from groups where slug = 'secret-club'))) = 1, 'members see private posts');
insert into post_comments (post_id, author_id, body) values ((select id from posts where body = 'welcome to secret'), :B, 'members only chat');

select set_config('request.jwt.claims', '{"sub":"c7c7c7c7-0000-0000-0000-000000000000"}', false);
select t.check((select count(*) from group_members where group_id = (select id from groups where slug = 'secret-club')) = 0,
  'outsiders cannot list private group members');
select t.check((select count(*) from posts where group_id is not null) = 2, 'outsiders see only open group posts');
select t.check((select count(*) from post_comments where body = 'members only chat') = 0, 'outsiders cannot read comments on private group posts');
select t.expect_error($$insert into post_comments (post_id, author_id, body) values ((select id from posts where body = 'welcome to secret'), 'c7c7c7c7-0000-0000-0000-000000000000', 'hi')$$,
  'outsiders cannot comment on private group posts');
select t.expect_error($$insert into post_likes (post_id, user_id) values ((select id from posts where body = 'welcome to secret'), 'c7c7c7c7-0000-0000-0000-000000000000')$$,
  'outsiders cannot like private group posts');
select t.check((select name from get_group('secret-club')) = 'Secret club', 'a group opens by its link');

-- Admins can remove posts in their group.
select set_config('request.jwt.claims', '{"sub":"a7a7a7a7-0000-0000-0000-000000000000"}', false);
delete from posts where body = 'hello food';
select t.check((select count(*) from posts where body = 'hello food') = 0, 'admins can remove posts in their group');
delete from groups where slug = 'secret-club';
select t.check((select count(*) from groups where slug = 'secret-club') = 0, 'admins can delete their group');
reset role;
\echo 'group tests: all checks passed'
