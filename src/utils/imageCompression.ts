import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Action, manipulateAsync, SaveFormat } from "expo-image-manipulator";
const IMAGE_MAX_EDGE = 1920;

export const IMAGE_COMPRESSION = {
  targetQuality: 0.45,
} as const;

type CompressInput = {
  uri: string;
  width?: number;
  height?: number;
};

const buildResizeAction = (width?: number, height?: number): Action[] => {
  if (!width || !height) return [];
  const longestEdge = Math.max(width, height);
  if (longestEdge <= IMAGE_MAX_EDGE) return [];

  if (width >= height) {
    return [{ resize: { width: IMAGE_MAX_EDGE } }];
  }
  return [{ resize: { height: IMAGE_MAX_EDGE } }];
};

export const compressImageForUpload = async ({
  uri,
  width,
  height,
}: CompressInput): Promise<string> => {
  const compressedResult = await manipulateAsync(
    uri,
    buildResizeAction(width, height),
    {
      compress: IMAGE_COMPRESSION.targetQuality,
      format: SaveFormat.JPEG,
    },
  );
  return compressedResult.uri;
};

export const getFileSizeBytes = async (uri: string): Promise<number | null> => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof info.size === "number" && info.size > 0) {
      return info.size;
    }
  } catch {
    // Fall through to alternate strategies.
  }

  try {
    const file = new FileSystem.File(uri);
    const info = file.info();
    if (typeof info.size === "number" && info.size > 0) {
      return info.size;
    }
    if (typeof file.size === "number" && file.size > 0) {
      return file.size;
    }
  } catch {
    // Fall through to fetch-based fallback.
  }

  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    if (typeof blob.size === "number" && blob.size > 0) {
      return blob.size;
    }
  } catch {
    return null;
  }

  return null;
};

export const formatFileSize = (sizeBytes: number): string => {
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const buildCompressionSummary = (
  originalSize: number | null,
  compressedSize: number | null,
): string => {
  if (originalSize === null && compressedSize === null) return "압축 완료";
  if (originalSize === null && compressedSize !== null) return `압축 후 파일 크기: ${formatFileSize(compressedSize)}`;
  if (originalSize !== null && compressedSize === null) return `원본 파일 크기: ${formatFileSize(originalSize)}`;
  if (originalSize === null || compressedSize === null) return "압축 완료";
  if (originalSize === 0) return `원본 ${formatFileSize(originalSize)} -> 압축 ${formatFileSize(compressedSize)}`;

  const reductionPercent = Math.max(0, Math.round((1 - compressedSize / originalSize) * 100));
  return `원본 ${formatFileSize(originalSize)} -> 압축 ${formatFileSize(compressedSize)}, ${reductionPercent}% 감소`;
};

export const getLibraryPickerOptions = (): ImagePicker.ImagePickerOptions => ({
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [4, 3],
  quality: 1,
});

export const getMissionCameraOptions = (): ImagePicker.ImagePickerOptions => ({
  mediaTypes: ["images"],
  allowsEditing: false,
  quality: 1,
});

export const getCameraCaptureOptions = () => ({
  quality: 1,
  skipProcessing: false,
});
