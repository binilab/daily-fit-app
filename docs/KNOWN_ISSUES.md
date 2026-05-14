# Known Issues

Last audited: 2026-05-14

## High Priority

### Runtime OAuth Is Not Yet Verified

The code implements Google and Apple OAuth through Supabase, `expo-auth-session`, and `expo-web-browser`, but redirect behavior depends on runtime, platform, Supabase provider settings, and configured redirect URLs.

Impact:

- Login may fail on device/simulator even though TypeScript passes.
- `/auth/callback` may not receive the expected code/token payload.

Suggested verification:

- Test Google login on the exact Expo Go/dev-client target.
- Test cold app start, warm app return, cancel, and retry.
- Confirm `dailyfit://auth/callback` or the generated redirect URI is allowed in Supabase provider settings.

### Supabase `user_blocks` RLS Policy Drift

The connected database contains both current recovery policies and older/legacy named policies for `user_blocks`:

- `user_blocks_select_own`
- `user_blocks_insert_own`
- `user_blocks_delete_own`
- `Users can read related blocks`
- `Users can create own blocks`
- `Users can delete own blocks`

The broad select policy allows rows where `auth.uid() = blocker_id OR auth.uid() = blocked_id`, while the current migration intent appears to be `auth.uid() = blocker_id`.

Impact:

- A blocked user may be able to infer they were blocked if there is UI/API access later.
- Duplicate policies make permission debugging harder.

Suggested resolution:

- Decide intended product behavior for blocked users.
- Create a dedicated cleanup migration only after approval.
- Test with two authenticated users.

## Medium Priority

### No Email/Password Auth

The app has social OAuth buttons only. There is no `signUp`, `signInWithPassword`, password reset, or email verification flow.

Impact:

- Users without Google/Apple cannot use the app.
- The requested email signup/login feature is not implemented.

### User Blocks Have No UI

The app filters feed/detail/comments using `user_blocks`, but there is no block/unblock screen or action.

Impact:

- The feature cannot be exercised by normal users.
- Existing rows can affect feed visibility with no in-app explanation.

### Stale `App.tsx` / `AuthGate` Path

`package.json` points to `expo-router/entry`, so the active app is routed through `app/_layout.tsx`. `App.tsx` and `src/features/auth/AuthGate.tsx` still define a separate auth shell.

Impact:

- Future work may accidentally edit inactive UI.
- There are two different QueryClientProvider setups.

Suggested resolution:

- Confirm active runtime entry.
- Remove, rename, or explicitly document the legacy path.

### Post Upload Does Not Invalidate Home Feed

After upload success, the upload screen clears local images and shows a success message, but it does not invalidate the home feed query or navigate to the new post.

Impact:

- The new post may not appear on home until refetch/navigation/restart.

Suggested resolution:

- Invalidate `['feed', 'home']` after successful upload or navigate to `/post/[postId]`.

### Profile Type Includes `email`, Schema Does Not

`MyProfile` includes optional `email`, but the connected `profiles` table does not have an `email` column.

Impact:

- Not currently blocking because app falls back to `session.user.email` and does not require `profiles.email`.
- Could cause confusion during profile feature work.

## Low Priority / Product Gaps

### No Bookmarks

No code or schema for bookmarks was found.

### No Notifications

No code or schema for notifications was found.

### No Ranking or Explore Screen

The app has Home, Upload, and Profile tabs only.

### Feed Has No Pagination

Home feed fetches latest 60 posts in one query.

Impact:

- Acceptable for small data, but will degrade as content grows.

### Comments Have No Pagination or Realtime Updates

Comments are loaded by post and ordered newest first.

Impact:

- Large comment threads may become slow.
- Users do not see new comments without refetch.

### No Author Joins / Public Profile UI

Feed, detail, and comments display user IDs, not display names or avatars.

Impact:

- Current UI is technically functional but not product-ready.

### No Automated Tests

Only manual checks and TypeScript are available.

Impact:

- Restored flows can regress unnoticed.

## Current Verification Status

Passed:

- `npx tsc --noEmit`
- Supabase MCP schema inspection found required tables, bucket, RPC, grants, and policies for current app usage.

Not yet verified in this audit:

- Device/simulator OAuth login.
- Actual image upload from media library.
- End-to-end post create, detail, vote, comment flow.
- Account deletion with a disposable user.
