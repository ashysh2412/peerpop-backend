-- Tests for keeping a deleted account's data for 180 days, and Drive/Vimeo videos.
\set U '''a8a8a8a8-3333-0000-0000-000000000000'''
\set O '''b8b8b8b8-3333-0000-0000-000000000000'''
insert into auth.users (id, email) values (:U, 'gone@example.com'), (:O, 'other@example.com');
insert into creator_profiles (user_id, handle, display_name, is_listed) values
  (:U, 'rt_gone', 'Gone', true), (:O, 'rt_other', 'Other', true);
insert into connections (from_user, to_user, status, responded_at) values (:U, :O, 'accepted', now());
insert into messages (sender_id, recipient_id, body) values (:U, :O, 'hello there');
insert into posts (author_id, body) values (:U, 'my post');
insert into profile_videos (user_id, platform, url, external_id, position)
  values (:U, 'drive', 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view', '1AbCdEfGhIjKlMnOpQrStUvWxYz012345', 1),
         (:U, 'vimeo', 'https://vimeo.com/76979871', '76979871', 2);
select t.check((select count(*) from profile_videos where user_id = :U) = 2, 'Drive and Vimeo videos can be pinned');

delete from auth.users where id = :U;
select t.check(not exists (select 1 from creator_profiles where user_id = :U), 'the profile is gone from the app');
select t.check(not exists (select 1 from messages where sender_id = :U), 'their messages are gone from the app');
select t.check((select count(*) from deleted_account_archive where user_id = :U) = 1, 'the account is archived');
select t.check((select email from deleted_account_archive where user_id = :U) = 'gone@example.com', 'the archive keeps the email');
select t.check((select jsonb_array_length(data->'messages') from deleted_account_archive where user_id = :U) = 1, 'the archive keeps messages');
select t.check((select jsonb_array_length(data->'posts') from deleted_account_archive where user_id = :U) = 1, 'the archive keeps posts');
select t.check((select data->'profile'->>'handle' from deleted_account_archive where user_id = :U) = 'rt_gone', 'the archive keeps the profile');
select t.check((select purge_after::date from deleted_account_archive where user_id = :U) = (now() + interval '180 days')::date, 'kept for 180 days');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"b8b8b8b8-3333-0000-0000-000000000000","role":"authenticated"}', false);
select t.expect_error($$select * from deleted_account_archive$$, 'nobody signed in can read the archive');
select t.expect_error($$select purge_deleted_accounts()$$, 'nobody signed in can purge the archive');
reset role;
select set_config('request.jwt.claims', '', false);

update deleted_account_archive set purge_after = now() - interval '1 day' where user_id = :U;
select t.check(purge_deleted_accounts() = 1, 'the daily job removes archives past 180 days');
select t.check(not exists (select 1 from deleted_account_archive where user_id = :U), 'the old archive is gone');
\echo 'retention tests: all checks passed'
