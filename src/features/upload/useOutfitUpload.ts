import { useMutation } from '@tanstack/react-query';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase, supabaseConfigError } from '../../lib/supabase';

export const MAX_OUTFIT_IMAGE_COUNT = 3;
const OUTFIT_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_OUTFIT_BUCKET ?? 'outfits';
const POSTS_TABLE = process.env.EXPO_PUBLIC_SUPABASE_POSTS_TABLE ?? 'posts';

export type OutfitImageAsset = {
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
  mimeType?: string | null;
};

type UploadOutfitInput = {
  userId: string;
  images: OutfitImageAsset[];
};

type UploadOutfitResult = {
  postId: string;
  imageUrls: string[];
};

// 업로드 에러를 사용자에게 안내 가능한 메시지로 변환한다.
function toUploadErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    const message = error.message;

    if (message.includes('Bucket not found')) {
      return new Error(
        "Supabase Storage에 'outfits' 버킷이 없습니다. 버킷을 생성해 주세요.",
      );
    }

    if (message.includes('row-level security policy')) {
      return new Error('Storage 또는 posts 테이블의 RLS 정책을 확인해 주세요.');
    }

    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const code = Reflect.get(error, 'code');
    const message = Reflect.get(error, 'message');

    if (code === 'PGRST205') {
      return new Error(
        "Supabase에 'public.posts' 테이블이 없습니다. posts 테이블을 먼저 생성해 주세요.",
      );
    }

    if (typeof message === 'string' && message.length > 0) {
      return new Error(message);
    }
  }

  return new Error(fallbackMessage);
}

// 로컬 이미지를 업로드 용량 절감을 위해 JPEG로 압축한다.
async function compressImage(image: OutfitImageAsset) {
  const targetWidth = image.width > 1440 ? 1440 : image.width;
  const shouldResize = image.width > 1440;

  const manipulated = await ImageManipulator.manipulateAsync(
    image.uri,
    shouldResize ? [{ resize: { width: targetWidth } }] : [],
    {
      compress: 0.82,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return {
    uri: manipulated.uri,
    mimeType: 'image/jpeg',
  };
}

// Supabase Storage에 이미지를 업로드하고 공개 URL을 반환한다.
async function uploadImageToStorage(params: {
  userId: string;
  image: OutfitImageAsset;
  index: number;
}) {
  const compressedImage = await compressImage(params.image);
  const filePath = `${params.userId}/${Date.now()}-${params.index}.jpg`;
  const fileResponse = await fetch(compressedImage.uri);
  const fileBuffer = await fileResponse.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(OUTFIT_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: compressedImage.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw toUploadErrorMessage(uploadError, '이미지 업로드에 실패했습니다.');
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(OUTFIT_BUCKET).getPublicUrl(filePath);

  return { filePath, publicUrl };
}

// 업로드된 이미지 정보를 posts 테이블에 기록한다.
async function createPostRecord(params: {
  userId: string;
  imagePaths: string[];
  imageUrls: string[];
}) {
  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .insert({
      author_id: params.userId,
      image_paths: params.imagePaths,
      image_urls: params.imageUrls,
      image_count: params.imageUrls.length,
    })
    .select('id')
    .single();

  if (error) {
    throw toUploadErrorMessage(error, '게시글 저장에 실패했습니다.');
  }

  return data.id as string;
}

// 코디 이미지를 업로드하고 게시글을 생성하는 핵심 업로드 로직이다.
async function uploadOutfit({ userId, images }: UploadOutfitInput) {
  if (supabaseConfigError) {
    throw new Error(supabaseConfigError);
  }

  if (images.length === 0) {
    throw new Error('업로드할 이미지를 먼저 선택해 주세요.');
  }

  if (images.length > MAX_OUTFIT_IMAGE_COUNT) {
    throw new Error('이미지는 최대 3장까지 업로드할 수 있습니다.');
  }

  const uploadedImages = await Promise.all(
    images.map((image, index) => uploadImageToStorage({ userId, image, index })),
  );
  const imagePaths = uploadedImages.map((item) => item.filePath);
  const imageUrls = uploadedImages.map((item) => item.publicUrl);
  const postId = await createPostRecord({ userId, imagePaths, imageUrls });

  return {
    postId,
    imageUrls,
  } satisfies UploadOutfitResult;
}

// 업로드 mutation 상태를 관리하기 위한 업로드 전용 훅이다.
export function useOutfitUpload() {
  const uploadMutation = useMutation({
    mutationFn: uploadOutfit,
  });

  return {
    uploadMutation,
  };
}
