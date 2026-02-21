import React, { useRef, useState } from 'react';
import { Alert, Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useController, useFormContext } from 'react-hook-form';
import { styles } from '../../styles/globalStyles';
import {
  buildCompressionSummary,
  compressImageForUpload,
  getFileSizeBytes,
  getCameraCaptureOptions,
  getLibraryPickerOptions,
} from '../../utils/imageCompression';

interface ImagePickerFieldProps {
  name: string;
  placeholder?: string;
}

export const ImagePickerField = ({ name, placeholder = 'Add photo' }: ImagePickerFieldProps) => {
  const { control } = useFormContext();
  const { field } = useController({ name, control });
  const cameraRef = useRef<CameraView | null>(null);
  const [compressionSummaryLabel, setCompressionSummaryLabel] = useState<string | null>(null);
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const handlePickImage = async () => {
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!mediaPermission.granted) {
      Alert.alert('Permission needed', 'Media library access is required to pick a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync(getLibraryPickerOptions());

    if (!result.canceled && result.assets[0]?.uri) {
      const originalSize = typeof result.assets[0].fileSize === 'number'
        ? result.assets[0].fileSize
        : await getFileSizeBytes(result.assets[0].uri);
      const compressedUri = await compressImageForUpload({
        uri: result.assets[0].uri,
        width: result.assets[0].width,
        height: result.assets[0].height,
      });
      field.onChange(compressedUri);
      const compressedSize = await getFileSizeBytes(compressedUri);
      setCompressionSummaryLabel(buildCompressionSummary(originalSize, compressedSize));
    }
  };

  const handleOpenCamera = async () => {
    if (!cameraPermission?.granted) {
      const permissionResult = await requestCameraPermission();
      if (!permissionResult.granted) {
        Alert.alert('Permission needed', 'Camera access is required to take a photo.');
        return;
      }
    }

    setCameraModalVisible(true);
  };

  const handleCapturePhoto = async () => {
    if (!cameraRef.current) {
      return;
    }

    const result = await cameraRef.current.takePictureAsync(getCameraCaptureOptions());

    if (result?.uri) {
      const originalSize = await getFileSizeBytes(result.uri);
      const compressedUri = await compressImageForUpload({
        uri: result.uri,
        width: result.width,
        height: result.height,
      });
      field.onChange(compressedUri);
      const compressedSize = await getFileSizeBytes(compressedUri);
      setCompressionSummaryLabel(buildCompressionSummary(originalSize, compressedSize));
      setCameraModalVisible(false);
    }
  };

  return (
    <>
      <View style={styles.photoActionRow}>
        <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
          <Text style={styles.photoButtonText}>{field.value ? '갤러리' : placeholder}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoButton} onPress={handleOpenCamera}>
          <Text style={styles.photoButtonText}>카메라</Text>
        </TouchableOpacity>
      </View>

      {field.value && <Image source={{ uri: field.value }} style={styles.previewImage} />}
      {compressionSummaryLabel ? (
        <Text style={styles.previewMetaText}>{compressionSummaryLabel}</Text>
      ) : null}

      <Modal
        visible={cameraModalVisible}
        animationType="slide"
        onRequestClose={() => setCameraModalVisible(false)}
      >
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.cameraView}
            facing={facing}
            mode="picture"
          />

          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, styles.cameraControlButton]}
              onPress={() => setCameraModalVisible(false)}
            >
              <Text style={styles.buttonText}>취소</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, styles.cameraControlButton]}
              onPress={handleCapturePhoto}
            >
              <Text style={styles.buttonText}>촬영</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton, styles.cameraControlButton]}
              onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
            >
              <Text style={styles.buttonText}>전면/후면</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};
