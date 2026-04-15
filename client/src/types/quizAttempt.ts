import { QuestionType, QuestionContentType, MediaType, QuizAttemptStatus } from './enums';

export interface QuizAttemptStartDto {
  attemptId: string;
  timeLimitMinutes: number;
  startedAt: string;
  questions: AttemptQuestionDto[];
}

export interface AttemptQuestionDto {
  questionId: string;
  text?: string;
  questionType: QuestionType;
  contentType: QuestionContentType;
  options: AttemptAnswerOptionDto[];
  media: AttemptMediaDto[];
}

export interface AttemptAnswerOptionDto {
  id: string;
  text: string;
  orderIndex: number;
}

export interface AttemptMediaDto {
  url: string;
  mediaType: MediaType;
}

export interface SubmitQuizAttemptRequest {
  attemptId: string;
  answers: SubmitAnswerDto[];
}

export interface SubmitAnswerDto {
  questionId: string;
  selectedAnswerId?: string;
  selectedAnswerIds?: string[];
  inputText?: string;
}

export interface QuizAttemptResultDto {
  attemptId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  passed: boolean;
  status: QuizAttemptStatus;
  questionResults: QuestionResultDto[];
}

export interface QuestionResultDto {
  questionId: string;
  questionText?: string;
  isCorrect: boolean;
  aiEvaluationNotes?: string;
}

export interface MyAttemptDto {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  score?: number;
  correctAnswers: number;
  totalQuestions: number;
  status: QuizAttemptStatus;
  startedAt: string;
  completedAt?: string;
}
