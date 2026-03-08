import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../design/tokens';

type AppScreenSkeletonProps = {
  lineCount?: number;
};

// 초기 화면 로딩 시 깜빡임을 줄이기 위한 공통 스켈레톤 화면 컴포넌트다.
export function AppScreenSkeleton({ lineCount = 5 }: AppScreenSkeletonProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 520,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [opacity]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.hero, { opacity }]} />
      <View style={styles.list}>
        {Array.from({ length: lineCount }).map((_, index) => (
          <Animated.View
            key={`skeleton-line-${index}`}
            style={[styles.line, { opacity }]}
          />
        ))}
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
    gap: spacing.xl,
  },
  hero: {
    height: 160,
    borderRadius: 24,
    backgroundColor: colors.secondary,
  },
  list: {
    gap: spacing.md,
  },
  line: {
    height: 18,
    borderRadius: 8,
    backgroundColor: colors.secondary,
  },
});
