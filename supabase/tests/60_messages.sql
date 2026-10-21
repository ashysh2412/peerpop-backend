-- Tests for messages: only connections can chat, nobody else can read, and the inbox adds up.
\set A '''a6a6a6a6-0000-0000-0000-000000000000'''
\set B '''b6b6b6b6-0000-0000-0000-000000000000'''
\set C '''c6c6c6c6-0000-0000-0000-000000000000'''
insert into auth.users (id) values (:A), (:B), (:C);
insert into creator_profiles (user_id, handle, display_name) values (:A, 'msg_a', 'A'), (:B, 'msg_b', 'B'), (:C, 'msg_c', 'C');
insert into connections (from_user, to_user, status) values (:A, :B, 'accepted'), (:A, :C, 'pending');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"a6a6a6a6-0000-0000-0000-000000000000"}', false);
insert into messages (sender_id, recipient_id, body) values (:A, :B, 'hi B');
select t.expect_error($$insert into messages (sender_id, recipient_id, body) values ('a6a6a6a6-0000-0000-0000-000000000000', 'c6c6c6c6-0000-0000-0000-000000000000', 'hi C')$$,
  'cannot message someone you are not connected to');
select t.expect_error($$insert into messages (sender_id, recipient_id, body) values ('b6b6b6b6-0000-0000-0000-000000000000', 'a6a6a6a6-0000-0000-0000-000000000000', 'fake')$$,
  'cannot send as someone else');
select t.expect_error($$update messages set body = 'edited'$$, 'messages cannot be edited');

select set_config('request.jwt.claims', '{"sub":"b6b6b6b6-0000-0000-0000-000000000000"}', false);
insert into messages (sender_id, recipient_id, body) values (:B, :A, 'hey A');
insert into messages (sender_id, recipient_id, body) values (:B, :A, 'you there?');
select t.check((select count(*) from messages) = 3, 'both people see the conversation');

select set_config('request.jwt.claims', '{"sub":"c6c6c6c6-0000-0000-0000-000000000000"}', false);
select t.check((select count(*) from messages) = 0, 'others cannot read it');
select t.check((select count(*) from get_inbox()) = 0, 'others have an empty inbox');

select set_config('request.jwt.claims', '{"sub":"a6a6a6a6-0000-0000-0000-000000000000"}', false);
select t.check((select unread = 2 and last_body = 'you there?' and not last_from_me and handle = 'msg_b' from get_inbox()),
  'the inbox shows the latest message and unread count');
select mark_messages_read(:B);
select t.check((select unread from get_inbox()) = 0, 'opening the chat marks it read');

-- Blocking ends the chat.
reset role;
insert into blocks (blocker_id, blocked_id) values (:B, :A);
set role authenticated;
select t.expect_error($$insert into messages (sender_id, recipient_id, body) values ('a6a6a6a6-0000-0000-0000-000000000000', 'b6b6b6b6-0000-0000-0000-000000000000', 'still?')$$,
  'cannot message someone who blocked you');
select t.check((select count(*) from get_inbox()) = 0, 'blocked chats leave the inbox');
reset role;
\echo 'message tests: all checks passed'
