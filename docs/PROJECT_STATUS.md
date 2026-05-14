# Project Status

Last audited: 2026-05-14

Scope: static code inspection, existing README/migrations, `npx tsc --noEmit`, and Supabase MCP read-only schema inspection. No app code, packages, or migrations were changed.

## Executive Summary

DailyFit is an Expo Router + Supabase mobile app focused on social outfit posting. The main authenticated flow is present: social OAuth, persisted Supabase session, profile bootstrap, home feed, outfit upload, post detail, like/pass voting, and comments.

The app and connected Supabase project are broadly aligned for the current implemented flow. TypeScript currently passes with `npx tsc --noEmit`. Supabase has the tables, bucket, grants, RLS policies, and RPC the app expects.

Main caution areas before feature work:

- OAuth behavior must be tested on actual Expo Go/dev client targets because redirect handling is runtime-sensitive.
- `user_blocks` has duplicate/legacy RLS policies in the connected database, including a broader select policy than the current migration intent.
- There is no UI to create/delete blocks, even though read-time filtering exists.
- Email/password signup/login is not implemented.
- The app has an obsolete-looking `App.tsx` auth gate path alongside the active Expo Router entry path.
- No automated tests exist beyond TypeScript checking.

## Project Structure

```txt
app/
  _layout.tsx
  index.tsx
  (tabs)/
    _layout.tsx
    home.tsx
    upload.tsx
    profile.tsx
  auth/
    callback.tsx
  post/
    [postId].tsx
src/
  components/common/
  design/tokens/
  features/auth/
  features/feed/
  features/profile/
  features/upload/
  hooks/
  lib/
  providers/
  utils/
supabase/migrations/
assets/
```

Root-level `components/`, `features/`, `lib/`, `hooks/`, `types/`, and `constants/` directories do not exist. Their equivalents live under `src/`.

`docs/` did not exist before this audit.

## Tech Stack

Package declarations from `package.json`:

- Expo SDK: `~54.0.0`
- React Native: `0.81.5`
- React: `19.1.0`
- Expo Router: `~6.0.23`
- Supabase client: `^2.98.0`
- TanStack Query: `^5.90.21`
- TypeScript: `~5.9.2`

Installed package-lock versions observed:

- `expo`: `54.0.34`
- `react-native`: `0.81.5`
- `expo-router`: `6.0.23`
- `@supabase/supabase-js`: `2.105.4`
- `@tanstack/react-query`: `5.100.10`

Important native/runtime packages:

- `@react-native-async-storage/async-storage`: Supabase session persistence
- `expo-auth-session`: OAuth redirect URI and auth session handling
- `expo-web-browser`: OAuth browser session
- `expo-linking`: OAuth callback parsing
- `expo-image`: image display
- `expo-image-picker`: local media selection
- `expo-image-manipulator`: upload image compression
- `expo-haptics`: voting/comment feedback
- `react-native-reanimated`: post detail swipe animations
- `react-native-safe-area-context`, `react-native-screens`, `react-native-worklets`
- `react-native-url-polyfill`: URL support for Supabase in RN

State management approach:

- Local component state with React `useState`.
- Server/auth state through TanStack Query.
- No Redux/Zustand/Jotai/Recoil or custom global client-state store found.

Query/data fetching approach:

- TanStack Query `useQuery`, `useMutation`, `useQueryClient` in feature hooks.
- Supabase JS client direct calls from feature hooks.
- Query keys are feature-specific arrays, e.g. `['auth', 'session']`, `['feed', 'home', viewerId]`.

Styling approach:

- React Native `StyleSheet`.
- Shared design tokens under `src/design/tokens` for colors, spacing, radius, shadows, typography.
- Common UI primitives under `src/components/common`.

## App Routing

Active entry is `expo-router/entry` from `package.json`.

Routes:

- `/`: unauthenticated auth entry screen.
- `/(tabs)/home`: authenticated home feed.
- `/(tabs)/upload`: authenticated outfit upload.
- `/(tabs)/profile`: authenticated profile/account screen.
- `/post/[postId]`: authenticated post detail, voting, comments.
- `/auth/callback`: OAuth callback route.

`app/_layout.tsx` wraps routes in `AppProviders`. `App.tsx` also creates a `QueryClientProvider` and renders `AuthGate`, but with the current `main: expo-router/entry`, it appears to be legacy/not on the active route path.

## Implemented Features

### Working / Present in Code

- Google OAuth login flow is implemented through Supabase OAuth, `expo-auth-session`, and `expo-web-browser`.
- Apple OAuth login flow is implemented similarly.
- Auth session persistence is configured using AsyncStorage with `persistSession: true` and `autoRefreshToken: true`.
- Auth state changes update the TanStack Query session cache.
- Profile loading and bootstrap are implemented via `profiles.select('*').eq('id', userId).maybeSingle()` then `upsert({ id: userId })`.
- Home feed loads latest `posts`, limits to 60, and filters out authors in the viewer's block list.
- Post upload picks up to 3 images, compresses them to JPEG, uploads to `outfits`, creates a `posts` row.
- Post detail loads a single post, displays image carousel, metadata, vote summary, comments entry point.
- Like/Pass voting uses `post_votes.upsert(..., { onConflict: 'post_id,voter_id' })`.
- Comments list/create/delete are implemented with 300-character validation and own-comment delete check.
- Image storage is implemented through public `outfits` bucket paths under `${userId}/...`.
- Error/loading states use `AppScreenSkeleton` and `AppStateView` across main flows.
- Account delete calls `delete_my_account` RPC and signs out locally afterward.

### Partially Working / Present but Incomplete

- User blocks: database table and read-time filtering exist, but there is no UI/API flow in the app to create or remove blocks.
- Profile screen: shows basic display name/username/email/id and account actions, but no profile editing, avatar upload, public profile page, or user stats.
- Google login: implemented in code and app config includes an iOS reserved client ID, but must still be verified on target runtime with actual Supabase provider settings and redirect URLs.
- Apple login: implemented in code, but runtime behavior is unverified and platform requirements are stricter than Google.
- Home feed: works as a simple latest-post list, but has no pagination, pull-to-refresh indicator, author profile join, or ranking logic.
- Post upload: creates posts, but does not invalidate/refetch the home feed automatically after upload.
- Comments: functional basics exist, but no author display names, edit, report, moderation, pagination, or realtime updates.
- Likes: voting works as Like/Pass, but the UI label is voting rather than a conventional like/bookmark model.

### Broken or Unknown

- Runtime OAuth redirect behavior is unknown without device/simulator testing.
- Supabase provider configuration for Google/Apple is not verifiable from repo files alone.
- Storage upload success is unknown at runtime until a real image upload is tested.
- Account deletion RPC deletes from `auth.users` via security definer; actual behavior depends on Supabase permissions and should be tested carefully with a disposable account.
- `App.tsx`/`AuthGate` path may be stale because Expo Router is the active entry. It is not necessarily broken, but it can mislead future development.
- Connected DB has duplicate `user_blocks` policies; this is not blocking current reads, but it is a policy hygiene issue.

### Not Implemented Yet

- Email/password signup/login.
- Bookmark feature.
- Notifications feature.
- Ranking screen.
- Explore screen.
- User block/unblock UI.
- Post delete/edit UI.
- Profile edit/avatar UI.
- Author profile display in feed/detail/comments.
- Realtime comments/votes/notifications.
- Automated unit/integration/E2E tests.

## Supabase Integration Inventory

### `supabase.from(...)`

- `profiles`
  - `select('*').eq('id', userId).maybeSingle()`
  - `upsert({ id: userId }, { onConflict: 'id' }).select('*').single()`
- `posts`
  - `select('id, author_id, image_urls, created_at').order('created_at', { ascending: false }).limit(60)`
  - `select('id, author_id, image_urls, created_at').eq('id', postId).maybeSingle()`
  - `insert({ author_id, image_paths, image_urls, image_count }).select('id').single()`
- `user_blocks`
  - `select('blocked_id').eq('blocker_id', viewerId)` in home feed, post detail, comments
- `post_votes`
  - `select('voter_id, vote_type').eq('post_id', postId)`
  - `upsert({ post_id, voter_id, vote_type }, { onConflict: 'post_id,voter_id' })`
- `post_comments`
  - `select('id, post_id, author_id, content, created_at').eq('post_id', postId).order('created_at', { ascending: false })`
  - `insert({ post_id, author_id, content })`
  - `delete().eq('id', commentId).eq('author_id', viewerId)`

### `supabase.storage.from(...)`

- Bucket: `outfits` by default, configurable via `EXPO_PUBLIC_SUPABASE_OUTFIT_BUCKET`.
- Upload path: `${userId}/${Date.now()}-${index}.jpg`.
- Upload content type: `image/jpeg`.
- Public URL is stored in `posts.image_urls`.

### `supabase.rpc(...)`

- `delete_my_account` only.

## Connected Supabase Schema Snapshot

MCP read-only inspection found these public tables:

- `profiles`: RLS enabled, 1 row
- `posts`: RLS enabled, 1 row
- `user_blocks`: RLS enabled, 0 rows
- `post_votes`: RLS enabled, 1 row
- `post_comments`: RLS enabled, 1 row

Storage:

- Bucket `outfits`: public, 5 MB file limit, allowed MIME types `image/jpeg`, `image/png`, `image/webp`

Functions:

- `delete_my_account() returns void`, security definer
- `set_profiles_updated_at() returns trigger`
- `set_post_votes_updated_at() returns trigger`

Migration records in the connected Supabase project:

- `20260514120707_recover_core_schema`
- `20260514122548_restore_app_table_grants`

Note: local migration filenames differ from applied versions because the project was recreated/recovered.

## Code vs Database Alignment

Aligned:

- All app-used public tables exist.
- Columns selected/inserted by app exist.
- `posts.image_count` constraints match app limit of 1 to 3 images.
- `post_votes` has unique `(post_id, voter_id)`, matching app upsert conflict target.
- `post_comments.content` DB check matches app validation of 1 to 300 trimmed characters.
- `outfits` bucket exists and accepts app-uploaded JPEG.
- Storage policy allows authenticated users to insert into their own UID folder, matching app path format.
- Authenticated grants exist for app table operations.

Mismatches / Cautions:

- `user_blocks` has duplicate policy sets in the connected DB. In addition to current `user_blocks_select_own`, there is a broader legacy policy `Users can read related blocks` allowing users to read rows where they are either blocker or blocked.
- Local historical migrations include older files not recorded as applied in the new Supabase project. The effective applied schema comes from the recovery migrations, not the full local migration sequence.
- `profiles` type in app includes optional `email`, but the connected `profiles` table has no `email` column. Current code uses `select('*')` and does not require `profiles.email`, so this is not a runtime blocker.
- App has no generated Supabase TypeScript database types, so schema drift will not be caught at compile time.
- Public storage URLs are stored permanently in `posts.image_urls`; if bucket privacy changes later, existing app rendering would break.

## Verification Run

- `npx tsc --noEmit`: passed.

No package installation, app code edits, or migrations were run.
