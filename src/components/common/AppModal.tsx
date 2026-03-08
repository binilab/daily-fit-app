import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../../design/tokens';
import { AppText } from './AppText';

type AppModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
};

// 핵심 정보 전달에 집중한 기본 센터 모달 컴포넌트다.
export function AppModal({
  visible,
  onClose,
  title,
  description,
  children,
}: AppModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <AppText variant="title" weight="semibold">
            {title}
          </AppText>
          {description ? (
            <AppText style={styles.description} variant="body">
              {description}
            </AppText>
          ) : null}
          {children ? <View style={styles.content}>{children}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.overlay,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.floating,
  },
  description: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  content: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
});
