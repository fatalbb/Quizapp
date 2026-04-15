import axiosInstance from './axiosInstance';
import type { LoginRequest, LoginResponse, ChangePasswordRequest } from '../types/auth';

export const authApi = {
  login: (data: LoginRequest) =>
    axiosInstance.post<LoginResponse>('/auth/login', data),

  changePassword: (data: ChangePasswordRequest) =>
    axiosInstance.post('/auth/change-password', data),

  me: () =>
    axiosInstance.get('/auth/me'),
};

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await axiosInstance.post('/auth/change-password', { currentPassword, newPassword });
}
