-- App users can't see or change Peerpop's Instagram queue or token.
insert into ig_posts (idea_key, kind, headline, caption) values ('tip:test', 'tip', 'Hello', 'Hello world');
insert into ig_account (ig_user_id, access_token, expires_at) values ('1', 'secret-token', now() + interval '60 days');
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"a8a8a8a8-0000-0000-0000-000000000000"}', false);
select t.expect_error($$select * from ig_account$$, 'users cannot read the Instagram token');
select t.expect_error($$select * from ig_posts$$, 'users cannot read the Instagram queue');
select t.expect_error($$update ig_posts set status = 'approved'$$, 'users cannot approve posts');
reset role;
select t.expect_error($$insert into ig_account (id, ig_user_id, access_token, expires_at) values (2, '2', 'x', now())$$, 'there is only one connected account');
select t.expect_error($$update ig_account set auto_post = null$$, 'auto_post is never empty');
do $$ begin assert (select auto_post = false from ig_account where id = 1), 'auto-post starts off'; end $$;
\echo 'instagram tests: all checks passed'
