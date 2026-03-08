import { useState } from 'react';
import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  AppButton,
  AppModal,
  AppScreenSkeleton,
  AppStateView,
  AppText,
} from '../../src/components/common';
import { colors, spacing } from '../../src/design/tokens';
import { toAuthErrorMessage, useAuthSession } from '../../src/features/auth';
import { useMyProfile } from '../../src/features/profile';
import { useSmoothLoading } from '../../src/hooks/useSmoothLoading';

// 프로필 탭에서 프로필 정보 조회, 로그아웃, 계정 탈퇴 관리를 제공한다.
export default function ProfileTabScreen() {
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const { sessionQuery, signOutMutation, resetAuthError } = useAuthSession();
  const { myProfileQuery, deleteAccountMutation } = useMyProfile(sessionQuery.data);
  const isSessionLoading = useSmoothLoading(sessionQuery.isPending);
  const isProfileLoading = useSmoothLoading(
    Boolean(sessionQuery.data) && myProfileQuery.isPending,
  );
  const signOutErrorMessage = signOutMutation.error
    ? toAuthErrorMessage(signOutMutation.error)
    : null;
  const deleteAccountErrorMessage = deleteAccountMutation.error
    ? toAuthErrorMessage(deleteAccountMutation.error)
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

  if (isProfileLoading) {
    return <AppScreenSkeleton lineCount={4} />;
  }

  if (myProfileQuery.isError) {
    return (
      <AppStateView
        title="프로필 조회 오류"
        description={toAuthErrorMessage(myProfileQuery.error)}
        actionLabel="다시 시도"
        onAction={() => myProfileQuery.refetch()}
        tone="error"
      />
    );
  }

  if (!myProfileQuery.data) {
    return (
      <AppStateView
        title="프로필 데이터 없음"
        description="프로필을 불러오지 못했습니다. 다시 시도해 주세요."
        actionLabel="다시 시도"
        onAction={() => myProfileQuery.refetch()}
      />
    );
  }

  const displayName =
    (typeof myProfileQuery.data.display_name === 'string' &&
      myProfileQuery.data.display_name) ||
    (typeof myProfileQuery.data.username === 'string' &&
      myProfileQuery.data.username) ||
    sessionQuery.data.user.email ||
    sessionQuery.data.user.id;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <AppText variant="title" weight="semibold">
          내 프로필
        </AppText>
        <AppText style={styles.value} variant="body">
          {displayName}
        </AppText>
        <AppText style={styles.caption} variant="caption">
          user_id: {myProfileQuery.data.id}
        </AppText>
        {signOutErrorMessage ? (
          <AppText style={styles.errorText} variant="caption">
            {signOutErrorMessage}
          </AppText>
        ) : null}
        {deleteAccountErrorMessage ? (
          <AppText style={styles.errorText} variant="caption">
            {deleteAccountErrorMessage}
          </AppText>
        ) : null}
        <AppButton
          label="로그아웃"
          variant="ghost"
          disabled={deleteAccountMutation.isPending}
          loading={signOutMutation.isPending}
          onPress={() => {
            resetAuthError();
            signOutMutation.mutate();
          }}
        />
        <AppButton
          label="계정 탈퇴"
          variant="danger"
          disabled={signOutMutation.isPending}
          onPress={() => {
            resetAuthError();
            deleteAccountMutation.reset();
            setDeleteModalVisible(true);
          }}
        />
      </View>

      <AppModal
        visible={isDeleteModalVisible}
        onClose={() => {
          if (!deleteAccountMutation.isPending) {
            setDeleteModalVisible(false);
          }
        }}
        title="계정을 탈퇴할까요?"
        description="탈퇴를 진행하면 계정 및 관련 데이터가 삭제되며 복구할 수 없습니다."
      >
        <AppButton
          label="탈퇴 진행"
          variant="danger"
          loading={deleteAccountMutation.isPending}
          onPress={() => deleteAccountMutation.mutate()}
        />
        <AppButton
          label="취소"
          variant="secondary"
          disabled={deleteAccountMutation.isPending}
          onPress={() => setDeleteModalVisible(false)}
        />
      </AppModal>
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
  caption: {
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.destructive,
  },
});
