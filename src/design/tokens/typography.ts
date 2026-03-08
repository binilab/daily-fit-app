import { Platform } from 'react-native';

const baseFamily =
  Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }) ?? 'System';

export const typography = {
  fontFamily: {
    // 추후 Pretendard 파일 연동 시 base/heading만 교체하면 전체 타이포가 반영된다.
    base: baseFamily,
    heading: baseFamily,
  },
  fontSize: {
    caption: 12,
    body: 16,
    title: 20,
    headline: 30,
  },
  lineHeight: {
    caption: 18,
    body: 24,
    title: 28,
    headline: 38,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;
