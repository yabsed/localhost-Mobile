import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { styles } from '../../styles/globalStyles';

export const AddBoardPostModal = ({
  visible,
  onClose,
  newBoardPost,
  setNewBoardPost,
  targetBoardId,
  setTargetBoardId,
  posts,
  setPosts,
  setSelectedPost
}) => {
  const handleSave = () => {
    if (!newBoardPost.title || !newBoardPost.content) {
      Alert.alert('오류', '제목과 내용을 입력해주세요.');
      return;
    }
    if (!targetBoardId) {
      Alert.alert('오류', '게시판을 다시 선택한 뒤 글쓰기를 시도해주세요.');
      return;
    }
    const updatedPosts = posts.map(p => {
      if (p.id === targetBoardId) {
        const newBp = { ...newBoardPost, id: Date.now().toString(), createdAt: Date.now(), comments: [] };
        const updatedBoard = { ...p, boardPosts: [newBp, ...(p.boardPosts || [])] };
        setSelectedPost(updatedBoard);
        return updatedBoard;
      }
      return p;
    });
    setPosts(updatedPosts);
    onClose();
    setNewBoardPost({ emoji: '📝', title: '', content: '', photo: null });
    setTargetBoardId(null);
  };

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setNewBoardPost({ ...newBoardPost, photo: result.assets[0].uri });
    }
  };

  const handleCancel = () => {
    onClose();
    setTargetBoardId(null);
    setNewBoardPost({ emoji: '📝', title: '', content: '', photo: null });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleCancel}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>스테이션에 글쓰기</Text>

          <TextInput
            style={styles.input}
            placeholder="이모지 (예: 📝, 📣, 🍽️)"
            placeholderTextColor="#8b8b8b"
            value={newBoardPost.emoji}
            onChangeText={(text) => setNewBoardPost({ ...newBoardPost, emoji: text })}
            maxLength={2}
          />
          
          <TextInput
            style={styles.input}
            placeholder="제목"
            placeholderTextColor="#8b8b8b"
            value={newBoardPost.title}
            onChangeText={(text) => setNewBoardPost({ ...newBoardPost, title: text })}
          />
          
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="내용을 입력하세요"
            placeholderTextColor="#8b8b8b"
            value={newBoardPost.content}
            onChangeText={(text) => setNewBoardPost({ ...newBoardPost, content: text })}
            multiline={true}
            numberOfLines={4}
          />
          
          <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
            <Text style={styles.photoButtonText}>{newBoardPost.photo ? '사진 변경' : '사진 추가'}</Text>
          </TouchableOpacity>
          {newBoardPost.photo && (
            <Image source={{ uri: newBoardPost.photo }} style={styles.previewImage} />
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
              <Text style={styles.buttonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
              <Text style={styles.buttonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
