import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { colors, radius, shadows, spacing } from '../../design/tokens';
import { AppText } from './AppText';

type AppBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  height?: number;
};

// 열림/닫힘 애니메이션과 배경 터치 닫기를 제공하는 공통 바텀시트 컴포넌트다.
export function AppBottomSheet({
  visible,
  onClose,
  title,
  children,
  height = 380,
}: AppBottomSheetProps) {
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [progress, visible]);

  const sheetStyle = useMemo(
    () => ({
      height,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [height, 0],
          }),
        },
      ],
    }),
    [height, progress],
  );

  const overlayStyle = useMemo(
    () => ({
      opacity: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    }),
    [progress],
  );

  if (!mounted) {
    return null;
  }

  return (
    <Modal transparent visible={mounted} onRequestClose={onClose}>
      <View style={styles.container}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={styles.overlayPressable} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />
          {title ? (
            <AppText style={styles.title} variant="title" weight="semibold">
              {title}
            </AppText>
          ) : null}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  overlayPressable: {
    flex: 1,
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    ...shadows.floating,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  title: {
    marginTop: spacing.md,
  },
  content: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
});
