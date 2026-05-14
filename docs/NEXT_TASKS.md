# Next Tasks

Last audited: 2026-05-14

These are ordered by safety. The first tasks should reduce uncertainty and protect the restored main flow before adding new product features.

## Safest Next 5 Tasks

1. Runtime smoke-test the restored main flow
2. Clean up and document Supabase policy/grant state
3. Add generated/read-only schema typing or a local DB contract document
4. Remove or quarantine stale entry-path confusion around `App.tsx`/`AuthGate`
5. Add minimal regression tests/check scripts for auth/feed/upload primitives

## 1. Runtime Smoke-Test the Restored Main Flow

Why first:

The code and database now align on paper, and TypeScript passes. The remaining highest-risk issues are runtime-only: OAuth redirect, native image picker/upload, RLS behavior under real authenticated JWTs, and storage public URL rendering.

Likely files involved:

- `app/index.tsx`
- `app/auth/callback.tsx`
- `app/(tabs)/home.tsx`
- `app/(tabs)/upload.tsx`
- `app/post/[postId].tsx`
- `app/(tabs)/profile.tsx`
- `src/features/auth/useAuthSession.ts`
- `src/features/upload/useOutfitUpload.ts`
- `src/features/feed/*`
- `src/features/profile/useMyProfile.ts`

How to test:

- Run `npm run start`.
- Open in the same runtime used during recovery, likely Expo Go unless a dev client is required.
- Sign in with Google.
- Confirm session survives app reload.
- Confirm profile tab loads without creating duplicate rows.
- Upload 1 image, then 3 images.
- Confirm uploaded post appears in home feed.
- Open post detail.
- Vote Like, then Pass, and confirm count/my-vote changes.
- Add a comment, delete own comment.
- Log out and log back in.
- Use a disposable account before testing account deletion.

Do not touch yet:

- Do not add new features during smoke testing.
- Do not change OAuth redirect code until exact failing platform/provider behavior is captured.
- Do not run schema migrations as part of this task.

## 2. Clean Up and Document Supabase Policy/Grant State

Why:

The connected DB has duplicate `user_blocks` policies. It is not an immediate blocker, but policy drift is a security and debugging risk.

Likely files involved:

- `supabase/migrations/20260514093000_recover_core_schema.sql`
- `supabase/migrations/20260514102000_restore_app_table_grants.sql`
- New future migration only after approval
- `docs/KNOWN_ISSUES.md`

How to test:

- Before any migration, run read-only policy queries and capture current policies.
- Design a migration that only removes duplicate/legacy policies if confirmed safe.
- Test with two users: blocker and blocked.
- Confirm blocker can read own block rows.
- Confirm blocked user's visibility is intentionally allowed or denied based on product decision.
- Confirm home feed and comments still filter using blocker rows.

Do not touch yet:

- Do not change RLS until product behavior for blocked users is decided.
- Do not broaden table grants.
- Do not weaken storage policies.

## 3. Add Schema Typing or DB Contract

Why:

The app uses raw string table/column names. TypeScript passed today, but schema drift would not be caught at compile time.

Likely files involved:

- `src/lib/supabase.ts`
- New `src/types/database.ts` or equivalent
- Possibly feature hooks under `src/features/*`
- Docs if choosing contract documentation before code changes

How to test:

- Generate types from Supabase when approved.
- Type `createClient<Database>()`.
- Replace ad-hoc row casts gradually.
- Run `npx tsc --noEmit`.
- Run the same smoke tests from task 1.

Do not touch yet:

- Do not refactor all hooks at once.
- Do not change table names or env variable names during typing.

## 4. Resolve `App.tsx` / Expo Router Entry Confusion

Why:

`package.json` uses `expo-router/entry`, so the active app path is `app/_layout.tsx` plus route files. `App.tsx` renders a separate `AuthGate` flow and its own `QueryClientProvider`, which can confuse future work.

Likely files involved:

- `App.tsx`
- `src/features/auth/AuthGate.tsx`
- `src/providers/AppProviders.tsx`
- `package.json`
- `index.ts`

How to test:

- Confirm runtime entry with Expo Router.
- Decide whether to delete, rename, or explicitly mark `App.tsx`/`AuthGate` as legacy.
- Run `npx tsc --noEmit`.
- Run `npm run start` and confirm routes load normally.

Do not touch yet:

- Do not remove files until the entry path is verified in runtime.
- Do not change `package.json` main unless intentionally leaving Expo Router.

## 5. Add Minimal Regression Checks

Why:

The restored app has no tests. A small set of checks would prevent repeating SDK/Supabase recovery regressions.

Likely files involved:

- `package.json`
- `src/features/auth/toAuthErrorMessage.ts`
- Feature hooks after test tooling is selected
- Possible new test files

How to test:

- Start with `npx tsc --noEmit` as a documented required check.
- Add a script only after package/tooling decisions are approved.
- Prioritize pure function tests first, then integration tests around Supabase with mocks.

Do not touch yet:

- Do not install test packages until package installation is approved.
- Do not introduce complex E2E tooling before the main runtime flow is stable.

## What Should Not Be Touched Yet

- New feature development such as bookmarks, notifications, ranking, explore, profile editing.
- Broad design overhaul.
- Storage privacy model.
- Account deletion semantics.
- RLS changes without a written policy matrix and two-user test plan.
- Dependency upgrades beyond the restored SDK-compatible set.
