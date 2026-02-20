import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { styles } from '../../styles/globalStyles';

interface BaseInputProps extends TextInputProps {
  name: string;
  value: string;
  onChangeText: (text: string) => void;
}

export const BaseInput = ({ name, value, onChangeText, ...props }: BaseInputProps) => {
  return (
    <TextInput
      style={styles.input}
      placeholderTextColor="#8b8b8b"
      value={value}
      onChangeText={onChangeText}
      {...props}
    />
  );
};
