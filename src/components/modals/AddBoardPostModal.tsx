import React, { useEffect } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { styles } from "../../styles/globalStyles";
import { useMapStore } from "../../store/useMapStore";
import { BaseInput } from "../form/BaseInput";
import { DynamicForm } from "../form/DynamicForm";
import { FORM_CONFIG } from "../form/postSchema";
import { NewBoardPostForm } from "../../types/map";

export const AddBoardPostModal = () => {
  const { addBoardPostModalVisible, newBoardPost, handleSaveBoardPost, handleBackNavigation } = useMapStore();

  const methods = useForm<NewBoardPostForm>({
    defaultValues: newBoardPost,
  });

  useEffect(() => {
    if (addBoardPostModalVisible) {
      methods.reset(newBoardPost);
    }
  }, [addBoardPostModalVisible, newBoardPost, methods]);

  const onSubmit = (data: NewBoardPostForm) => {
    handleSaveBoardPost(data);
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={addBoardPostModalVisible}
      onRequestClose={handleBackNavigation}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>스테이션 글쓰기</Text>

          <FormProvider {...methods}>
            <BaseInput
              name="emoji"
              placeholder="이모지 (예: 🍔)"
              maxLength={2}
            />

            <BaseInput
              name="title"
              placeholder="제목"
            />

            <DynamicForm
              config={FORM_CONFIG.boardPost}
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
