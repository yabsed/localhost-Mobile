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
}

export const DynamicForm = ({ config }: DynamicFormProps) => {
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
              />
            );
          case 'imagePicker':
            return (
              <ImagePickerField
                key={field.name}
                name={field.name}
                placeholder={field.placeholder}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
};
