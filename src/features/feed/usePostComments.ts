import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, supabaseConfigError } from '../../lib/supabase';

const POST_COMMENTS_TABLE =
  process.env.EXPO_PUBLIC_SUPABASE_POST_COMMENTS_TABLE ?? 'post_comments';
const BLOCKS_TABLE = process.env.EXPO_PUBLIC_SUPABASE_BLOCKS_TABLE ?? 'user_blocks';

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

// Supabase 오류를 댓글 기능 오류 메시지로 정규화한다.
function toPostCommentError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const code = Reflect.get(error, 'code');
    const message = Reflect.get(error, 'message');

    if (code === 'PGRST205' && POST_COMMENTS_TABLE === 'post_comments') {
      return new Error(
        "Supabase에 'public.post_comments' 테이블이 없습니다. 댓글 마이그레이션을 적용해 주세요.",
      );
    }

    if (code === 'PGRST205' && BLOCKS_TABLE === 'user_blocks') {
      return new Error(
        "Supabase에 'public.user_blocks' 테이블이 없습니다. 차단 필터를 위해 마이그레이션을 적용해 주세요.",
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
    throw toPostCommentError(error, '차단 목록 조회에 실패했습니다.');
  }

  return (data ?? [])
    .map((item) => item.blocked_id)
    .filter((value): value is string => typeof value === 'string');
}

// 특정 포스트의 댓글 목록을 최신순으로 조회한다.
async function fetchCommentsByPostId(postId: string) {
  const { data, error } = await supabase
    .from(POST_COMMENTS_TABLE)
    .select('id, post_id, author_id, content, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (error) {
    throw toPostCommentError(error, '댓글 목록 조회에 실패했습니다.');
  }

  return (data ?? []) as PostComment[];
}

// 댓글 입력값을 정리하고 유효 길이를 검증한다.
function sanitizeCommentContent(content: string) {
  const sanitized = content.trim();

  if (sanitized.length === 0) {
    throw new Error('댓글 내용을 입력해 주세요.');
  }

  if (sanitized.length > 300) {
    throw new Error('댓글은 300자 이하로 입력해 주세요.');
  }

  return sanitized;
}

// 포스트에 새 댓글을 작성한다.
async function createComment(params: {
  postId: string;
  viewerId: string;
  content: string;
}) {
  const content = sanitizeCommentContent(params.content);
  const { error } = await supabase.from(POST_COMMENTS_TABLE).insert({
    post_id: params.postId,
    author_id: params.viewerId,
    content,
  });

  if (error) {
    throw toPostCommentError(error, '댓글 작성에 실패했습니다.');
  }
}

// 본인 댓글을 삭제한다.
async function deleteComment(params: { commentId: string; viewerId: string }) {
  const { error } = await supabase
    .from(POST_COMMENTS_TABLE)
    .delete()
    .eq('id', params.commentId)
    .eq('author_id', params.viewerId);

  if (error) {
    throw toPostCommentError(error, '댓글 삭제에 실패했습니다.');
  }
}

// 댓글 조회 시 차단한 사용자의 댓글을 제외한다.
async function fetchPostComments(params: { postId: string; viewerId: string }) {
  if (supabaseConfigError) {
    throw new Error(supabaseConfigError);
  }

  const [comments, blockedUserIds] = await Promise.all([
    fetchCommentsByPostId(params.postId),
    fetchBlockedUserIds(params.viewerId),
  ]);

  if (blockedUserIds.length === 0) {
    return comments;
  }

  const blockedSet = new Set(blockedUserIds);
  return comments.filter((comment) => !blockedSet.has(comment.author_id));
}

// 단일 포스트의 댓글 목록 조회/작성/삭제를 관리하는 전용 훅이다.
export function usePostComments(viewerId: string | null | undefined, postId: string | null) {
  const queryClient = useQueryClient();
  const postCommentsQueryKey = ['feed', 'post-comments', postId, viewerId] as const;

  const postCommentsQuery = useQuery({
    queryKey: postCommentsQueryKey,
    enabled: !!viewerId && !!postId,
    queryFn: () =>
      fetchPostComments({
        postId: postId as string,
        viewerId: viewerId as string,
      }),
  });

  const createCommentMutation = useMutation({
    mutationFn: (content: string) =>
      createComment({
        postId: postId as string,
        viewerId: viewerId as string,
        content,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: postCommentsQueryKey });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      deleteComment({
        commentId,
        viewerId: viewerId as string,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: postCommentsQueryKey });
    },
  });

  return {
    postCommentsQuery,
    createCommentMutation,
    deleteCommentMutation,
    postComments: postCommentsQuery.data ?? [],
  };
}
