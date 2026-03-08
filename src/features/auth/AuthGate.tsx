import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppButton, AppText } from '../../components/common';
import { colors, spacing } from '../../design/tokens';
import { useAuthSession } from './useAuthSession';

// 런타임 오류 객체를 사용자 노출용 메시지로 변환한다.
function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return '인증 처리 중 알 수 없는 오류가 발생했습니다.';
}

// 인증 상태에 따라 로그인 화면과 세션 화면을 분기하는 루트 인증 컴포넌트다.
export function AuthGate() {
  const {
    sessionQuery,
    googleLoginMutation,
    appleLoginMutation,
    signOutMutation,
    resetAuthError,
  } = useAuthSession();

  const session = sessionQuery.data;
  const sessionError = sessionQuery.error;
  const mutationError =
    googleLoginMutation.error || appleLoginMutation.error || signOutMutation.error;
  const authErrorMessage =
    mutationError || sessionError ? toErrorMessage(mutationError || sessionError) : null;
  const isSocialLoading =
    googleLoginMutation.isPending || appleLoginMutation.isPending;

  if (sessionQuery.isPending) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText style={styles.statusText} variant="body">
          세션을 확인하는 중입니다.
        </AppText>
      </View>
    );
  }

  if (sessionQuery.isError) {
    return (
      <View style={styles.centeredContainer}>
        <AppText style={styles.errorTitle} variant="title" weight="semibold">
          인증 초기화 오류
        </AppText>
        <AppText style={styles.errorBody} variant="body">
          {toErrorMessage(sessionQuery.error)}
        </AppText>
        <AppButton label="다시 시도" onPress={() => sessionQuery.refetch()} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.card}>
          <AppText variant="headline" weight="bold">
            DailyFit 로그인
          </AppText>
          <AppText style={styles.emptyText} variant="body">
            로그인된 세션이 없습니다. 소셜 계정으로 로그인해 주세요.
          </AppText>
          {authErrorMessage ? (
            <AppText style={styles.errorBody} variant="caption">
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

  return (
    <View style={styles.centeredContainer}>
      <View style={styles.card}>
        <AppText variant="headline" weight="bold">
          로그인 완료
        </AppText>
        <AppText style={styles.userText} variant="body">
          {session.user.email ?? session.user.id}
        </AppText>
        {authErrorMessage ? (
          <AppText style={styles.errorBody} variant="caption">
            {authErrorMessage}
          </AppText>
        ) : null}
        <AppButton
          label="로그아웃"
          variant="ghost"
          loading={signOutMutation.isPending}
          onPress={() => {
            resetAuthError();
            signOutMutation.mutate();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    backgroundColor: colors.background,
  },
  statusText: {
    marginTop: spacing.md,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  card: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
  },
  errorTitle: {
    textAlign: 'center',
  },
  errorBody: {
    color: colors.destructive,
  },
  userText: {
    color: colors.textSecondary,
  },
});
