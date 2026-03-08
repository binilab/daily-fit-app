import { useQuery } from '@tanstack/react-query';
import { supabase, supabaseConfigError } from '../../lib/supabase';
import type { HomeFeedPost } from './useHomeFeed';

const POSTS_TABLE = process.env.EXPO_PUBLIC_SUPABASE_POSTS_TABLE ?? 'posts';
const BLOCKS_TABLE = process.env.EXPO_PUBLIC_SUPABASE_BLOCKS_TABLE ?? 'user_blocks';

// Supabase 오류를 포스트 상세 조회 오류 메시지로 정규화한다.
function toPostDetailError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const code = Reflect.get(error, 'code');
    const message = Reflect.get(error, 'message');

    if (code === 'PGRST205' && BLOCKS_TABLE === 'user_blocks') {
      return new Error(
        "Supabase에 'public.user_blocks' 테이블이 없습니다. 차단 필터를 위해 마이그레이션을 적용해 주세요.",
      );
    }

    if (code === 'PGRST205' && POSTS_TABLE === 'posts') {
      return new Error(
        "Supabase에 'public.posts' 테이블이 없습니다. posts 마이그레이션을 먼저 적용해 주세요.",
      );
    }

    if (typeof message === 'string' && message.length > 0) {
      return new Error(message);
    }
  }

  return new Error(fallbackMessage);
}

// 로그인 사용자가 차단한 사용자 ID 목록을 조회한다.
async function fetchBlockedUserIds(viewerId: string) {
  const { data, error } = await supabase
    .from(BLOCKS_TABLE)
    .select('blocked_id')
    .eq('blocker_id', viewerId);

  if (error) {
    throw toPostDetailError(error, '차단 목록 조회에 실패했습니다.');
  }

  return (data ?? [])
    .map((item) => item.blocked_id)
    .filter((value): value is string => typeof value === 'string');
}

// 포스트 ID로 단일 게시글을 조회한다.
async function fetchPostById(postId: string) {
  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select('id, author_id, image_urls, created_at')
    .eq('id', postId)
    .maybeSingle();

  if (error) {
    throw toPostDetailError(error, '포스트 상세 조회에 실패했습니다.');
  }

  return (data as HomeFeedPost | null) ?? null;
}

// 포스트 상세 조회 시 차단 유저의 콘텐츠는 null로 반환한다.
async function fetchPostDetail(params: { viewerId: string; postId: string }) {
  if (supabaseConfigError) {
    throw new Error(supabaseConfigError);
  }

  const [post, blockedUserIds] = await Promise.all([
    fetchPostById(params.postId),
    fetchBlockedUserIds(params.viewerId),
  ]);

  if (!post) {
    return null;
  }

  if (blockedUserIds.includes(post.author_id)) {
    return null;
  }

  return post;
}

// 단일 포스트 상세 데이터를 조회하고 캐시하는 전용 훅이다.
export function usePostDetail(viewerId: string | null | undefined, postId: string | null) {
  const postDetailQuery = useQuery({
    queryKey: ['feed', 'post-detail', viewerId, postId],
    enabled: !!viewerId && !!postId,
    queryFn: () =>
      fetchPostDetail({
        viewerId: viewerId as string,
        postId: postId as string,
      }),
  });

  return {
    postDetailQuery,
  };
}
