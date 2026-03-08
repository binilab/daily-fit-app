import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../design/tokens';
import { AppButton } from './AppButton';
import { AppText } from './AppText';

type AppStateViewProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'error';
};

// 로딩 이후 빈 상태/오류 상태를 공통 톤으로 보여주는 상태 뷰 컴포넌트다.
export function AppStateView({
  title,
  description,
  actionLabel,
  onAction,
  tone = 'default',
}: AppStateViewProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <AppText variant="title" weight="semibold">
          {title}
        </AppText>
        <AppText
          style={[
            styles.description,
            tone === 'error' ? styles.errorText : undefined,
          ]}
          variant="body"
        >
          {description}
        </AppText>
        {actionLabel && onAction ? (
          <AppButton
            label={actionLabel}
            onPress={onAction}
            variant={tone === 'error' ? 'danger' : 'secondary'}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
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
  description: {
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.destructive,
  },
});
