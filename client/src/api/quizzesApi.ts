import axiosInstance from './axiosInstance';
import type { PaginatedList } from '../types/common';
import type { QuizListDto, QuizDetailDto, CreateQuizRequest, UpdateQuizRequest } from '../types/quiz';

export interface GetQuizzesParams {
  pageNumber: number;
  pageSize: number;
  status?: string;
}

export const quizzesApi = {
  getQuizzes(params: GetQuizzesParams) {
    return axiosInstance.get<PaginatedList<QuizListDto>>('/quizzes', { params });
  },

  getQuizById(id: string) {
    return axiosInstance.get<QuizDetailDto>(`/quizzes/${id}`);
  },

  createQuiz(data: CreateQuizRequest) {
    return axiosInstance.post<QuizDetailDto>('/quizzes', data);
  },

  updateQuiz(id: string, data: UpdateQuizRequest) {
    return axiosInstance.put<QuizDetailDto>(`/quizzes/${id}`, data);
  },

  publishQuiz(id: string) {
    return axiosInstance.patch(`/quizzes/${id}/publish`);
  },

  archiveQuiz(id: string) {
    return axiosInstance.patch(`/quizzes/${id}/archive`);
  },
};
