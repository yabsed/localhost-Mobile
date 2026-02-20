import React, { useEffect } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { styles } from "../../styles/globalStyles";
import { useMapStore } from "../../store/useMapStore";
import { BaseInput } from "../form/BaseInput";
import { DynamicForm } from "../form/DynamicForm";
import { FORM_CONFIG } from "../form/postSchema";
import { NewPostForm } from "../../types/map";

export const CreatePostModal = () => {
  const { modalVisible, newPost, handleSavePost, handleBackNavigation } = useMapStore();

  const methods = useForm<NewPostForm>({
    defaultValues: newPost,
  });

  useEffect(() => {
    if (modalVisible) {
      methods.reset(newPost);
    }
  }, [modalVisible, newPost, methods]);

  const type = methods.watch("type");

  const onSubmit = (data: NewPostForm) => {
    handleSavePost(data);
  };

  return (
    <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={handleBackNavigation}>
      <View style={styles.modalContainer}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>{type === "post" ? "포스트 추가" : "스테이션 만들기"}</Text>

          <FormProvider {...methods}>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, type === "post" && styles.typeButtonActive]}
                onPress={() => methods.setValue("type", "post")}
              >
                <Text style={[styles.typeButtonText, type === "post" && styles.typeButtonTextActive]}>
                  포스트
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, type === "board" && styles.typeButtonActive]}
                onPress={() => methods.setValue("type", "board")}
              >
                <Text style={[styles.typeButtonText, type === "board" && styles.typeButtonTextActive]}>
                  스테이션
                </Text>
              </TouchableOpacity>
            </View>

            <BaseInput
              name="emoji"
              placeholder="이모지 (예: 🍔, ☕)"
              maxLength={2}
            />

            <BaseInput
              name="title"
              placeholder={type === "post" ? "제목" : "스테이션 이름"}
            />

            <DynamicForm
              config={FORM_CONFIG[type] || []}
            />

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleBackNavigation}>
                <Text style={styles.buttonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={methods.handleSubmit(onSubmit)}>
                <Text style={styles.buttonText}>저장</Text>
              </TouchableOpacity>
            </View>
          </FormProvider>
        </View>
      </View>
    </Modal>
  );
};
