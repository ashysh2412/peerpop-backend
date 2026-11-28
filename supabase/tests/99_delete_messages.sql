-- Tests for "Delete for everyone": only the sender, only within 1 hour, original kept for admin.
\set A '''3a3a3a3a-0000-0000-0000-000000000000'''
\set B '''3b3b3b3b-0000-0000-0000-000000000000'''
insert into auth.users (id) values (:A), (:B);
insert into creator_profiles (user_id, handle, display_name) values (:A, 'dm_a', 'A'), (:B, 'dm_b', 'B');
insert into messages (id, sender_id, recipient_id, body) values
  ('3c3c3c3c-0000-0000-0000-000000000001', :A, :B, 'oops wrong chat'),
  ('3c3c3c3c-0000-0000-0000-000000000002', :A, :B, 'old message');
update messages set created_at = now() - interval '2 hours' where id = '3c3c3c3c-0000-0000-0000-000000000002';

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"3b3b3b3b-0000-0000-0000-000000000000"}', false);
select t.check(not delete_message('3c3c3c3c-0000-0000-0000-000000000001'), 'the other person cannot delete my message');
select set_config('request.jwt.claims', '{"sub":"3a3a3a3a-0000-0000-0000-000000000000"}', false);
select t.check(not delete_message('3c3c3c3c-0000-0000-0000-000000000002'), 'messages older than 1 hour cannot be deleted');
select t.check(delete_message('3c3c3c3c-0000-0000-0000-000000000001'), 'sender deletes within 1 hour');
select t.check((select body = 'This message was deleted' and deleted_at is not null and read_at is not null from messages where id = '3c3c3c3c-0000-0000-0000-000000000001'), 'text is replaced and it no longer counts as unread');
select t.check(not delete_message('3c3c3c3c-0000-0000-0000-000000000001'), 'deleting twice does nothing');
select t.expect_error($$select * from deleted_messages$$, 'members cannot read deleted originals');
reset role;
select t.check((select body = 'oops wrong chat' from deleted_messages where message_id = '3c3c3c3c-0000-0000-0000-000000000001'), 'original text kept for the admin');
\echo 'delete messages tests: all checks passed'
