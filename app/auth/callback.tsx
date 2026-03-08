import { Redirect } from 'expo-router';
import { AppScreenSkeleton } from '../../src/components/common';
import { useAuthSession } from '../../src/features/auth';
import { useSmoothLoading } from '../../src/hooks/useSmoothLoading';

// OAuth 콜백 딥링크 복귀 시 세션 동기화를 기다린 뒤 적절한 화면으로 이동시킨다.
export default function AuthCallbackScreen() {
  const { sessionQuery } = useAuthSession();
  const isSessionLoading = useSmoothLoading(sessionQuery.isPending, 300);

  if (isSessionLoading) {
    return <AppScreenSkeleton lineCount={3} />;
  }

  if (sessionQuery.data) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/" />;
}
