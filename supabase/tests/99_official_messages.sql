-- Tests for official messages: the Peerpop account can message anyone, members can reply, blocks still win.
\set O '''0f0f0f0f-0000-0000-0000-000000000000'''
\set M '''1d1d1d1d-0000-0000-0000-000000000000'''
\set N '''2d2d2d2d-0000-0000-0000-000000000000'''
insert into auth.users (id) values (:O), (:M), (:N);
insert into creator_profiles (user_id, handle, display_name) values (:O, 'om_official', 'Peerpop'), (:M, 'om_m', 'M'), (:N, 'om_n', 'N');
insert into official_accounts (user_id) values (:O);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"0f0f0f0f-0000-0000-0000-000000000000"}', false);
insert into messages (sender_id, recipient_id, body) values (:O, :M, 'Welcome! Add a photo?');
select set_config('request.jwt.claims', '{"sub":"1d1d1d1d-0000-0000-0000-000000000000"}', false);
insert into messages (sender_id, recipient_id, body) values (:M, :O, 'Done, thanks!');
select t.check((select count(*) from messages where sender_id in (:O, :M) and recipient_id in (:O, :M)) = 2, 'official and member can chat without connecting');
select t.expect_error($$insert into messages (sender_id, recipient_id, body) values ('1d1d1d1d-0000-0000-0000-000000000000', '2d2d2d2d-0000-0000-0000-000000000000', 'hi N')$$,
  'members still need a connection to message each other');
select t.check(not is_official(:M) and is_official(:O), 'is_official only for official accounts');
select t.expect_error($$insert into official_accounts (user_id) values ('1d1d1d1d-0000-0000-0000-000000000000')$$, 'members cannot make themselves official');

reset role;
insert into blocks (blocker_id, blocked_id) values (:N, :O);
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"0f0f0f0f-0000-0000-0000-000000000000"}', false);
select t.expect_error($$insert into messages (sender_id, recipient_id, body) values ('0f0f0f0f-0000-0000-0000-000000000000', '2d2d2d2d-0000-0000-0000-000000000000', 'hello?')$$,
  'a member who blocks Peerpop gets no messages from it');
reset role;
\echo 'official messages tests: all checks passed'
