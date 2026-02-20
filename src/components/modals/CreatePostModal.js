import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, Image } from 'react-native';
import { styles } from '../../styles/globalStyles';

export const CreatePostModal = ({
  visible,
  onClose,
  newPost,
  setNewPost,
  onSave,
  onPickImage
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>{newPost.type === 'post' ? '새 스팟 남기기' : '새 스테이션 만들기'}</Text>
          
          <View style={styles.typeSelector}>
            <TouchableOpacity 
              style={[styles.typeButton, newPost.type === 'post' && styles.typeButtonActive]}
              onPress={() => setNewPost({ ...newPost, type: 'post' })}
            >
              <Text style={[styles.typeButtonText, newPost.type === 'post' && styles.typeButtonTextActive]}>스팟</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.typeButton, newPost.type === 'board' && styles.typeButtonActive]}
              onPress={() => setNewPost({ ...newPost, type: 'board' })}
            >
              <Text style={[styles.typeButtonText, newPost.type === 'board' && styles.typeButtonTextActive]}>스테이션</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="이모지 (예: 📍, 🍔, 📸)"
            placeholderTextColor="#8b8b8b"
            value={newPost.emoji}
            onChangeText={(text) => setNewPost({ ...newPost, emoji: text })}
            maxLength={2}
          />
          
          <TextInput
            style={styles.input}
            placeholder={newPost.type === 'post' ? "간결한 제목" : "스테이션 이름"}
            placeholderTextColor="#8b8b8b"
            value={newPost.title}
            onChangeText={(text) => setNewPost({ ...newPost, title: text })}
          />
          
          {newPost.type === 'post' ? (
            <>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="내용을 입력하세요"
                placeholderTextColor="#8b8b8b"
                value={newPost.content}
                onChangeText={(text) => setNewPost({ ...newPost, content: text })}
                multiline={true}
                numberOfLines={4}
              />
              
              <TouchableOpacity style={styles.photoButton} onPress={onPickImage}>
                <Text style={styles.photoButtonText}>{newPost.photo ? '사진 변경' : '사진 추가'}</Text>
              </TouchableOpacity>
              {newPost.photo && (
                <Image source={{ uri: newPost.photo }} style={styles.previewImage} />
              )}
            </>
          ) : (
            <>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="스테이션 설명을 입력하세요"
                placeholderTextColor="#8b8b8b"
                value={newPost.description}
                onChangeText={(text) => setNewPost({ ...newPost, description: text })}
                multiline={true}
                numberOfLines={4}
              />
              
              <TouchableOpacity style={styles.photoButton} onPress={onPickImage}>
                <Text style={styles.photoButtonText}>{newPost.photo ? '사진 변경' : '사진 추가'}</Text>
              </TouchableOpacity>
              {newPost.photo && (
                <Image source={{ uri: newPost.photo }} style={styles.previewImage} />
              )}
            </>
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.buttonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={onSave}>
              <Text style={styles.buttonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
