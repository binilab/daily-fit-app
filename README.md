# DailyFit

DailyFit는 오늘의 코디(OOTD)를 업로드하고, 피드/상세/투표/댓글로 소통하는 Expo 기반 모바일 앱입니다.

## Tech Stack

- Expo + React Native + TypeScript
- Expo Router
- TanStack Query
- Supabase (Auth / Postgres / Storage)
- expo-image

## Features (현재 구현)

- 소셜 로그인(Apple/Google) 및 세션 관리
- 프로필 초기화 및 계정 탈퇴
- 코디 업로드(최대 3장, 이미지 압축)
- 홈 피드(차단 유저 필터링)
- 포스트 상세(이미지 슬라이더)
- Like/Pass 투표(중복 투표 방지, 햅틱, 스와이프 제스처)
- 댓글 목록/작성/삭제(차단 유저 필터링)

## Project Structure

```txt
app/                  # Expo Router 라우트
src/components/common # 공통 UI 컴포넌트
src/features/         # 도메인별 훅/로직
src/providers/        # 전역 Provider
supabase/migrations/  # DB 마이그레이션 SQL
docs/                 # PRD, TASKS, 개선 기록
```

## Getting Started

### 1) Install

```bash
npm install
```

### 2) Environment

`.env.example`를 참고해 `.env`를 작성합니다.

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SUPABASE_OUTFIT_BUCKET=outfits
EXPO_PUBLIC_SUPABASE_POSTS_TABLE=posts
EXPO_PUBLIC_SUPABASE_BLOCKS_TABLE=user_blocks
EXPO_PUBLIC_SUPABASE_POST_VOTES_TABLE=post_votes
EXPO_PUBLIC_SUPABASE_POST_COMMENTS_TABLE=post_comments
```

### 3) Run

```bash
npm run start
npm run ios
npm run android
npm run web
```

## Database

- 스키마 변경 이력은 `supabase/migrations`에 관리됩니다.
- 현재 프로젝트는 Supabase MCP 기반으로 마이그레이션을 적용합니다.

## Scripts

- `npm run start`: Expo 개발 서버 시작
- `npm run ios`: iOS 실행
- `npm run android`: Android 실행
- `npm run web`: 웹 실행

## Notes

- 타입 체크:
  ```bash
  npx tsc --noEmit
  ```
