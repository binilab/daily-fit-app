import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, supabaseConfigError } from '../../lib/supabase';

const POST_VOTES_TABLE = process.env.EXPO_PUBLIC_SUPABASE_POST_VOTES_TABLE ?? 'post_votes';

export type VoteType = 'like' | 'pass';

type PostVoteRow = {
  voter_id: string;
  vote_type: VoteType;
};

type PostVoteSummary = {
  likeCount: number;
  passCount: number;
  myVote: VoteType | null;
};

const defaultVoteSummary: PostVoteSummary = {
  likeCount: 0,
  passCount: 0,
  myVote: null,
};

// Supabase 오류를 투표 기능 오류 메시지로 정규화한다.
function toPostVoteError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const code = Reflect.get(error, 'code');
    const message = Reflect.get(error, 'message');

    if (code === 'PGRST205' && POST_VOTES_TABLE === 'post_votes') {
      return new Error(
        "Supabase에 'public.post_votes' 테이블이 없습니다. 투표 마이그레이션을 적용해 주세요.",
      );
    }

    if (typeof message === 'string' && message.length > 0) {
      return new Error(message);
    }
  }

  return new Error(fallbackMessage);
}

// 특정 포스트의 투표 목록을 조회해 카운트/내 투표 상태를 계산한다.
async function fetchPostVoteSummary(params: { postId: string; viewerId: string }) {
  const { data, error } = await supabase
    .from(POST_VOTES_TABLE)
    .select('voter_id, vote_type')
    .eq('post_id', params.postId);

  if (error) {
    throw toPostVoteError(error, '투표 정보 조회에 실패했습니다.');
  }

  const rows = (data ?? []) as PostVoteRow[];
  let likeCount = 0;
  let passCount = 0;
  let myVote: VoteType | null = null;

  rows.forEach((row) => {
    if (row.vote_type === 'like') {
      likeCount += 1;
    } else if (row.vote_type === 'pass') {
      passCount += 1;
    }

    if (row.voter_id === params.viewerId) {
      myVote = row.vote_type;
    }
  });

  return {
    likeCount,
    passCount,
    myVote,
  } satisfies PostVoteSummary;
}

// 투표를 생성/수정하는 upsert 로직으로 중복 투표를 방지한다.
async function upsertPostVote(params: {
  postId: string;
  viewerId: string;
  voteType: VoteType;
}) {
  const { error } = await supabase.from(POST_VOTES_TABLE).upsert(
    {
      post_id: params.postId,
      voter_id: params.viewerId,
      vote_type: params.voteType,
    },
    {
      onConflict: 'post_id,voter_id',
    },
  );

  if (error) {
    throw toPostVoteError(error, '투표 저장에 실패했습니다.');
  }
}

// 단일 포스트의 투표 조회/저장을 관리하는 전용 훅이다.
export function usePostVote(viewerId: string | null | undefined, postId: string | null) {
  const queryClient = useQueryClient();
  const voteSummaryQueryKey = ['feed', 'post-votes', postId, viewerId] as const;

  const voteSummaryQuery = useQuery({
    queryKey: voteSummaryQueryKey,
    enabled: !!viewerId && !!postId,
    queryFn: () =>
      fetchPostVoteSummary({
        postId: postId as string,
        viewerId: viewerId as string,
      }),
  });

  const voteMutation = useMutation({
    mutationFn: (voteType: VoteType) => {
      if (supabaseConfigError) {
        throw new Error(supabaseConfigError);
      }

      return upsertPostVote({
        postId: postId as string,
        viewerId: viewerId as string,
        voteType,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: voteSummaryQueryKey,
      });
    },
  });

  return {
    voteSummaryQuery,
    voteMutation,
    voteSummary: voteSummaryQuery.data ?? defaultVoteSummary,
  };
}
