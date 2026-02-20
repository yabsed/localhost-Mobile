import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { useController, useFormContext } from 'react-hook-form';
import { styles } from '../../styles/globalStyles';

interface BaseInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  name: string;
}

export const BaseInput = ({ name, style, ...props }: BaseInputProps) => {
  const { control } = useFormContext();
  const { field } = useController({ name, control });

  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor="#8b8b8b"
      value={field.value}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      {...props}
    />
  );
};
