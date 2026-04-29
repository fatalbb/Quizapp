import { QuestionType, QuestionContentType, MediaType, QuizAttemptStatus } from './enums';

export interface QuizAttemptStartDto {
  attemptId: string;
  timeLimitMinutes: number;
  startedAt: string;
  mode: string;
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
  isGrading: boolean; // true while LLM is still grading Input questions
  allowFeedback: boolean;
  allowReevaluation: boolean;
  maxReevaluationsPerStudent: number;
  reevaluationsUsed: number;
  questionResults: QuestionResultDto[];
}

export interface QuestionFeedbackDto {
  explanation: string;
  correctAnswer: string;
}

export interface ReevaluationResultDto {
  isCorrect: boolean;
  explanation: string;
  resultChanged: boolean;
  newTotalScore: number;
  remainingReevaluations: number; // -1 for unlimited (teacher/admin)
}

export interface BatchReevaluationResultDto {
  processed: number;
  skipped: number;
  resultsChanged: number;
  newTotalScore: number;
  remainingReevaluations: number;
  items: BatchReevaluationItem[];
}

export interface BatchReevaluationItem {
  questionId: string;
  isCorrect: boolean;
  resultChanged: boolean;
  explanation: string;
}

export interface QuestionResultDto {
  questionId: string;
  questionText?: string;
  isCorrect: boolean | null; // null while pending grading
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
