import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { useController, useFormContext } from 'react-hook-form';
import { styles } from '../../styles/globalStyles';

interface BaseTextAreaProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  name: string;
  maxLines?: number;
}

export const BaseTextArea = ({ name, maxLines = 4, ...props }: BaseTextAreaProps) => {
  const { control } = useFormContext();
  const { field } = useController({ name, control });

  return (
    <TextInput
      style={[styles.input, styles.textArea]}
      placeholderTextColor="#8b8b8b"
      value={field.value}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      multiline
      numberOfLines={maxLines}
      {...props}
    />
  );
};
