import React from 'react';
import { TouchableOpacity, Text, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { styles } from '../../styles/globalStyles';

interface ImagePickerFieldProps {
  name: string;
  value: string;
  onSelect: (uri: string) => void;
  placeholder?: string;
}

export const ImagePickerField = ({ name, value, onSelect, placeholder = "사진 추가" }: ImagePickerFieldProps) => {
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      onSelect(result.assets[0].uri);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
        <Text style={styles.photoButtonText}>{value ? "사진 변경" : placeholder}</Text>
      </TouchableOpacity>
      {value && <Image source={{ uri: value }} style={styles.previewImage} />}
    </>
  );
};
