import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { styles } from '../../styles/globalStyles';

interface BaseTextAreaProps extends TextInputProps {
  name: string;
  value: string;
  onChangeText: (text: string) => void;
  maxLines?: number;
}

export const BaseTextArea = ({ name, value, onChangeText, maxLines = 4, ...props }: BaseTextAreaProps) => {
  return (
    <TextInput
      style={[styles.input, styles.textArea]}
      placeholderTextColor="#8b8b8b"
      value={value}
      onChangeText={onChangeText}
      multiline
      numberOfLines={maxLines}
      {...props}
    />
  );
};
