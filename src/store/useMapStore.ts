import { Alert } from "react-native";
import { create } from "zustand";
import { initialPosts } from "../../dummyData";
import { BoardPost, CommentItem, NewBoardPostForm, NewPostForm, Post } from "../types/map";

type MapState = {
  posts: Post[];
  modalVisible: boolean;
  isAddingPost: boolean;
  newPost: NewPostForm;
  selectedPost: Post | null;
  viewModalVisible: boolean;
  newComment: string;
  searchQuery: string;
  selectedBoardPost: BoardPost | null;
  selectedBoardPostBoardId: string | null;
  addBoardPostModalVisible: boolean;
  newBoardPost: NewBoardPostForm;
  targetBoardId: string | null;
  setPosts: (posts: Post[]) => void;
  setModalVisible: (modalVisible: boolean) => void;
  setIsAddingPost: (isAddingPost: boolean) => void;
  updateNewPostField: <K extends keyof NewPostForm>(field: K, value: NewPostForm[K]) => void;
  setSelectedPost: (selectedPost: Post | null) => void;
  setViewModalVisible: (viewModalVisible: boolean) => void;
  setNewComment: (newComment: string) => void;
  setSearchQuery: (searchQuery: string) => void;
  setSelectedBoardPost: (selectedBoardPost: BoardPost | null) => void;
  setSelectedBoardPostBoardId: (selectedBoardPostBoardId: string | null) => void;
  setAddBoardPostModalVisible: (addBoardPostModalVisible: boolean) => void;
  updateNewBoardPostField: <K extends keyof NewBoardPostForm>(field: K, value: NewBoardPostForm[K]) => void;
  setTargetBoardId: (targetBoardId: string | null) => void;
  handleSavePost: (data: NewPostForm) => void;
  handleAddComment: (postId: string) => void;
  handleAddBoardPostComment: (boardId: string, boardPostId: string) => void;
  handleSaveBoardPost: (data: NewBoardPostForm) => void;
  handleBackNavigation: () => boolean;
};

const INITIAL_NEW_POST: NewPostForm = {
  coordinate: null,
  emoji: "📍",
  title: "",
  content: "",
  description: "",
  photo: null,
  type: "post",
};

const INITIAL_NEW_BOARD_POST: NewBoardPostForm = {
  emoji: "📝",
  title: "",
  content: "",
  photo: null,
};

export const useMapStore = create<MapState>((set, get) => ({
  posts: initialPosts,
  modalVisible: false,
  isAddingPost: false,
  newPost: INITIAL_NEW_POST,
  selectedPost: null,
  viewModalVisible: false,
  newComment: "",
  searchQuery: "",
  selectedBoardPost: null,
  selectedBoardPostBoardId: null,
  addBoardPostModalVisible: false,
  newBoardPost: INITIAL_NEW_BOARD_POST,
  targetBoardId: null,

  setPosts: (posts) => set({ posts }),
  setModalVisible: (modalVisible) => set({ modalVisible }),
  setIsAddingPost: (isAddingPost) => set({ isAddingPost }),
  updateNewPostField: (field, value) => set((state) => ({ newPost: { ...state.newPost, [field]: value } })),
  setSelectedPost: (selectedPost) => set({ selectedPost }),
  setViewModalVisible: (viewModalVisible) => set({ viewModalVisible }),
  setNewComment: (newComment) => set({ newComment }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedBoardPost: (selectedBoardPost) => set({ selectedBoardPost }),
  setSelectedBoardPostBoardId: (selectedBoardPostBoardId) => set({ selectedBoardPostBoardId }),
  setAddBoardPostModalVisible: (addBoardPostModalVisible) => set({ addBoardPostModalVisible }),
  updateNewBoardPostField: (field, value) =>
    set((state) => ({ newBoardPost: { ...state.newBoardPost, [field]: value } })),
  setTargetBoardId: (targetBoardId) => set({ targetBoardId }),

  handleSavePost: (data) => {
    const { posts } = get();

    if (data.type === "post") {
      if (!data.title || !data.content) {
        Alert.alert("오류", "제목과 내용을 입력해주세요.");
        return;
      }

      if (!data.coordinate) {
        Alert.alert("오류", "지도에서 위치를 먼저 선택해주세요.");
        return;
      }

      const newItem: Post = {
        id: Date.now().toString(),
        type: "post",
        coordinate: data.coordinate,
        emoji: data.emoji,
        title: data.title,
        content: data.content,
        photo: data.photo,
        createdAt: Date.now(),
        comments: [],
      };

      set({ posts: [...posts, newItem] });
    } else {
      if (!data.title || !data.description) {
        Alert.alert("오류", "스테이션 이름과 설명을 입력해주세요.");
        return;
      }

      if (!data.coordinate) {
        Alert.alert("오류", "지도에서 위치를 먼저 선택해주세요.");
        return;
      }

      const newItem: Post = {
        id: Date.now().toString(),
        type: "board",
        coordinate: data.coordinate,
        emoji: data.emoji,
        title: data.title,
        description: data.description,
        photo: data.photo,
        createdAt: Date.now(),
        boardPosts: [],
      };

      set({ posts: [...posts, newItem] });
    }

    set({
      modalVisible: false,
      newPost: INITIAL_NEW_POST,
    });
  },

  handleAddComment: (postId) => {
    const { newComment, posts, selectedPost } = get();
    if (!newComment.trim()) return;

    const comment: CommentItem = {
      id: Date.now().toString(),
      text: newComment,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedPosts = posts.map((post) => {
      if (post.id !== postId || post.type !== "post") return post;
      const updatedPost: Post = { ...post, comments: [...post.comments, comment] };
      if (selectedPost && selectedPost.id === postId) {
        set({ selectedPost: updatedPost });
      }
      return updatedPost;
    });

    set({ posts: updatedPosts, newComment: "" });
  },

  handleAddBoardPostComment: (boardId, boardPostId) => {
    const { newComment, posts } = get();
    if (!newComment.trim()) return;

    const comment: CommentItem = {
      id: Date.now().toString(),
      text: newComment,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedPosts = posts.map((post) => {
      if (post.id !== boardId || post.type !== "board") return post;

      const updatedBoardPosts = post.boardPosts.map((bp) => {
        if (bp.id !== boardPostId) return bp;
        const updatedBp = { ...bp, comments: [...bp.comments, comment] };
        set({ selectedBoardPost: updatedBp });
        return updatedBp;
      });

      const updatedBoard: Post = { ...post, boardPosts: updatedBoardPosts };
      set({ selectedPost: updatedBoard });
      return updatedBoard;
    });

    set({ posts: updatedPosts, newComment: "" });
  },

  handleSaveBoardPost: (data) => {
    const { targetBoardId, posts } = get();

    if (!data.title || !data.content) {
      Alert.alert("오류", "제목과 내용을 입력해주세요.");
      return;
    }

    if (!targetBoardId) {
      Alert.alert("오류", "게시판을 다시 선택하고 작성을 시도해주세요.");
      return;
    }

    const updatedPosts = posts.map((post) => {
      if (post.id !== targetBoardId || post.type !== "board") return post;

      const newBp: BoardPost = {
        ...data,
        id: Date.now().toString(),
        createdAt: Date.now(),
        comments: [],
      };

      const updatedBoard: Post = { ...post, boardPosts: [newBp, ...post.boardPosts] };
      set({ selectedPost: updatedBoard });
      return updatedBoard;
    });

    set({
      posts: updatedPosts,
      addBoardPostModalVisible: false,
      newBoardPost: INITIAL_NEW_BOARD_POST,
      targetBoardId: null,
    });
  },

  handleBackNavigation: () => {
    const { selectedBoardPost, selectedBoardPostBoardId, addBoardPostModalVisible, viewModalVisible, modalVisible } =
      get();

    if (selectedBoardPost && selectedBoardPostBoardId) {
      set({ selectedBoardPost: null, selectedBoardPostBoardId: null, newComment: "" });
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
  },
}));
