import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import {
  AppButton,
  AppScreenSkeleton,
  AppStateView,
  AppText,
} from '../../src/components/common';
import { colors, spacing } from '../../src/design/tokens';
import { useSmoothLoading } from '../../src/hooks/useSmoothLoading';
import { wait } from '../../src/utils/wait';

type UploadBootstrapData = {
  draftCount: number;
};

// 업로드 탭의 초기 상태를 조회해 스켈레톤 이후 빈 상태를 보여준다.
async function fetchUploadBootstrap() {
  await wait(540);

  return {
    draftCount: 0,
  } satisfies UploadBootstrapData;
}

// 업로드 탭의 초기 안내 UI와 상태 화면을 담당한다.
export default function UploadTabScreen() {
  const uploadQuery = useQuery({
    queryKey: ['tabs', 'upload', 'bootstrap'],
    queryFn: fetchUploadBootstrap,
  });
  const isLoading = useSmoothLoading(uploadQuery.isPending);

  if (isLoading) {
    return <AppScreenSkeleton lineCount={4} />;
  }

  if (uploadQuery.isError) {
    return (
      <AppStateView
        title="업로드 로딩 오류"
        description="업로드 화면을 준비하지 못했습니다."
        actionLabel="다시 시도"
        onAction={() => uploadQuery.refetch()}
        tone="error"
      />
    );
  }

  if (!uploadQuery.data || uploadQuery.data.draftCount === 0) {
    return (
      <AppStateView
        title="업로드할 초안이 없습니다"
        description="첫 코디 사진을 선택해 업로드 흐름을 시작해 주세요."
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <AppText variant="title" weight="semibold">
          업로드 초안 {uploadQuery.data.draftCount}개
        </AppText>
        <AppButton label="업로드 계속하기" />
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
});
