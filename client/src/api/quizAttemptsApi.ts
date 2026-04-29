import axiosInstance from './axiosInstance';
import type { PaginatedList } from '../types/common';
import type {
  QuizAttemptStartDto,
  SubmitQuizAttemptRequest,
  QuizAttemptResultDto,
  MyAttemptDto,
  QuestionFeedbackDto,
  ReevaluationResultDto,
  BatchReevaluationResultDto,
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

  runQuery(attemptId: string, questionId: string, query: string) {
    return axiosInstance.post<SqlSandboxResult>(`/quiz-attempts/${attemptId}/run-query`, {
      attemptId,
      questionId,
      query,
    });
  },

  getFeedback(attemptId: string, questionId: string) {
    return axiosInstance.post<QuestionFeedbackDto>(`/quiz-attempts/${attemptId}/feedback`, {
      questionId,
    });
  },

  requestReevaluation(attemptId: string, questionId: string, justification: string) {
    return axiosInstance.post<ReevaluationResultDto>(`/quiz-attempts/${attemptId}/reevaluate`, {
      questionId,
      justification,
    });
  },

  requestBatchReevaluation(attemptId: string, justification: string) {
    return axiosInstance.post<BatchReevaluationResultDto>(`/quiz-attempts/${attemptId}/reevaluate-all`, {
      justification,
    });
  },
};

export interface SqlSandboxResult {
  success: boolean;
  columns: string[];
  rows: (string | null)[][];
  rowsAffected: number;
  errorMessage?: string;
  elapsedMs: number;
}
