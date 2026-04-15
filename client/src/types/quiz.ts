import { QuizStatus } from './enums';

export interface QuizListDto {
  id: string;
  title: string;
  description?: string;
  timeLimitMinutes: number;
  status: QuizStatus;
  passingScorePercentage: number;
  totalQuestions: number;
  createdAt: string;
}

export interface QuizDetailDto {
  id: string;
  title: string;
  description?: string;
  timeLimitMinutes: number;
  status: QuizStatus;
  passingScorePercentage: number;
  categories: QuizCategoryDetailDto[];
}

export interface QuizCategoryDetailDto {
  categoryId: string;
  categoryName: string;
  questionCount: number;
  easyPercentage: number;
  mediumPercentage: number;
  hardPercentage: number;
}

export interface CreateQuizRequest {
  title: string;
  description?: string;
  timeLimitMinutes: number;
  passingScorePercentage: number;
  categories: {
    categoryId: string;
    questionCount: number;
    easyPercentage: number;
    mediumPercentage: number;
    hardPercentage: number;
  }[];
}

export interface UpdateQuizRequest extends CreateQuizRequest {
  id: string;
}
