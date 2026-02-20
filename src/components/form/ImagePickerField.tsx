import React from 'react';
import { TouchableOpacity, Text, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useController, useFormContext } from 'react-hook-form';
import { styles } from '../../styles/globalStyles';

interface ImagePickerFieldProps {
  name: string;
  placeholder?: string;
}

export const ImagePickerField = ({ name, placeholder = "사진 추가" }: ImagePickerFieldProps) => {
  const { control } = useFormContext();
  const { field } = useController({ name, control });

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      field.onChange(result.assets[0].uri);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
        <Text style={styles.photoButtonText}>{field.value ? "사진 변경" : placeholder}</Text>
      </TouchableOpacity>
      {field.value && <Image source={{ uri: field.value }} style={styles.previewImage} />}
    </>
  );
};
