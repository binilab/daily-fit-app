import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { authSessionQueryKey } from '../auth/useAuthSession';
import { supabase, supabaseConfigError } from '../../lib/supabase';

export type MyProfile = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

export const myProfileQueryKey = ['profile', 'me'] as const;

// Supabase 오류 객체를 Error 인스턴스로 정규화한다.
function toProfileError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const message = Reflect.get(error, 'message');
    const code = Reflect.get(error, 'code');

    if (typeof message === 'string' && message.length > 0) {
      if (code === 'PGRST205') {
        return new Error(
          "Supabase에 'public.profiles' 테이블이 없습니다. SQL Editor에서 profiles 테이블을 먼저 생성해 주세요.",
        );
      }

      return new Error(message);
    }
  }

  return new Error(fallbackMessage);
}

// 로그인된 사용자 프로필을 조회하고 없으면 기본 프로필을 생성한다.
async function fetchOrCreateMyProfile(userId: string) {
  if (supabaseConfigError) {
    throw new Error(supabaseConfigError);
  }

  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) {
    throw toProfileError(fetchError, '프로필 조회에 실패했습니다.');
  }

  if (existingProfile) {
    return existingProfile as MyProfile;
  }

  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id' })
    .select('*')
    .single();

  if (createError) {
    throw toProfileError(createError, '프로필 생성에 실패했습니다.');
  }

  return createdProfile as MyProfile;
}

// 계정 탈퇴 RPC를 호출해 사용자 데이터 삭제를 요청한다.
async function deleteMyAccount() {
  if (supabaseConfigError) {
    throw new Error(supabaseConfigError);
  }

  const { error } = await supabase.rpc('delete_my_account');

  if (error) {
    throw toProfileError(error, '계정 탈퇴 처리에 실패했습니다.');
  }

  // 삭제 후 로컬 세션을 종료해 인증 상태를 즉시 반영한다.
  await supabase.auth.signOut();
}

// 내 프로필 조회/초기화와 계정 탈퇴를 함께 관리하는 훅이다.
export function useMyProfile(session: Session | null | undefined) {
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const myProfileQuery = useQuery({
    queryKey: [...myProfileQueryKey, userId],
    enabled: !!userId,
    queryFn: () => fetchOrCreateMyProfile(userId as string),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: myProfileQueryKey });
      queryClient.setQueryData(authSessionQueryKey, null);
    },
  });

  return {
    myProfileQuery,
    deleteAccountMutation,
  };
}
