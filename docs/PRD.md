# 📄 DailyFit PRD (v1.1)

## 1. 제품 개요

DailyFit는 사용자가 오늘의 코디(OOTD)를 업로드하고, 투표와 댓글로 소통하는 패션 중심 참여형 커뮤니티 앱이다.

## 2. 제품 목표

일반 SNS보다 가볍고 빠른 패션 피드백 루프 생성: **업로드 → 투표 → 랭킹 → 재방문**

## 3. 타겟 사용자

- 10대 후반 ~ 20대 후반 패션 관심 유저
- 자신의 코디에 대해 즉각적인 반응을 원하는 유저
- 다른 사람의 스타일을 참고하고 싶은 유저

## 4. 핵심 가치

- **Speed:** 빠른 이미지 로딩 및 직관적인 UI
- **Lightweight:** 복잡한 소통보다 Like/Pass 기반의 가벼운 참여
- **Social Proof:** 일간 랭킹을 통한 성취감 제공
- **Design (Minimal & Clean):** 토스/무신사와 같이 여백과 타이포그래피를 강조한 최소한의 디자인. 부드러운 마이크로 인터랙션과 직관적인 네비게이션 제공

## 5. MVP 범위 (App Store 심사 기준 반영)

- **인증:** 이메일 및 소셜 로그인 (Apple/Google), **계정 탈퇴 기능**
- **코디:** 이미지 업로드(1~3장), 홈 피드, 상세 페이지
- **상호작용:** Like/Pass 투표, 댓글 작성
- **랭킹:** 일간 랭킹 집계 (KST 기준)
- **UGC 보안:** 신고 기능, **사용자 차단 기능** (Apple 심사 필수)

## 6. 핵심 기능 상세

### 6-1. UI/UX (미니멀 디자인 시스템)

- **레이아웃:** 복잡한 정보와 텍스트를 배제하고 코디 이미지가 가장 돋보이는 카드형 혹은 풀스크린(Full-screen) 구성
- **타이포그래피:** 가독성 높고 세련된 폰트(예: Pretendard)와 여백(Margin/Padding)의 적극적인 활용
- **공통 디자인 요소:** 불필요한 장식이 없는 바텀시트, 둥근 버튼 등 토스/무신사 스타일의 공통 컴포넌트

### 6-2. 랭킹 시스템

- **집계 시간:** KST 00:00 ~ 23:59
- **산정 로직:**
  1. `like_count` 내림차순
  2. `pass_count` 오름차순
  3. `created_at` 오름차순

### 6-3. 보안 및 운영 (UGC)

- **신고:** 부적절한 콘텐츠/댓글 신고 로직
- **차단:** 차단한 사용자의 콘텐츠는 피드 및 댓글에서 영구 제외

## 7. 기술 스택

- **Frontend:** Expo (React Native), TypeScript, Expo Router
- **Backend:** Supabase (Auth, DB, Storage, Edge Functions)
- **State:** TanStack Query (Server), Zustand (Client)
- **UI/Design:** expo-image (최적화), 미니멀 디자인 토큰 세팅(Color/Typography/Spacing), 부드러운 애니메이션(Reanimated), expo-haptics (피드백)

## 8. 성공 지표

- 첫 코디 업로드 전환율
- 포스트당 평균 투표 및 댓글 수
- D+1 재방문율 (Retention)
