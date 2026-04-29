import { QuizStatus, QuizMode, ExamStartMode } from './enums';

interface ExamFields {
  mode: QuizMode;
  isValidated: boolean;
  maxAttempts: number;
  startMode?: ExamStartMode | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  manualStartedAt?: string | null;
  joinWindowMinutes: number;
  allowFeedback: boolean;
  allowReevaluation: boolean;
  autoReevaluationQuota: boolean;
  maxReevaluationsPerStudent: number;
}

export interface QuizListDto extends ExamFields {
  id: string;
  title: string;
  description?: string;
  timeLimitMinutes: number;
  status: QuizStatus;
  passingScorePercentage: number;
  totalQuestions: number;
  createdAt: string;
  attemptsUsed: number;
}

export interface QuizDetailDto extends ExamFields {
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
  multipleChoicePercentage: number;
  singleChoicePercentage: number;
  trueFalsePercentage: number;
  inputPercentage: number;
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
    multipleChoicePercentage: number;
    singleChoicePercentage: number;
    trueFalsePercentage: number;
    inputPercentage: number;
  }[];
  // Exam fields
  mode: QuizMode;
  maxAttempts: number;
  startMode?: ExamStartMode | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  joinWindowMinutes: number;
  // Feedback / Re-evaluation
  allowFeedback: boolean;
  allowReevaluation: boolean;
  autoReevaluationQuota: boolean;
  maxReevaluationsPerStudent: number;
}

export interface UpdateQuizRequest extends CreateQuizRequest {
  id: string;
}

// Preview DTOs (teacher view with correct answers)
export interface QuizPreviewDto {
  id: string;
  title: string;
  description?: string;
  mode: string;
  isValidated: boolean;
  questions: PreviewQuestionDto[];
}

export interface PreviewQuestionDto {
  id: string;
  text?: string;
  questionType: string;
  contentType: string;
  difficultyLevel: string;
  categoryName: string;
  answers: PreviewAnswerDto[];
  media: PreviewMediaDto[];
}

export interface PreviewAnswerDto {
  id: string;
  text: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface PreviewMediaDto {
  url: string;
  fileName: string;
  mediaType: string;
}
