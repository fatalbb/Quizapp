import { create } from 'zustand';
import axiosInstance from '../api/axiosInstance';
import type { UserRole } from '../types/enums';
import type { LoginResponse, UserDto } from '../types/auth';

const ACCESS_TOKEN_KEY = 'quizapp_access_token';
const REFRESH_TOKEN_KEY = 'quizapp_refresh_token';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  login: async (email: string, password: string) => {
    const { data } = await axiosInstance.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);

    // Fetch full user profile after login
    const profileRes = await axiosInstance.get<UserDto>('/auth/me');
    const user: AuthUser = {
      id: profileRes.data.id,
      email: profileRes.data.email,
      firstName: profileRes.data.firstName,
      lastName: profileRes.data.lastName,
      role: profileRes.data.role,
    };

    set({ user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    set({ user: null, isAuthenticated: false });
  },

  initialize: async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      set({ isInitialized: true });
      return;
    }

    try {
      const { data } = await axiosInstance.get<UserDto>('/auth/me');
      const user: AuthUser = {
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      };
      set({ user, isAuthenticated: true, isInitialized: true });
    } catch {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      set({ isInitialized: true });
    }
  },
}));
