import { FormFieldConfig } from './DynamicForm';

export const FORM_CONFIG: Record<string, FormFieldConfig[]> = {
  post: [
    { name: "content", type: "textarea", placeholder: "내용을 입력하세요", maxLines: 4 },
    { name: "photo", type: "imagePicker", placeholder: "사진 추가" }
  ],
  board: [
    { name: "description", type: "textarea", placeholder: "스테이션 설명을 입력하세요", maxLines: 4 },
    { name: "photo", type: "imagePicker", placeholder: "사진 추가" }
  ]
};
