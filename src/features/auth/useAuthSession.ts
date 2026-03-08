import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Provider, Session } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase, supabaseConfigError } from '../../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export const authSessionQueryKey = ['auth', 'session'] as const;

type ParsedOAuthPayload = {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  errorDescription: string | null;
};

// OAuth 콜백 URL에서 query/hash 파라미터를 모두 읽어 인증 정보를 추출한다.
function parseOAuthPayload(callbackUrl: string): ParsedOAuthPayload {
  const parsed = Linking.parse(callbackUrl);
  const queryParams = parsed.queryParams ?? {};
  const hashQuery = callbackUrl.includes('#') ? callbackUrl.split('#')[1] : '';
  const hashParams = new URLSearchParams(hashQuery);

  const readParam = (key: string) => {
    const queryValue = queryParams[key];

    if (typeof queryValue === 'string') {
      return queryValue;
    }

    const hashValue = hashParams.get(key);
    return typeof hashValue === 'string' ? hashValue : null;
  };

  return {
    code: readParam('code'),
    accessToken: readParam('access_token'),
    refreshToken: readParam('refresh_token'),
    errorDescription: readParam('error_description') ?? readParam('error'),
  };
}

// Supabase에서 현재 인증 세션을 조회한다.
async function fetchSession() {
  if (supabaseConfigError) {
    throw new Error(supabaseConfigError);
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

// OAuth 인증 URL로 이동한 뒤 콜백 코드 교환까지 수행한다.
async function signInWithOAuthProvider(provider: Provider) {
  if (supabaseConfigError) {
    throw new Error(supabaseConfigError);
  }

  const redirectTo = AuthSession.makeRedirectUri({
    path: 'auth/callback',
    preferLocalhost: true,
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error('OAuth 인증 URL을 생성하지 못했습니다.');
  }

  const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (authResult.type !== 'success') {
    if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
      return null;
    }

    throw new Error('소셜 로그인 인증이 완료되지 않았습니다.');
  }

  const { code, accessToken, refreshToken, errorDescription } = parseOAuthPayload(
    authResult.url,
  );

  if (errorDescription) {
    throw new Error(`소셜 로그인 오류: ${errorDescription}`);
  }

  if (code) {
    const { data: exchanged, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      throw exchangeError;
    }

    return exchanged.session;
  }

  if (accessToken && refreshToken) {
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      throw sessionError;
    }

    return sessionData.session;
  }

  throw new Error('인증 코드 또는 세션 토큰이 전달되지 않았습니다.');
}

// 현재 사용자 세션/로그인/로그아웃 상태를 통합 관리하는 인증 훅이다.
export function useAuthSession() {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: authSessionQueryKey,
    queryFn: fetchSession,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (supabaseConfigError) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData(authSessionQueryKey, session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const googleLoginMutation = useMutation({
    mutationFn: () => signInWithOAuthProvider('google'),
    onSuccess: (session) => {
      queryClient.setQueryData<Session | null>(authSessionQueryKey, session);
    },
  });

  const appleLoginMutation = useMutation({
    mutationFn: () => signInWithOAuthProvider('apple'),
    onSuccess: (session) => {
      queryClient.setQueryData<Session | null>(authSessionQueryKey, session);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      if (supabaseConfigError) {
        throw new Error(supabaseConfigError);
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(authSessionQueryKey, null);
    },
  });

  return {
    sessionQuery,
    googleLoginMutation,
    appleLoginMutation,
    signOutMutation,
    resetAuthError: () => {
      googleLoginMutation.reset();
      appleLoginMutation.reset();
      signOutMutation.reset();
    },
  };
}
