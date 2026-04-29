import axiosInstance from './axiosInstance';
import type { CategoryDto, CreateCategoryRequest, UpdateCategoryRequest } from '../types/category';

export const categoriesApi = {
  getCategories() {
    return axiosInstance.get<CategoryDto[]>('/categories');
  },

  getCategoryById(id: string) {
    return axiosInstance.get<CategoryDto>(`/categories/${id}`);
  },

  createCategory(data: CreateCategoryRequest) {
    return axiosInstance.post<CategoryDto>('/categories', data);
  },

  updateCategory(data: UpdateCategoryRequest) {
    return axiosInstance.put<CategoryDto>(`/categories/${data.id}`, data);
  },

  deleteCategory(id: string) {
    return axiosInstance.delete(`/categories/${id}`);
  },

  getQuestionCounts(categoryId: string) {
    return axiosInstance.get<QuestionCountsDto>(
      `/categories/${categoryId}/question-counts`,
    );
  },
};

export interface QuestionCountsDto {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  byType: Record<string, number>;
  // byDifficultyType[difficulty][type] = count
  byDifficultyType: Record<string, Record<string, number>>;
}
