import axiosInstance from './axiosInstance';
import type { PaginatedList } from '../types/common';
import type {
  QuestionListDto,
  QuestionDetailDto,
  CreateQuestionRequest,
  GenerateQuestionsRequest,
  GeneratedQuestionDto,
  SaveGeneratedQuestionsRequest,
  GenerateFromTablesResponse,
} from '../types/question';
import type { MediaType } from '../types/enums';

export interface GetQuestionsParams {
  pageNumber: number;
  pageSize: number;
  categoryId?: string;
  type?: string;
  difficulty?: string;
}

export const questionsApi = {
  getQuestions(params: GetQuestionsParams) {
    return axiosInstance.get<PaginatedList<QuestionListDto>>('/questions', { params });
  },

  getQuestionById(id: string) {
    return axiosInstance.get<QuestionDetailDto>(`/questions/${id}`);
  },

  createQuestion(data: CreateQuestionRequest) {
    return axiosInstance.post<{ id: string }>('/questions', data);
  },

  updateQuestion(id: string, data: CreateQuestionRequest) {
    return axiosInstance.put(`/questions/${id}`, { id, ...data });
  },

  deleteQuestion(id: string) {
    return axiosInstance.delete(`/questions/${id}`);
  },

  uploadQuestionMedia(questionId: string, file: File, mediaType: MediaType) {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post(`/questions/${questionId}/media`, formData, {
      params: { mediaType },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteQuestionMedia(questionId: string, mediaId: string) {
    return axiosInstance.delete(`/questions/${questionId}/media/${mediaId}`);
  },

  generateQuestions(data: GenerateQuestionsRequest) {
    return axiosInstance.post<GeneratedQuestionDto[]>('/questions/generate', data);
  },

  saveGeneratedQuestions(data: SaveGeneratedQuestionsRequest) {
    return axiosInstance.post('/questions/save-generated', data);
  },

  generateQuestionsFromTables(file: File, categoryId: string, questionType: string, difficultyLevel: string, count: number) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('categoryId', categoryId);
    formData.append('questionType', questionType);
    formData.append('difficultyLevel', difficultyLevel);
    formData.append('count', count.toString());
    return axiosInstance.post<GenerateFromTablesResponse>('/questions/generate-from-tables', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
