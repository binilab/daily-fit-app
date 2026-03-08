import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  AppButton,
  AppScreenSkeleton,
  AppStateView,
  AppText,
} from '../src/components/common';
import { colors, spacing } from '../src/design/tokens';
import { toAuthErrorMessage, useAuthSession } from '../src/features/auth';
import { useSmoothLoading } from '../src/hooks/useSmoothLoading';

// 로그인되지 않은 사용자의 인증 진입 화면을 담당하는 루트 페이지다.
export default function AuthEntryScreen() {
  const { sessionQuery, googleLoginMutation, appleLoginMutation, resetAuthError } =
    useAuthSession();
  const isSessionLoading = useSmoothLoading(sessionQuery.isPending);
  const mutationError = googleLoginMutation.error || appleLoginMutation.error;
  const authErrorMessage = mutationError ? toAuthErrorMessage(mutationError) : null;
  const isSocialLoading =
    googleLoginMutation.isPending || appleLoginMutation.isPending;

  if (isSessionLoading) {
    return <AppScreenSkeleton lineCount={6} />;
  }

  if (sessionQuery.isError) {
    return (
      <AppStateView
        title="인증 초기화 오류"
        description={toAuthErrorMessage(sessionQuery.error)}
        actionLabel="다시 시도"
        onAction={() => {
          resetAuthError();
          sessionQuery.refetch();
        }}
        tone="error"
      />
    );
  }

  if (sessionQuery.data) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <AppText variant="headline" weight="bold">
          DailyFit 로그인
        </AppText>
        <AppText style={styles.description} variant="body">
          Google 또는 Apple 계정으로 빠르게 시작하세요.
        </AppText>
        {authErrorMessage ? (
          <AppText style={styles.errorText} variant="caption">
            {authErrorMessage}
          </AppText>
        ) : null}
        <AppButton
          label="Google로 로그인"
          loading={googleLoginMutation.isPending}
          disabled={isSocialLoading}
          onPress={() => {
            resetAuthError();
            googleLoginMutation.mutate();
          }}
        />
        <AppButton
          label="Apple로 로그인"
          variant="secondary"
          loading={appleLoginMutation.isPending}
          disabled={isSocialLoading}
          onPress={() => {
            resetAuthError();
            appleLoginMutation.mutate();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    backgroundColor: colors.background,
  },
  card: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  description: {
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.destructive,
  },
});
