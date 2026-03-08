import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import {
  AppBottomSheet,
  AppButton,
  AppModal,
  AppText,
} from './src/components/common';
import { colors, spacing } from './src/design/tokens';

const colorPreviewItems = [
  { label: 'Primary', value: colors.primary },
  { label: 'Surface', value: colors.surface },
  { label: 'Background', value: colors.background },
  { label: 'Border', value: colors.border },
];

// 공통 디자인 시스템 토큰과 컴포넌트 사용 예시를 보여주는 루트 화면이다.
export default function App() {
  const [isModalVisible, setModalVisible] = useState(false);
  const [isBottomSheetVisible, setBottomSheetVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="headline">DailyFit Design System</AppText>
        <AppText style={styles.description} variant="body">
          T-000 범위에서 구축한 UI 토큰과 공통 컴포넌트 미리보기 화면
        </AppText>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle} variant="title">
            Button
          </AppText>
          <AppButton label="Primary Button" />
          <AppButton label="Secondary Button" variant="secondary" />
          <AppButton label="Ghost Button" variant="ghost" />
          <AppButton label="Danger Button" variant="danger" />
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle} variant="title">
            Overlay Components
          </AppText>
          <AppButton
            label="Modal 열기"
            onPress={() => setModalVisible(true)}
            variant="secondary"
          />
          <AppButton
            label="BottomSheet 열기"
            onPress={() => setBottomSheetVisible(true)}
            variant="secondary"
          />
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle} variant="title">
            Color Tokens
          </AppText>
          <View style={styles.paletteList}>
            {colorPreviewItems.map((item) => (
              <View key={item.label} style={styles.paletteItem}>
                <View
                  style={[styles.paletteSwatch, { backgroundColor: item.value }]}
                />
                <View style={styles.paletteLabelGroup}>
                  <AppText variant="body">{item.label}</AppText>
                  <AppText variant="caption" style={styles.paletteValue}>
                    {item.value}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <AppModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        title="공통 모달"
        description="불필요한 장식을 줄이고 핵심 정보 전달에 집중한 기본 모달입니다."
      >
        <AppButton label="닫기" onPress={() => setModalVisible(false)} />
      </AppModal>

      <AppBottomSheet
        visible={isBottomSheetVisible}
        onClose={() => setBottomSheetVisible(false)}
        title="공통 바텀시트"
      >
        <AppText style={styles.sheetDescription} variant="body">
          컨텐츠 영역은 각 기능 화면에서 자유롭게 조합해 재사용할 수 있습니다.
        </AppText>
        <AppButton
          label="확인"
          onPress={() => setBottomSheetVisible(false)}
          variant="secondary"
        />
      </AppBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl * 2,
    gap: spacing.xl,
  },
  description: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  section: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  paletteList: {
    gap: spacing.md,
  },
  paletteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  paletteSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  paletteLabelGroup: {
    gap: spacing.xs,
  },
  paletteValue: {
    color: colors.textSecondary,
  },
  sheetDescription: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
});
