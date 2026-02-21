import { create } from "zustand";

const API_BASE_URL = "http://3.107.199.19:8080";

type LoginResponse = {
  token: string;
  userId: number;
  role: string;
};

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

type AuthState = {
  token: string | null;
  userId: number | null;
  role: "USER" | null;
  username: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    if (data.message) return data.message;
    if (data.error) return data.error;
  } catch {
    // Ignore json parse errors and use fallback message.
  }

  if (response.status === 401) return "아이디 또는 비밀번호가 올바르지 않습니다.";
  return "로그인에 실패했습니다. 잠시 후 다시 시도해주세요.";
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  role: null,
  username: null,
  isLoading: false,

  login: async (username, password) => {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      throw new Error("아이디와 비밀번호를 입력해주세요.");
    }

    set({ isLoading: true });
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: trimmedUsername,
          password: trimmedPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const data = (await response.json()) as LoginResponse;

      if (data.role !== "USER") {
        throw new Error("이 앱은 USER 계정만 로그인할 수 있습니다.");
      }

      set({
        token: data.token,
        userId: data.userId,
        role: "USER",
        username: trimmedUsername,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (username, password) => {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      throw new Error("아이디와 비밀번호를 입력해주세요.");
    }

    set({ isLoading: true });
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: trimmedUsername,
          password: trimmedPassword,
          role: "USER",
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const data = (await response.json()) as LoginResponse;
      set({
        token: data.token,
        userId: data.userId,
        role: "USER",
        username: trimmedUsername,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    set({
      token: null,
      userId: null,
      role: null,
      username: null,
      isLoading: false,
    });
  },
}));
