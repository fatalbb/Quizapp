import axiosInstance from './axiosInstance';
import type { PaginatedList } from '../types/common';
import type {
  QuizAttemptStartDto,
  SubmitQuizAttemptRequest,
  QuizAttemptResultDto,
  MyAttemptDto,
} from '../types/quizAttempt';

export interface GetMyAttemptsParams {
  pageNumber: number;
  pageSize: number;
}

export const quizAttemptsApi = {
  startAttempt(quizId: string) {
    return axiosInstance.post<QuizAttemptStartDto>(`/quiz-attempts/start/${quizId}`);
  },

  submitAttempt(data: SubmitQuizAttemptRequest) {
    return axiosInstance.post<QuizAttemptResultDto>(`/quiz-attempts/${data.attemptId}/submit`, data);
  },

  getAttemptResult(attemptId: string) {
    return axiosInstance.get<QuizAttemptResultDto>(`/quiz-attempts/${attemptId}/result`);
  },

  getMyAttempts(params: GetMyAttemptsParams) {
    return axiosInstance.get<PaginatedList<MyAttemptDto>>('/quiz-attempts/my', { params });
  },
};
