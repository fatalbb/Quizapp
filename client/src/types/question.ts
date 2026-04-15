import { QuestionType, QuestionContentType, DifficultyLevel, MediaType } from './enums';

export interface QuestionListDto {
  id: string;
  text?: string;
  questionType: QuestionType;
  contentType: QuestionContentType;
  difficultyLevel: DifficultyLevel;
  categoryName: string;
  isAiGenerated: boolean;
  createdAt: string;
}

export interface QuestionDetailDto {
  id: string;
  text?: string;
  questionType: QuestionType;
  contentType: QuestionContentType;
  difficultyLevel: DifficultyLevel;
  categoryId: string;
  categoryName: string;
  isAiGenerated: boolean;
  answers: AnswerDto[];
  media: MediaDto[];
}

export interface AnswerDto {
  id: string;
  text: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface MediaDto {
  id: string;
  fileName: string;
  url: string;
  mediaType: MediaType;
}

export interface CreateQuestionRequest {
  text?: string;
  questionType: QuestionType;
  contentType: QuestionContentType;
  difficultyLevel: DifficultyLevel;
  categoryId: string;
  answers: CreateAnswerDto[];
}

export interface CreateAnswerDto {
  text: string;
  isCorrect: boolean;
}

export interface GenerateQuestionsRequest {
  categoryId: string;
  questionType: QuestionType;
  difficultyLevel: DifficultyLevel;
  count: number;
}

export interface GeneratedQuestionDto {
  text: string;
  answers: { text: string; isCorrect: boolean }[];
  difficultyLevel: DifficultyLevel;
}

export interface SaveGeneratedQuestionsRequest {
  categoryId: string;
  questionType: QuestionType;
  questions: GeneratedQuestionDto[];
  excelFilePath?: string;
  excelFileName?: string;
  excelStoredFileName?: string;
}

export interface GenerateFromTablesResponse {
  questions: GeneratedQuestionDto[];
  excelFilePath: string;
  excelFileName: string;
  excelStoredFileName: string;
}
