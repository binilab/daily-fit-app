import { Redirect, Tabs } from 'expo-router';
import { AppScreenSkeleton, AppStateView } from '../../src/components/common';
import { colors } from '../../src/design/tokens';
import { toAuthErrorMessage, useAuthSession } from '../../src/features/auth';
import { useMyProfile } from '../../src/features/profile';
import { useSmoothLoading } from '../../src/hooks/useSmoothLoading';

// 로그인된 사용자만 탭 네비게이션으로 진입시키는 보호 레이아웃이다.
export default function TabsLayout() {
  const { sessionQuery } = useAuthSession();
  useMyProfile(sessionQuery.data);
  const isSessionLoading = useSmoothLoading(sessionQuery.isPending);

  if (isSessionLoading) {
    return <AppScreenSkeleton lineCount={4} />;
  }

  if (sessionQuery.isError) {
    return (
      <AppStateView
        title="세션 확인 오류"
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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          height: 58,
          paddingBottom: 6,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          tabBarLabel: '홈',
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: '업로드',
          tabBarLabel: '업로드',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarLabel: '프로필',
        }}
      />
    </Tabs>
  );
}
