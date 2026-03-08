import type { ReactNode } from 'react';
import type { PressableProps, ViewStyle } from 'react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../design/tokens';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type AppButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftSlot?: ReactNode;
};

const sizeStyleMap: Record<ButtonSize, ViewStyle> = {
  sm: { minHeight: 40, paddingHorizontal: spacing.md },
  md: { minHeight: 48, paddingHorizontal: spacing.lg },
  lg: { minHeight: 54, paddingHorizontal: spacing.xl },
};

// 버튼 톤과 눌림 상태에 맞는 배경색을 반환한다.
function getContainerColor(variant: ButtonVariant, pressed: boolean) {
  if (variant === 'primary') {
    return pressed ? colors.primaryPressed : colors.primary;
  }

  if (variant === 'secondary') {
    return pressed ? colors.secondaryPressed : colors.secondary;
  }

  if (variant === 'danger') {
    return pressed ? colors.destructivePressed : colors.destructive;
  }

  return 'transparent';
}

// 버튼 톤에 맞춰 텍스트 색상을 반환한다.
function getTextColor(variant: ButtonVariant) {
  if (variant === 'primary' || variant === 'danger') {
    return colors.surface;
  }

  if (variant === 'secondary') {
    return colors.textPrimary;
  }

  return colors.textSecondary;
}

// 공통 액션 버튼의 톤/사이즈/로딩 상태를 통일하기 위한 버튼 컴포넌트다.
export function AppButton({
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = true,
  leftSlot,
  ...props
}: AppButtonProps) {
  const effectiveDisabled = disabled || loading;
  const textColor = getTextColor(variant);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={effectiveDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyleMap[size],
        {
          backgroundColor: getContainerColor(variant, pressed),
          borderColor: variant === 'ghost' ? colors.border : 'transparent',
          borderWidth: variant === 'ghost' ? StyleSheet.hairlineWidth : 0,
          opacity: effectiveDisabled ? 0.45 : 1,
          width: fullWidth ? '100%' : undefined,
        },
      ]}
      {...props}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={textColor} size="small" /> : leftSlot}
        <AppText
          style={[styles.label, { color: textColor }]}
          variant="body"
          weight="semibold"
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.body,
    lineHeight: typography.lineHeight.body,
  },
});
