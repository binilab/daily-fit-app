import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  AppBottomSheet,
  AppButton,
  AppScreenSkeleton,
  AppStateView,
  AppText,
} from '../../src/components/common';
import { colors, spacing } from '../../src/design/tokens';
import { toAuthErrorMessage, useAuthSession } from '../../src/features/auth';
import {
  type PostComment,
  type VoteType,
  usePostComments,
  usePostDetail,
  usePostVote,
} from '../../src/features/feed';
import { useSmoothLoading } from '../../src/hooks/useSmoothLoading';

const SWIPE_TRIGGER_DISTANCE = 84;
const SWIPE_MAX_DISTANCE = 152;

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

// 댓글 작성 시간을 MM.DD HH:mm 형식으로 변환한다.
function formatCommentDate(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return '시간 정보 없음';
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${month}.${day} ${hours}:${minutes}`;
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

// 포스트 상세 화면의 이미지/투표/댓글 인터랙션을 렌더링한다.
export default function PostDetailScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { postId } = useLocalSearchParams<{ postId?: string | string[] }>();
  const normalizedPostId = normalizePostId(postId);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [submittingVote, setSubmittingVote] = useState<VoteType | null>(null);
  const [commentsSheetVisible, setCommentsSheetVisible] = useState(false);
  const [commentActionSheetVisible, setCommentActionSheetVisible] = useState(false);
  const [selectedComment, setSelectedComment] = useState<PostComment | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const sliderWidth = Math.max(windowWidth - spacing.screenHorizontal * 2, 260);
  const sliderHeight = sliderWidth * (4 / 3);
  const swipeX = useSharedValue(0);
  const { sessionQuery } = useAuthSession();
  const isSessionLoading = useSmoothLoading(sessionQuery.isPending);
  const { postDetailQuery } = usePostDetail(sessionQuery.data?.user.id, normalizedPostId);
  const isPostLoading = useSmoothLoading(
    Boolean(sessionQuery.data && normalizedPostId) && postDetailQuery.isPending,
  );
  const { voteSummaryQuery, voteMutation, voteSummary } = usePostVote(
    sessionQuery.data?.user.id,
    normalizedPostId,
  );
  const isVoteLoading = useSmoothLoading(
    Boolean(sessionQuery.data && normalizedPostId) && voteSummaryQuery.isPending,
  );
  const {
    postComments,
    postCommentsQuery,
    createCommentMutation,
    deleteCommentMutation,
  } = usePostComments(sessionQuery.data?.user.id, normalizedPostId);
  const isCommentsLoading = useSmoothLoading(
    Boolean(sessionQuery.data && normalizedPostId) && postCommentsQuery.isPending,
  );

  // Like/Pass 투표 저장 후 햅틱 피드백을 발생시킨다.
  const submitVote = useCallback(
    async (voteType: VoteType, source: 'button' | 'swipe') => {
      if (voteMutation.isPending) {
        return;
      }

      if (source === 'swipe') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        await Haptics.selectionAsync();
      }

      setSubmittingVote(voteType);

      try {
        await voteMutation.mutateAsync(voteType);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setSubmittingVote(null);
      }
    },
    [voteMutation],
  );

  // 댓글을 작성하고 성공 시 입력값을 초기화한다.
  const handleCreateComment = useCallback(async () => {
    if (createCommentMutation.isPending || deleteCommentMutation.isPending) {
      return;
    }

    await Haptics.selectionAsync();

    try {
      await createCommentMutation.mutateAsync(commentInput);
      setCommentInput('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [commentInput, createCommentMutation, deleteCommentMutation.isPending]);

  // 내가 작성한 댓글 길게 누르기 시 삭제 액션 시트를 연다.
  const handleOpenCommentAction = useCallback(
    (comment: PostComment) => {
      if (!sessionQuery.data || comment.author_id !== sessionQuery.data.user.id) {
        return;
      }

      setSelectedComment(comment);
      setCommentActionSheetVisible(true);
    },
    [sessionQuery.data],
  );

  // 선택된 내 댓글을 삭제하고 액션 시트를 닫는다.
  const handleDeleteComment = useCallback(async () => {
    if (!selectedComment || deleteCommentMutation.isPending) {
      return;
    }

    await Haptics.selectionAsync();

    try {
      await deleteCommentMutation.mutateAsync(selectedComment.id);
      setCommentActionSheetVisible(false);
      setSelectedComment(null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [deleteCommentMutation, selectedComment]);

  // 댓글 입력/삭제 중복 요청 여부를 계산한다.
  const isCommentMutationPending =
    createCommentMutation.isPending || deleteCommentMutation.isPending;

  // 스와이프 투표 카드의 x축 이동값에 맞춰 카드 애니메이션을 계산한다.
  const swipeCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }, { rotate: `${swipeX.value / 24}deg` }],
    backgroundColor: interpolateColor(
      swipeX.value,
      [-SWIPE_MAX_DISTANCE, 0, SWIPE_MAX_DISTANCE],
      [colors.secondary, colors.surface, colors.secondary],
    ),
  }));

  // 오른쪽 스와이프(Like) 힌트의 투명도/크기 애니메이션을 계산한다.
  const likeHintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      swipeX.value,
      [0, SWIPE_TRIGGER_DISTANCE, SWIPE_MAX_DISTANCE],
      [0, 0.55, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          swipeX.value,
          [0, SWIPE_MAX_DISTANCE],
          [0.88, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // 왼쪽 스와이프(Pass) 힌트의 투명도/크기 애니메이션을 계산한다.
  const passHintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      swipeX.value,
      [-SWIPE_MAX_DISTANCE, -SWIPE_TRIGGER_DISTANCE, 0],
      [1, 0.55, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          swipeX.value,
          [-SWIPE_MAX_DISTANCE, 0],
          [1, 0.88],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // 스와이프 거리 기준으로 Like/Pass 투표를 실행하고 카드를 원위치한다.
  const handleSwipeEnd = useCallback(
    (dx: number) => {
      if (voteMutation.isPending) {
        swipeX.value = withSpring(0);
        return;
      }

      if (dx >= SWIPE_TRIGGER_DISTANCE) {
        swipeX.value = withTiming(SWIPE_MAX_DISTANCE, { duration: 120 }, () => {
          swipeX.value = withSpring(0);
        });
        void submitVote('like', 'swipe');
        return;
      }

      if (dx <= -SWIPE_TRIGGER_DISTANCE) {
        swipeX.value = withTiming(-SWIPE_MAX_DISTANCE, { duration: 120 }, () => {
          swipeX.value = withSpring(0);
        });
        void submitVote('pass', 'swipe');
        return;
      }

      swipeX.value = withSpring(0);
    },
    [submitVote, swipeX, voteMutation.isPending],
  );

  // 스와이프 카드의 제스처 입력을 처리하는 PanResponder를 생성한다.
  const swipePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !voteMutation.isPending,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          !voteMutation.isPending &&
          Math.abs(gestureState.dx) > 6 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderMove: (_event, gestureState) => {
          if (voteMutation.isPending) {
            return;
          }

          swipeX.value = Math.max(
            -SWIPE_MAX_DISTANCE,
            Math.min(SWIPE_MAX_DISTANCE, gestureState.dx),
          );
        },
        onPanResponderRelease: (_event, gestureState) => {
          handleSwipeEnd(gestureState.dx);
        },
        onPanResponderTerminate: () => {
          swipeX.value = withSpring(0);
        },
      }),
    [handleSwipeEnd, swipeX, voteMutation.isPending],
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

  if (isVoteLoading) {
    return <AppScreenSkeleton lineCount={3} />;
  }

  if (voteSummaryQuery.isError) {
    return (
      <AppStateView
        title="투표 정보 조회 오류"
        description={toAuthErrorMessage(voteSummaryQuery.error)}
        actionLabel="다시 시도"
        onAction={() => voteSummaryQuery.refetch()}
        tone="error"
      />
    );
  }

  const post = postDetailQuery.data;
  const viewerId = sessionQuery.data.user.id;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
              const rawIndex = Math.round(event.nativeEvent.contentOffset.x / sliderWidth);
              const index = Math.min(Math.max(rawIndex, 0), post.image_urls.length - 1);
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
              style={[styles.dot, index === activeImageIndex ? styles.dotActive : undefined]}
            />
          ))}
        </View>

        <View style={styles.voteSummaryRow}>
          <View
            style={[
              styles.voteChip,
              voteSummary.myVote === 'like' ? styles.voteChipLikeActive : undefined,
            ]}
          >
            <AppText
              variant="caption"
              weight="semibold"
              style={voteSummary.myVote === 'like' ? styles.voteChipLikeText : styles.metaText}
            >
              Like {voteSummary.likeCount}
            </AppText>
          </View>
          <View
            style={[
              styles.voteChip,
              voteSummary.myVote === 'pass' ? styles.voteChipPassActive : undefined,
            ]}
          >
            <AppText
              variant="caption"
              weight="semibold"
              style={voteSummary.myVote === 'pass' ? styles.voteChipPassText : styles.metaText}
            >
              Pass {voteSummary.passCount}
            </AppText>
          </View>
        </View>

        <View style={styles.voteActionRow}>
          <View style={styles.voteActionItem}>
            <AppButton
              label="Like"
              variant={voteSummary.myVote === 'like' ? 'primary' : 'secondary'}
              loading={submittingVote === 'like'}
              disabled={voteMutation.isPending}
              onPress={() => {
                void submitVote('like', 'button');
              }}
            />
          </View>
          <View style={styles.voteActionItem}>
            <AppButton
              label="Pass"
              variant={voteSummary.myVote === 'pass' ? 'danger' : 'ghost'}
              loading={submittingVote === 'pass'}
              disabled={voteMutation.isPending}
              onPress={() => {
                void submitVote('pass', 'button');
              }}
            />
          </View>
        </View>

        <View style={styles.swipeGuideWrap}>
          <Animated.View
            style={[styles.swipeVoteCard, swipeCardAnimatedStyle]}
            {...swipePanResponder.panHandlers}
          >
            <AppText style={styles.swipeGuideText} variant="caption" weight="semibold">
              좌우로 밀어 투표
            </AppText>
          </Animated.View>

          <Animated.View pointerEvents="none" style={[styles.likeHint, likeHintAnimatedStyle]}>
            <AppText style={styles.likeHintText} variant="caption" weight="semibold">
              LIKE
            </AppText>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.passHint, passHintAnimatedStyle]}>
            <AppText style={styles.passHintText} variant="caption" weight="semibold">
              PASS
            </AppText>
          </Animated.View>
        </View>

        {voteMutation.isError ? (
          <AppText style={styles.voteErrorText} variant="caption">
            {toAuthErrorMessage(voteMutation.error)}
          </AppText>
        ) : null}

        <View style={styles.commentCard}>
          <View style={styles.commentHeader}>
            <AppText variant="body" weight="semibold">
              댓글
            </AppText>
            <AppText style={styles.metaText} variant="caption">
              {postCommentsQuery.isError
                ? '조회 오류'
                : isCommentsLoading
                  ? '불러오는 중'
                  : `${postComments.length}개`}
            </AppText>
          </View>
          <AppButton
            label="댓글 보기"
            variant="secondary"
            onPress={() => setCommentsSheetVisible(true)}
          />
        </View>

        <View style={styles.metaCard}>
          <AppText variant="caption" style={styles.metaText}>
            업로드 {formatFeedDate(post.created_at)}
          </AppText>
          <AppText variant="caption" style={styles.metaText}>
            작성자 {post.author_id.slice(0, 8)}
          </AppText>
        </View>
      </ScrollView>

      <AppBottomSheet
        visible={commentsSheetVisible}
        onClose={() => setCommentsSheetVisible(false)}
        title="댓글"
        height={560}
      >
        <View style={styles.commentComposerWrap}>
          <TextInput
            value={commentInput}
            onChangeText={setCommentInput}
            placeholder="댓글을 입력하세요"
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={300}
            style={styles.commentInput}
            editable={!isCommentMutationPending}
          />
          <AppButton
            label="등록"
            loading={createCommentMutation.isPending}
            disabled={isCommentMutationPending}
            onPress={() => {
              void handleCreateComment();
            }}
          />
        </View>

        {createCommentMutation.isError ? (
          <AppText style={styles.commentErrorText} variant="caption">
            {toAuthErrorMessage(createCommentMutation.error)}
          </AppText>
        ) : null}
        {deleteCommentMutation.isError ? (
          <AppText style={styles.commentErrorText} variant="caption">
            {toAuthErrorMessage(deleteCommentMutation.error)}
          </AppText>
        ) : null}

        {isCommentsLoading ? (
          <AppText style={styles.metaText} variant="caption">
            댓글을 불러오는 중입니다.
          </AppText>
        ) : null}

        {postCommentsQuery.isError ? (
          <View style={styles.commentStateWrap}>
            <AppText style={styles.commentErrorText} variant="caption">
              {toAuthErrorMessage(postCommentsQuery.error)}
            </AppText>
            <AppButton
              label="다시 시도"
              variant="ghost"
              onPress={() => postCommentsQuery.refetch()}
            />
          </View>
        ) : null}

        {!isCommentsLoading && !postCommentsQuery.isError && postComments.length === 0 ? (
          <AppText style={styles.metaText} variant="caption">
            아직 댓글이 없습니다. 첫 댓글을 남겨보세요.
          </AppText>
        ) : null}

        {!isCommentsLoading && !postCommentsQuery.isError && postComments.length > 0 ? (
          <FlatList
            style={styles.commentsList}
            data={postComments}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isMine = item.author_id === viewerId;

              return (
                <Pressable
                  onLongPress={() => handleOpenCommentAction(item)}
                  delayLongPress={260}
                  style={styles.commentItem}
                >
                  <View style={styles.commentMetaRow}>
                    <AppText style={styles.metaText} variant="caption">
                      작성자 {item.author_id.slice(0, 8)}
                    </AppText>
                    <AppText style={styles.metaText} variant="caption">
                      {formatCommentDate(item.created_at)}
                    </AppText>
                  </View>
                  <AppText variant="body">{item.content}</AppText>
                  {isMine ? (
                    <AppText style={styles.commentHintText} variant="caption">
                      내 댓글 · 길게 눌러 삭제
                    </AppText>
                  ) : null}
                </Pressable>
              );
            }}
          />
        ) : null}
      </AppBottomSheet>

      <AppBottomSheet
        visible={commentActionSheetVisible}
        onClose={() => {
          setCommentActionSheetVisible(false);
          setSelectedComment(null);
        }}
        title="댓글 관리"
        height={220}
      >
        <AppButton
          label="댓글 삭제"
          variant="danger"
          loading={deleteCommentMutation.isPending}
          disabled={!selectedComment || deleteCommentMutation.isPending}
          onPress={() => {
            void handleDeleteComment();
          }}
        />
        <AppButton
          label="닫기"
          variant="ghost"
          onPress={() => {
            setCommentActionSheetVisible(false);
            setSelectedComment(null);
          }}
        />
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
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
  voteSummaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  voteChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  voteChipLikeActive: {
    borderColor: colors.primary,
    backgroundColor: '#F1F3F5',
  },
  voteChipPassActive: {
    borderColor: colors.destructive,
    backgroundColor: '#FFF1F0',
  },
  voteChipLikeText: {
    color: colors.primary,
  },
  voteChipPassText: {
    color: colors.destructive,
  },
  voteActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  voteActionItem: {
    flex: 1,
  },
  swipeGuideWrap: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    position: 'relative',
  },
  swipeVoteCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  swipeGuideText: {
    color: colors.textSecondary,
  },
  likeHint: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.lg,
  },
  passHint: {
    position: 'absolute',
    left: spacing.lg,
    top: spacing.lg,
  },
  likeHintText: {
    color: colors.primary,
  },
  passHintText: {
    color: colors.destructive,
  },
  voteErrorText: {
    color: colors.destructive,
  },
  commentCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentComposerWrap: {
    gap: spacing.sm,
  },
  commentInput: {
    minHeight: 88,
    maxHeight: 140,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
    color: colors.textPrimary,
  },
  commentStateWrap: {
    gap: spacing.sm,
  },
  commentsList: {
    maxHeight: 250,
  },
  commentItem: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  commentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  commentHintText: {
    color: colors.textSecondary,
  },
  commentErrorText: {
    color: colors.destructive,
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
