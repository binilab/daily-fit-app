-- Restore minimal table grants for Daily Fit app tables used by Expo client.
-- RLS remains enabled and is enforced by existing policies.

grant usage on schema public to anon, authenticated;

-- Reset overly broad/incorrect grants and re-apply least privilege.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.posts from anon, authenticated;
revoke all on table public.user_blocks from anon, authenticated;
revoke all on table public.post_votes from anon, authenticated;
revoke all on table public.post_comments from anon, authenticated;

-- Expo app flow is authenticated-only for DB reads/writes.
grant select, insert, update on table public.profiles to authenticated;
grant select, insert on table public.posts to authenticated;
grant select, insert, delete on table public.user_blocks to authenticated;
grant select, insert, update on table public.post_votes to authenticated;
grant select, insert, delete on table public.post_comments to authenticated;

-- Keep RPC executable for signed-in users.
grant execute on function public.delete_my_account() to authenticated;
