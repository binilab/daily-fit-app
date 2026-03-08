import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  AppButton,
  AppScreenSkeleton,
  AppStateView,
  AppText,
} from '../../src/components/common';
import { colors, spacing } from '../../src/design/tokens';
import { toAuthErrorMessage, useAuthSession } from '../../src/features/auth';
import {
  MAX_OUTFIT_IMAGE_COUNT,
  type OutfitImageAsset,
  useOutfitUpload,
} from '../../src/features/upload';
import { useSmoothLoading } from '../../src/hooks/useSmoothLoading';

// 이미지 picker 결과를 앱 내부 업로드 타입으로 변환한다.
function toOutfitImageAsset(asset: ImagePicker.ImagePickerAsset): OutfitImageAsset {
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
  };
}

// 업로드 탭의 이미지 선택/미리보기/업로드 흐름을 담당한다.
export default function UploadTabScreen() {
  const [selectedImages, setSelectedImages] = useState<OutfitImageAsset[]>([]);
  const [pickerErrorMessage, setPickerErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { sessionQuery } = useAuthSession();
  const { uploadMutation } = useOutfitUpload();
  const isSessionLoading = useSmoothLoading(sessionQuery.isPending);
  const uploadErrorMessage = uploadMutation.error
    ? toAuthErrorMessage(uploadMutation.error)
    : null;

  // 사용자의 사진 라이브러리에서 이미지를 선택한다.
  const handleSelectImages = async () => {
    setPickerErrorMessage(null);
    setSuccessMessage(null);

    const remain = MAX_OUTFIT_IMAGE_COUNT - selectedImages.length;

    if (remain <= 0) {
      setPickerErrorMessage('이미지는 최대 3장까지 선택할 수 있습니다.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setPickerErrorMessage('사진 접근 권한이 필요합니다. 설정에서 권한을 허용해 주세요.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remain,
      quality: 1,
      orderedSelection: true,
    });

    if (pickerResult.canceled || !pickerResult.assets?.length) {
      return;
    }

    setSelectedImages((prev) => {
      const mappedAssets = pickerResult.assets.map(toOutfitImageAsset);
      const merged = [...prev, ...mappedAssets];
      const uniqueByUri = merged.filter(
        (image, index, array) =>
          array.findIndex((target) => target.uri === image.uri) === index,
      );

      return uniqueByUri.slice(0, MAX_OUTFIT_IMAGE_COUNT);
    });
  };

  // 선택된 이미지 한 장을 업로드 목록에서 제거한다.
  const handleRemoveImage = (targetUri: string) => {
    setSelectedImages((prev) => prev.filter((image) => image.uri !== targetUri));
  };

  // 선택된 이미지로 게시글 업로드를 실행한다.
  const handleUpload = () => {
    if (!sessionQuery.data) {
      return;
    }

    setPickerErrorMessage(null);

    uploadMutation.mutate(
      {
        userId: sessionQuery.data.user.id,
        images: selectedImages,
      },
      {
        onSuccess: (result) => {
          setSelectedImages([]);
          setSuccessMessage(`업로드 완료: post_id ${result.postId}`);
        },
      },
    );
  };

  if (isSessionLoading) {
    return <AppScreenSkeleton lineCount={4} />;
  }

  if (sessionQuery.isError) {
    return (
      <AppStateView
        title="업로드 로딩 오류"
        description={toAuthErrorMessage(sessionQuery.error)}
        actionLabel="다시 시도"
        onAction={() => sessionQuery.refetch()}
        tone="error"
      />
    );
  }

  if (!sessionQuery.data) {
    return <Redirect href="/" />;
  }

  if (selectedImages.length === 0) {
    const emptyDescription = successMessage
      ? `${successMessage}\n다음 코디 이미지를 선택해 주세요.`
      : '선택한 이미지가 없습니다. 코디 이미지를 최대 3장까지 선택해 주세요.';

    return (
      <AppStateView
        title="업로드할 초안이 없습니다"
        description={emptyDescription}
        actionLabel="이미지 선택"
        onAction={handleSelectImages}
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <AppText variant="title" weight="semibold">
          코디 업로드
        </AppText>
        <AppText style={styles.description} variant="body">
          이미지 {selectedImages.length}/{MAX_OUTFIT_IMAGE_COUNT}
        </AppText>
      </View>

      <View style={styles.previewGrid}>
        {selectedImages.map((image) => (
          <View key={image.uri} style={styles.previewItem}>
            <Image
              source={{ uri: image.uri }}
              contentFit="cover"
              transition={120}
              style={styles.previewImage}
            />
            <Pressable
              style={styles.removeButton}
              onPress={() => handleRemoveImage(image.uri)}
            >
              <AppText style={styles.removeButtonText} variant="caption" weight="semibold">
                삭제
              </AppText>
            </Pressable>
          </View>
        ))}
      </View>

      {pickerErrorMessage ? (
        <AppText style={styles.errorText} variant="caption">
          {pickerErrorMessage}
        </AppText>
      ) : null}
      {uploadErrorMessage ? (
        <AppText style={styles.errorText} variant="caption">
          {uploadErrorMessage}
        </AppText>
      ) : null}

      <View style={styles.buttonGroup}>
        <AppButton
          label="이미지 추가 선택"
          variant="secondary"
          disabled={uploadMutation.isPending}
          onPress={handleSelectImages}
        />
        <AppButton
          label="업로드 실행"
          loading={uploadMutation.isPending}
          onPress={handleUpload}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  headerCard: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  description: {
    color: colors.textSecondary,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  previewItem: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    backgroundColor: colors.overlay,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  removeButtonText: {
    color: colors.surface,
  },
  errorText: {
    color: colors.destructive,
  },
  buttonGroup: {
    gap: spacing.md,
  },
});
