import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import {
  AppScreenSkeleton,
  AppStateView,
  AppText,
} from '../../src/components/common';
import { colors, spacing } from '../../src/design/tokens';
import { useSmoothLoading } from '../../src/hooks/useSmoothLoading';
import { wait } from '../../src/utils/wait';

type HomeBootstrapData = {
  notice: string;
  todayMission: string;
};

// 홈 탭의 초기 구성을 준비하는 부트스트랩 데이터를 조회한다.
async function fetchHomeBootstrap() {
  await wait(520);

  return {
    notice: '오늘의 코디 한 장만 올려도 피드백 루프가 시작됩니다.',
    todayMission: '첫 포스트를 업로드하고 투표 5개를 받아보세요.',
  } satisfies HomeBootstrapData;
}

// 앱의 홈 탭 기본 화면과 초기 로딩 상태를 담당한다.
export default function HomeTabScreen() {
  const homeQuery = useQuery({
    queryKey: ['tabs', 'home', 'bootstrap'],
    queryFn: fetchHomeBootstrap,
  });
  const isLoading = useSmoothLoading(homeQuery.isPending);

  if (isLoading) {
    return <AppScreenSkeleton />;
  }

  if (homeQuery.isError) {
    return (
      <AppStateView
        title="홈 로딩 오류"
        description="홈 화면 정보를 불러오지 못했습니다."
        actionLabel="다시 시도"
        onAction={() => homeQuery.refetch()}
        tone="error"
      />
    );
  }

  if (!homeQuery.data) {
    return (
      <AppStateView
        title="홈 데이터 없음"
        description="표시할 홈 정보가 아직 없습니다."
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <AppText variant="title" weight="semibold">
          홈 피드 준비 완료
        </AppText>
        <AppText style={styles.heroDescription} variant="body">
          {homeQuery.data.notice}
        </AppText>
      </View>
      <View style={styles.missionCard}>
        <AppText variant="body" weight="semibold">
          오늘의 미션
        </AppText>
        <AppText style={styles.missionDescription} variant="body">
          {homeQuery.data.todayMission}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  heroDescription: {
    color: colors.textSecondary,
  },
  missionCard: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  missionDescription: {
    color: colors.textSecondary,
  },
});
