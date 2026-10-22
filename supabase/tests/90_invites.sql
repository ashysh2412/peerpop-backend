-- App users can't see or change the invite list.
insert into invites (email, name) values ('friend@example.com', 'Friend');
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"a9a9a9a9-0000-0000-0000-000000000000"}', false);
select t.expect_error($$select * from invites$$, 'users cannot read the invite list');
select t.expect_error($$insert into invites (email) values ('x@example.com')$$, 'users cannot add invites');
reset role;
select t.expect_error($$insert into invites (email) values ('Upper@Example.com')$$, 'emails are stored lowercase');
select t.expect_error($$insert into invites (email) values ('not-an-email')$$, 'only real-looking emails');
\echo 'invites tests: all checks passed'
