import { create } from 'zustand';
import { Alert } from 'react-native';
import { initialPosts } from '../../dummyData';

export const useMapStore = create((set, get) => ({
  posts: initialPosts,
  modalVisible: false,
  isAddingPost: false,
  newPost: { coordinate: null, emoji: '📍', title: '', content: '', description: '', photo: null, type: 'post' },
  selectedPost: null,
  viewModalVisible: false,
  newComment: '',
  searchQuery: '',
  selectedBoardPost: null,
  selectedBoardPostBoardId: null,
  addBoardPostModalVisible: false,
  newBoardPost: { emoji: '📝', title: '', content: '', photo: null },
  targetBoardId: null,

  setPosts: (posts) => set({ posts }),
  setModalVisible: (modalVisible) => set({ modalVisible }),
  setIsAddingPost: (isAddingPost) => set({ isAddingPost }),
  setNewPost: (newPost) => set({ newPost }),
  setSelectedPost: (selectedPost) => set({ selectedPost }),
  setViewModalVisible: (viewModalVisible) => set({ viewModalVisible }),
  setNewComment: (newComment) => set({ newComment }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedBoardPost: (selectedBoardPost) => set({ selectedBoardPost }),
  setSelectedBoardPostBoardId: (selectedBoardPostBoardId) => set({ selectedBoardPostBoardId }),
  setAddBoardPostModalVisible: (addBoardPostModalVisible) => set({ addBoardPostModalVisible }),
  setNewBoardPost: (newBoardPost) => set({ newBoardPost }),
  setTargetBoardId: (targetBoardId) => set({ targetBoardId }),

  handleSavePost: () => {
    const { newPost, posts } = get();
    if (newPost.type === 'post') {
      if (!newPost.title || !newPost.content) {
        Alert.alert('오류', '제목과 내용을 입력해주세요.');
        return;
      }
      set({ posts: [...posts, { ...newPost, id: Date.now().toString(), comments: [], createdAt: Date.now() }] });
    } else {
      if (!newPost.title || !newPost.description) {
        Alert.alert('오류', '스테이션 이름과 설명을 입력해주세요.');
        return;
      }
      set({ posts: [...posts, { ...newPost, id: Date.now().toString(), boardPosts: [], createdAt: Date.now() }] });
    }
    set({
      modalVisible: false,
      newPost: { coordinate: null, emoji: '📍', title: '', content: '', description: '', photo: null, type: 'post' }
    });
  },

  handleAddComment: (postId) => {
    const { newComment, posts, selectedPost } = get();
    if (!newComment.trim()) return;
    
    const comment = {
      id: Date.now().toString(),
      text: newComment,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        const updatedPost = { ...post, comments: [...(post.comments || []), comment] };
        if (selectedPost && selectedPost.id === postId) {
          set({ selectedPost: updatedPost });
        }
        return updatedPost;
      }
      return post;
    });

    set({ posts: updatedPosts, newComment: '' });
  },

  handleAddBoardPostComment: (boardId, boardPostId) => {
    const { newComment, posts } = get();
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now().toString(),
      text: newComment,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedPosts = posts.map(p => {
      if (p.id === boardId) {
        const updatedBoardPosts = (p.boardPosts || []).map(bp => {
          if (bp.id === boardPostId) {
            const updatedBp = { ...bp, comments: [...(bp.comments || []), comment] };
            set({ selectedBoardPost: updatedBp });
            return updatedBp;
          }
          return bp;
        });
        const updatedBoard = { ...p, boardPosts: updatedBoardPosts };
        set({ selectedPost: updatedBoard });
        return updatedBoard;
      }
      return p;
    });

    set({ posts: updatedPosts, newComment: '' });
  },

  handleSaveBoardPost: () => {
    const { newBoardPost, targetBoardId, posts } = get();
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
        set({ selectedPost: updatedBoard });
        return updatedBoard;
      }
      return p;
    });
    set({
      posts: updatedPosts,
      addBoardPostModalVisible: false,
      newBoardPost: { emoji: '📝', title: '', content: '', photo: null },
      targetBoardId: null
    });
  },

  handleBackNavigation: () => {
    const { selectedBoardPost, selectedBoardPostBoardId, addBoardPostModalVisible, viewModalVisible, modalVisible } = get();
    
    if (selectedBoardPost && selectedBoardPostBoardId) {
      set({ selectedBoardPost: null, selectedBoardPostBoardId: null, newComment: '' });
      return true;
    }

    if (addBoardPostModalVisible) {
      set({ addBoardPostModalVisible: false, targetBoardId: null });
      return true;
    }

    if (viewModalVisible) {
      set({ viewModalVisible: false, selectedBoardPost: null, selectedBoardPostBoardId: null });
      return true;
    }

    if (modalVisible) {
      set({ modalVisible: false });
      return true;
    }

    return false;
  }
}));
