-- Tests for email settings and the email log.
\set U '''a9a9a9a9-4444-0000-0000-000000000000'''
\set O '''b9b9b9b9-4444-0000-0000-000000000000'''
insert into auth.users (id, email) values (:U, 'me@example.com'), (:O, 'other@example.com');
insert into creator_profiles (user_id, handle, display_name) values (:U, 'em_me', 'Me'), (:O, 'em_other', 'Other');
insert into email_settings (user_id) values (:O);
select t.check((select messages and network and collabs and digest from email_settings where user_id = :O), 'every email is on by default');
select t.check((select unsub_token is not null from email_settings where user_id = :O), 'each member gets an unsubscribe token');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"a9a9a9a9-4444-0000-0000-000000000000","role":"authenticated"}', false);
insert into email_settings (user_id, messages) values ('a9a9a9a9-4444-0000-0000-000000000000', false);
select t.check((select not messages from email_settings where user_id = 'a9a9a9a9-4444-0000-0000-000000000000'), 'members can save their own settings');
select t.check((select count(*) from email_settings) = 1, 'members only see their own settings');
update email_settings set digest = false where user_id = 'b9b9b9b9-4444-0000-0000-000000000000';
select t.expect_error($$insert into email_settings (user_id) values ('b9b9b9b9-4444-0000-0000-000000000000') on conflict (user_id) do update set messages = false$$, 'members cannot change someone else''s settings');
select t.expect_error($$select * from email_log$$, 'members cannot read the email log');
reset role;
select set_config('request.jwt.claims', '', false);
select t.check((select digest from email_settings where user_id = :O), 'another member''s settings were not changed');

insert into email_log (user_id, topic) values (:U, 'digest');
delete from auth.users where id = :U;
select t.check(not exists (select 1 from email_settings where user_id = :U), 'settings go when the account is deleted');
select t.check(not exists (select 1 from email_log where user_id = :U), 'the email log goes when the account is deleted');
\echo 'email settings tests: all checks passed'
