import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import {
  AppScreenSkeleton,
  AppStateView,
  AppText,
} from '../../src/components/common';
import { colors, spacing } from '../../src/design/tokens';
import { toAuthErrorMessage, useAuthSession } from '../../src/features/auth';
import { type HomeFeedPost, useHomeFeed } from '../../src/features/feed';
import { useSmoothLoading } from '../../src/hooks/useSmoothLoading';

// 홈 피드 카드의 날짜 라벨을 YYYY.MM.DD 형식으로 변환한다.
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

// 이미지 중심 홈 피드 카드 한 장을 렌더링하는 컴포넌트다.
function HomeFeedCard({
  post,
  onPress,
}: {
  post: HomeFeedPost;
  onPress: () => void;
}) {
  const primaryImage = post.image_urls[0];
  const remainImageCount = post.image_urls.length - 1;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.feedCard, pressed ? styles.feedCardPressed : undefined]}
    >
      {primaryImage ? (
        <Image
          source={{ uri: primaryImage }}
          contentFit="cover"
          transition={140}
          style={styles.feedImage}
        />
      ) : (
        <View style={styles.imageFallback}>
          <AppText variant="caption">이미지 없음</AppText>
        </View>
      )}
      {remainImageCount > 0 ? (
        <View style={styles.imageCountBadge}>
          <AppText style={styles.imageCountText} variant="caption" weight="semibold">
            +{remainImageCount}
          </AppText>
        </View>
      ) : null}
      <View style={styles.metaRow}>
        <AppText style={styles.metaText} variant="caption">
          {formatFeedDate(post.created_at)}
        </AppText>
        <AppText style={styles.metaText} variant="caption">
          작성자 {post.author_id.slice(0, 8)}
        </AppText>
      </View>
    </Pressable>
  );
}

// 앱의 홈 피드 화면과 차단 필터가 적용된 게시글 목록을 렌더링한다.
export default function HomeTabScreen() {
  const router = useRouter();
  const { sessionQuery } = useAuthSession();
  const isSessionLoading = useSmoothLoading(sessionQuery.isPending);
  const { homeFeedQuery } = useHomeFeed(sessionQuery.data?.user.id);
  const isFeedLoading = useSmoothLoading(
    Boolean(sessionQuery.data) && homeFeedQuery.isPending,
  );

  if (isSessionLoading) {
    return <AppScreenSkeleton />;
  }

  if (sessionQuery.isError) {
    return (
      <AppStateView
        title="홈 로딩 오류"
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

  if (isFeedLoading) {
    return <AppScreenSkeleton />;
  }

  if (homeFeedQuery.isError) {
    return (
      <AppStateView
        title="홈 피드 조회 오류"
        description={toAuthErrorMessage(homeFeedQuery.error)}
        actionLabel="다시 시도"
        onAction={() => homeFeedQuery.refetch()}
        tone="error"
      />
    );
  }

  if (!homeFeedQuery.data || homeFeedQuery.data.length === 0) {
    return (
      <AppStateView
        title="표시할 피드가 없습니다"
        description="아직 업로드된 코디가 없거나 차단 필터로 모두 제외되었습니다."
        actionLabel="새로고침"
        onAction={() => homeFeedQuery.refetch()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={homeFeedQuery.data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HomeFeedCard
            post={item}
            onPress={() => router.push(`/post/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <AppText variant="title" weight="semibold">
              홈 피드
            </AppText>
            <AppText style={styles.headerDescription} variant="body">
              최신 코디를 이미지 중심으로 빠르게 확인할 수 있습니다.
            </AppText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  headerCard: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  headerDescription: {
    color: colors.textSecondary,
  },
  feedCard: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  feedCardPressed: {
    opacity: 0.9,
  },
  feedImage: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  imageFallback: {
    width: '100%',
    aspectRatio: 3 / 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
  },
  imageCountBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.overlay,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  imageCountText: {
    color: colors.surface,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  metaText: {
    color: colors.textSecondary,
  },
});
