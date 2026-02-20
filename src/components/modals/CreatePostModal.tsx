import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../../styles/globalStyles";
import { useMapStore } from "../../store/useMapStore";
import { BaseInput } from "../form/BaseInput";
import { DynamicForm } from "../form/DynamicForm";
import { FORM_CONFIG } from "../form/postSchema";

export const CreatePostModal = () => {
  const { modalVisible, newPost, updateNewPostField, handleSavePost, handleBackNavigation } = useMapStore();

  return (
    <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={handleBackNavigation}>
      <View style={styles.modalContainer}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>{newPost.type === "post" ? "포스트 추가" : "스테이션 만들기"}</Text>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeButton, newPost.type === "post" && styles.typeButtonActive]}
              onPress={() => updateNewPostField("type", "post")}
            >
              <Text style={[styles.typeButtonText, newPost.type === "post" && styles.typeButtonTextActive]}>
                포스트
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, newPost.type === "board" && styles.typeButtonActive]}
              onPress={() => updateNewPostField("type", "board")}
            >
              <Text style={[styles.typeButtonText, newPost.type === "board" && styles.typeButtonTextActive]}>
                스테이션
              </Text>
            </TouchableOpacity>
          </View>

          <BaseInput
            name="emoji"
            placeholder="이모지 (예: 📍, 🍔)"
            value={newPost.emoji}
            onChangeText={(text) => updateNewPostField("emoji", text)}
            maxLength={2}
          />

          <BaseInput
            name="title"
            placeholder={newPost.type === "post" ? "제목" : "스테이션 이름"}
            value={newPost.title}
            onChangeText={(text) => updateNewPostField("title", text)}
          />

          <DynamicForm 
            config={FORM_CONFIG[newPost.type] || []} 
            values={newPost} 
            onChange={(name, value) => updateNewPostField(name as any, value)} 
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleBackNavigation}>
              <Text style={styles.buttonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSavePost}>
              <Text style={styles.buttonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
