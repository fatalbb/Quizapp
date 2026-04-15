import axiosInstance from './axiosInstance';
import type { PaginatedList } from '../types/common';
import type { UserDto } from '../types/auth';
import type { CreateUserRequest, UpdateUserRequest } from '../types/user';

export interface GetUsersParams {
  pageNumber: number;
  pageSize: number;
  role?: string;
}

export const usersApi = {
  getUsers(params: GetUsersParams) {
    return axiosInstance.get<PaginatedList<UserDto>>('/users', { params });
  },

  getUserById(id: string) {
    return axiosInstance.get<UserDto>(`/users/${id}`);
  },

  createUser(data: CreateUserRequest) {
    return axiosInstance.post('/users', data);
  },

  updateUser(data: UpdateUserRequest) {
    return axiosInstance.put(`/users/${data.userId}`, data);
  },

  toggleUserActive(id: string) {
    return axiosInstance.patch(`/users/${id}/toggle-active`);
  },

  deleteUser(id: string) {
    return axiosInstance.delete(`/users/${id}`);
  },
};
