import React from 'react';
import { BaseTextArea } from './BaseTextArea';
import { ImagePickerField } from './ImagePickerField';

export interface FormFieldConfig {
  name: string;
  type: 'textarea' | 'imagePicker';
  placeholder?: string;
  maxLines?: number;
}

interface DynamicFormProps {
  config: FormFieldConfig[];
  values: any;
  onChange: (name: string, value: any) => void;
}

export const DynamicForm = ({ config, values, onChange }: DynamicFormProps) => {
  return (
    <>
      {config.map((field) => {
        switch (field.type) {
          case 'textarea':
            return (
              <BaseTextArea
                key={field.name}
                name={field.name}
                placeholder={field.placeholder}
                maxLines={field.maxLines}
                value={values[field.name] || ''}
                onChangeText={(val) => onChange(field.name, val)}
              />
            );
          case 'imagePicker':
            return (
              <ImagePickerField
                key={field.name}
                name={field.name}
                placeholder={field.placeholder}
                value={values[field.name] || ''}
                onSelect={(val) => onChange(field.name, val)}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
};
