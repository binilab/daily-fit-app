import type { ReactNode } from 'react';
import type { StyleProp, TextProps, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';
import { colors, typography } from '../../design/tokens';

type TextVariant = 'headline' | 'title' | 'body' | 'caption';
type TextWeight = keyof typeof typography.fontWeight;

type AppTextProps = TextProps & {
  children: ReactNode;
  variant?: TextVariant;
  weight?: TextWeight;
  style?: StyleProp<TextStyle>;
};

const variantStyleMap: Record<TextVariant, TextStyle> = {
  headline: {
    fontSize: typography.fontSize.headline,
    lineHeight: typography.lineHeight.headline,
    fontFamily: typography.fontFamily.heading,
  },
  title: {
    fontSize: typography.fontSize.title,
    lineHeight: typography.lineHeight.title,
    fontFamily: typography.fontFamily.heading,
  },
  body: {
    fontSize: typography.fontSize.body,
    lineHeight: typography.lineHeight.body,
    fontFamily: typography.fontFamily.base,
  },
  caption: {
    fontSize: typography.fontSize.caption,
    lineHeight: typography.lineHeight.caption,
    fontFamily: typography.fontFamily.base,
  },
};

// 앱 전역 타이포 토큰을 일관되게 적용하기 위한 기본 텍스트 컴포넌트다.
export function AppText({
  children,
  variant = 'body',
  weight = 'regular',
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      style={[
        styles.base,
        variantStyleMap[variant],
        { fontWeight: typography.fontWeight[weight] },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.textPrimary,
  },
});
