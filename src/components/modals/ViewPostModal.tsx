import React from "react";
import {
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
  ViewabilityConfig,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CountdownTimer } from "../CountdownTimer";
import { styles } from "../../styles/globalStyles";
import { useMapStore } from "../../store/useMapStore";
import { Post } from "../../types/map";

const screenWidth = Dimensions.get("window").width;

type Props = {
  viewablePosts: Post[];
  safeInitialIndex: number;
  onViewableItemsChanged: (info: { viewableItems: Array<ViewToken<Post>> }) => void;
  viewabilityConfig: ViewabilityConfig;
};

export const ViewPostModal = ({
  viewablePosts,
  safeInitialIndex,
  onViewableItemsChanged,
  viewabilityConfig,
}: Props) => {
  const {
    viewModalVisible,
    posts,
    selectedBoardPost,
    setSelectedBoardPost,
    selectedBoardPostBoardId,
    setSelectedBoardPostBoardId,
    newComment,
    setNewComment,
    handleAddComment,
    handleAddBoardPostComment,
    setTargetBoardId,
    setAddBoardPostModalVisible,
    handleBackNavigation,
  } = useMapStore();

  return (
    <Modal animationType="fade" transparent visible={viewModalVisible} onRequestClose={handleBackNavigation}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
        <FlatList
          data={viewablePosts}
          extraData={posts}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={safeInitialIndex}
          getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item }) => (
            <View style={{ width: screenWidth, justifyContent: "center", alignItems: "center" }}>
              <View style={[styles.viewModalContent, { maxHeight: "80%", width: "85%" }]}>
                <View style={styles.swipeHintContainer}>
                  <Ionicons name="swap-horizontal" size={14} color="#8b8b8b" />
                  <Text style={styles.swipeHintText}>스와이프</Text>
                </View>

                {item.type === "post" ? (
                  <>
                    <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
                      <View style={styles.viewModalHeader}>
                        <Text style={styles.viewModalEmoji}>{item.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.viewModalTitle}>{item.title}</Text>
                          <CountdownTimer createdAt={item.createdAt} />
                        </View>
                      </View>

                      {item.photo && <Image source={{ uri: item.photo }} style={styles.viewModalImage} resizeMode="cover" />}

                      <Text style={styles.viewModalDescription}>{item.content}</Text>

                      <View style={styles.commentsSection}>
                        <Text style={styles.commentsTitle}>댓글</Text>
                        {item.comments.map((comment) => (
                          <View key={comment.id} style={styles.commentItem}>
                            <Text style={styles.commentText}>{comment.text}</Text>
                            <Text style={styles.commentTime}>{comment.createdAt}</Text>
                          </View>
                        ))}
                        {item.comments.length === 0 && <Text style={styles.noCommentsText}>아직 댓글이 없습니다.</Text>}
                      </View>
                    </ScrollView>

                    <View style={styles.commentInputContainer}>
                      <TextInput
                        style={styles.commentInput}
                        placeholder="댓글을 입력하세요"
                        placeholderTextColor="#8b8b8b"
                        value={newComment}
                        onChangeText={setNewComment}
                      />
                      <TouchableOpacity style={styles.commentSubmitButton} onPress={() => handleAddComment(item.id)}>
                        <Ionicons name="send" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    {selectedBoardPost && selectedBoardPostBoardId === item.id ? (
                      <View style={styles.inlineBoardPostContainer}>
                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260, flexShrink: 1 }}>
                          <View style={styles.viewModalHeader}>
                            <Text style={styles.viewModalEmoji}>{selectedBoardPost.emoji || "📝"}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.viewModalTitle}>{selectedBoardPost.title}</Text>
                              <Text style={styles.timerText}>{new Date(selectedBoardPost.createdAt).toLocaleString()}</Text>
                            </View>
                          </View>

                          {selectedBoardPost.photo && (
                            <Image source={{ uri: selectedBoardPost.photo }} style={styles.viewModalImage} resizeMode="cover" />
                          )}

                          <Text style={styles.viewModalDescription}>{selectedBoardPost.content}</Text>

                          <View style={styles.commentsSection}>
                            <Text style={styles.commentsTitle}>댓글</Text>
                            {selectedBoardPost.comments.map((comment) => (
                              <View key={comment.id} style={styles.commentItem}>
                                <Text style={styles.commentText}>{comment.text}</Text>
                                <Text style={styles.commentTime}>{comment.createdAt}</Text>
                              </View>
                            ))}
                            {selectedBoardPost.comments.length === 0 && (
                              <Text style={styles.noCommentsText}>아직 댓글이 없습니다.</Text>
                            )}
                          </View>
                        </ScrollView>

                        <View style={styles.commentInputContainer}>
                          <TextInput
                            style={styles.commentInput}
                            placeholder="댓글을 입력하세요"
                            placeholderTextColor="#8b8b8b"
                            value={newComment}
                            onChangeText={setNewComment}
                          />
                          <TouchableOpacity
                            style={styles.commentSubmitButton}
                            onPress={() => handleAddBoardPostComment(item.id, selectedBoardPost.id)}
                          >
                            <Ionicons name="send" size={16} color="white" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={styles.boardHeader}>
                          <Text style={styles.boardEmoji}>{item.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.boardTitle}>{item.title}</Text>
                            <Text style={styles.boardDescription}>{item.description}</Text>
                          </View>
                        </View>

                        {item.photo && <Image source={{ uri: item.photo }} style={styles.boardImage} resizeMode="cover" />}

                        <View style={styles.boardPostsContainer}>
                          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled style={{ flexShrink: 1 }}>
                            {item.boardPosts.map((bp) => (
                              <TouchableOpacity
                                key={bp.id}
                                style={styles.boardPostItem}
                                onPress={() => {
                                  setSelectedBoardPost(bp);
                                  setSelectedBoardPostBoardId(item.id);
                                }}
                              >
                                <View style={styles.boardPostTitleRow}>
                                  <Text style={styles.boardPostEmoji}>{bp.emoji || "📝"}</Text>
                                  <Text style={styles.boardPostTitle}>{bp.title}</Text>
                                </View>
                                <Text style={styles.boardPostPreview} numberOfLines={1}>
                                  {bp.content}
                                </Text>
                                <Text style={styles.boardPostTime}>
                                  {new Date(bp.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </Text>
                              </TouchableOpacity>
                            ))}
                            {item.boardPosts.length === 0 && (
                              <Text style={styles.noCommentsText}>아직 게시글이 없습니다.</Text>
                            )}
                          </ScrollView>
                        </View>

                        <View style={styles.buttonContainer}>
                          <TouchableOpacity
                            style={[styles.button, styles.saveButton]}
                            onPress={() => {
                              setTargetBoardId(item.id);
                              setAddBoardPostModalVisible(true);
                            }}
                          >
                            <Text style={styles.buttonText}>글쓰기</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </>
                )}

                <TouchableOpacity style={styles.closeButton} onPress={handleBackNavigation}>
                  <Text style={styles.buttonText}>닫기</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};
