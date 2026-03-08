import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/design/tokens';
import { AppProviders } from '../src/providers/AppProviders';

// 앱 전체 라우트에 공통 Provider와 기본 화면 옵션을 적용하는 루트 레이아웃이다.
export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </AppProviders>
  );
}
