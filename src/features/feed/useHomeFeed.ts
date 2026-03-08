import { useQuery } from '@tanstack/react-query';
import { supabase, supabaseConfigError } from '../../lib/supabase';

const POSTS_TABLE = process.env.EXPO_PUBLIC_SUPABASE_POSTS_TABLE ?? 'posts';
const BLOCKS_TABLE = process.env.EXPO_PUBLIC_SUPABASE_BLOCKS_TABLE ?? 'user_blocks';

export type HomeFeedPost = {
  id: string;
  author_id: string;
  image_urls: string[];
  created_at: string;
};

// Supabase 오류를 홈 피드 오류 메시지로 정규화한다.
function toHomeFeedError(error: unknown, fallbackMessage: string) {
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
    throw toHomeFeedError(error, '차단 목록 조회에 실패했습니다.');
  }

  return (data ?? [])
    .map((item) => item.blocked_id)
    .filter((value): value is string => typeof value === 'string');
}

// 최신순 posts를 조회한다.
async function fetchLatestPosts() {
  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select('id, author_id, image_urls, created_at')
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) {
    throw toHomeFeedError(error, '홈 피드 조회에 실패했습니다.');
  }

  return (data ?? []) as HomeFeedPost[];
}

// 홈 피드 조회 시 차단 유저 콘텐츠를 제외한 최신순 게시글 목록을 반환한다.
async function fetchHomeFeed(viewerId: string) {
  if (supabaseConfigError) {
    throw new Error(supabaseConfigError);
  }

  const [posts, blockedUserIds] = await Promise.all([
    fetchLatestPosts(),
    fetchBlockedUserIds(viewerId),
  ]);

  if (blockedUserIds.length === 0) {
    return posts;
  }

  const blockedSet = new Set(blockedUserIds);
  return posts.filter((post) => !blockedSet.has(post.author_id));
}

// 홈 피드 목록을 로딩/갱신하는 전용 훅이다.
export function useHomeFeed(viewerId: string | null | undefined) {
  const homeFeedQuery = useQuery({
    queryKey: ['feed', 'home', viewerId],
    enabled: !!viewerId,
    queryFn: () => fetchHomeFeed(viewerId as string),
  });

  return {
    homeFeedQuery,
  };
}
