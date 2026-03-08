import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  AppButton,
  AppScreenSkeleton,
  AppStateView,
  AppText,
} from '../../src/components/common';
import { colors, spacing } from '../../src/design/tokens';
import { toAuthErrorMessage, useAuthSession } from '../../src/features/auth';
import { useSmoothLoading } from '../../src/hooks/useSmoothLoading';

// 프로필 탭에서 현재 로그인 사용자 정보와 로그아웃 액션을 제공한다.
export default function ProfileTabScreen() {
  const { sessionQuery, signOutMutation, resetAuthError } = useAuthSession();
  const isSessionLoading = useSmoothLoading(sessionQuery.isPending);
  const signOutErrorMessage = signOutMutation.error
    ? toAuthErrorMessage(signOutMutation.error)
    : null;

  if (isSessionLoading) {
    return <AppScreenSkeleton lineCount={4} />;
  }

  if (sessionQuery.isError) {
    return (
      <AppStateView
        title="프로필 로딩 오류"
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

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <AppText variant="title" weight="semibold">
          내 프로필
        </AppText>
        <AppText style={styles.value} variant="body">
          {sessionQuery.data.user.email ?? sessionQuery.data.user.id}
        </AppText>
        {signOutErrorMessage ? (
          <AppText style={styles.errorText} variant="caption">
            {signOutErrorMessage}
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
  value: {
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.destructive,
  },
});
