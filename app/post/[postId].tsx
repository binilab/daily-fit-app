import { Image } from 'expo-image';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppScreenSkeleton, AppStateView, AppText } from '../../src/components/common';
import { colors, spacing } from '../../src/design/tokens';
import { toAuthErrorMessage, useAuthSession } from '../../src/features/auth';
import { usePostDetail } from '../../src/features/feed';
import { useSmoothLoading } from '../../src/hooks/useSmoothLoading';

// 포스트 생성일을 YYYY.MM.DD 형식으로 변환한다.
function formatFeedDate(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return '날짜 정보 없음';
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
}

// 동적 라우트 파라미터에서 단일 postId 문자열을 추출한다.
function normalizePostId(postId: string | string[] | undefined) {
  if (typeof postId === 'string' && postId.length > 0) {
    return postId;
  }

  if (Array.isArray(postId) && typeof postId[0] === 'string' && postId[0].length > 0) {
    return postId[0];
  }

  return null;
}

// 포스트 상세 화면의 이미지 슬라이더와 메타 정보를 렌더링한다.
export default function PostDetailScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { postId } = useLocalSearchParams<{ postId?: string | string[] }>();
  const normalizedPostId = normalizePostId(postId);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const sliderWidth = Math.max(windowWidth - spacing.screenHorizontal * 2, 260);
  const sliderHeight = sliderWidth * (4 / 3);
  const { sessionQuery } = useAuthSession();
  const isSessionLoading = useSmoothLoading(sessionQuery.isPending);
  const { postDetailQuery } = usePostDetail(sessionQuery.data?.user.id, normalizedPostId);
  const isPostLoading = useSmoothLoading(
    Boolean(sessionQuery.data && normalizedPostId) && postDetailQuery.isPending,
  );

  if (isSessionLoading) {
    return <AppScreenSkeleton />;
  }

  if (sessionQuery.isError) {
    return (
      <AppStateView
        title="세션 확인 오류"
        description={toAuthErrorMessage(sessionQuery.error)}
        actionLabel="다시 시도"
        onAction={() => sessionQuery.refetch()}
        tone="error"
      />
    );
  }

  if (!sessionQuery.data) {
    return <Redirect href="/" />;
  }

  if (!normalizedPostId) {
    return (
      <AppStateView
        title="잘못된 포스트 경로"
        description="유효한 포스트 ID가 없어 상세 화면을 열 수 없습니다."
        actionLabel="홈으로 이동"
        onAction={() => router.replace('/(tabs)/home')}
      />
    );
  }

  if (isPostLoading) {
    return <AppScreenSkeleton lineCount={3} />;
  }

  if (postDetailQuery.isError) {
    return (
      <AppStateView
        title="포스트 상세 조회 오류"
        description={toAuthErrorMessage(postDetailQuery.error)}
        actionLabel="다시 시도"
        onAction={() => postDetailQuery.refetch()}
        tone="error"
      />
    );
  }

  if (!postDetailQuery.data) {
    return (
      <AppStateView
        title="포스트를 찾을 수 없습니다"
        description="삭제되었거나 차단 필터로 제외된 게시글입니다."
        actionLabel="홈으로 이동"
        onAction={() => router.replace('/(tabs)/home')}
      />
    );
  }

  if (postDetailQuery.data.image_urls.length === 0) {
    return (
      <AppStateView
        title="이미지가 없습니다"
        description="표시할 이미지가 없는 포스트입니다."
        actionLabel="홈으로 이동"
        onAction={() => router.replace('/(tabs)/home')}
      />
    );
  }

  const post = postDetailQuery.data;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }

              router.replace('/(tabs)/home');
            }}
            style={styles.backButton}
          >
            <AppText variant="body" weight="semibold">
              뒤로
            </AppText>
          </Pressable>
          <AppText style={styles.pageLabel} variant="caption">
            {activeImageIndex + 1} / {post.image_urls.length}
          </AppText>
        </View>

        <View style={[styles.sliderFrame, { width: sliderWidth }]}>
          <FlatList
            data={post.image_urls}
            keyExtractor={(item, index) => `${item}-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ width: sliderWidth }}
            onMomentumScrollEnd={(event) => {
              const rawIndex = Math.round(
                event.nativeEvent.contentOffset.x / sliderWidth,
              );
              const index = Math.min(
                Math.max(rawIndex, 0),
                post.image_urls.length - 1,
              );
              setActiveImageIndex(index);
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                contentFit="cover"
                transition={140}
                style={{
                  width: sliderWidth,
                  height: sliderHeight,
                }}
              />
            )}
          />
        </View>

        <View style={styles.dotRow}>
          {post.image_urls.map((imageUrl, index) => (
            <View
              key={`${imageUrl}-dot-${index}`}
              style={[
                styles.dot,
                index === activeImageIndex ? styles.dotActive : undefined,
              ]}
            />
          ))}
        </View>

        <View style={styles.metaCard}>
          <AppText variant="caption" style={styles.metaText}>
            업로드 {formatFeedDate(post.created_at)}
          </AppText>
          <AppText variant="caption" style={styles.metaText}>
            작성자 {post.author_id.slice(0, 8)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pageLabel: {
    color: colors.textSecondary,
  },
  sliderFrame: {
    alignSelf: 'center',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dotRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  metaCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metaText: {
    color: colors.textSecondary,
  },
});
