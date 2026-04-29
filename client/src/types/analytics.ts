export interface TeacherDashboardDto {
  totalQuizzes: number;
  totalQuestions: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  recentAttempts: RecentAttemptDto[];
}

export interface RecentAttemptDto {
  studentName: string;
  quizTitle: string;
  score?: number;
  completedAt: string;
}

export interface QuizAnalyticsDto {
  quizId: string;
  quizTitle: string;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  passingScore: number;
  attempts: AttemptSummaryDto[];
}

export interface AttemptSummaryDto {
  attemptId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  score?: number;
  correctAnswers: number;
  totalQuestions: number;
  status: string;
  startedAt: string;
  completedAt?: string;
  passed: boolean;
}

export interface AttemptDetailedDto {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  studentName: string;
  studentEmail: string;
  score?: number;
  correctAnswers: number;
  totalQuestions: number;
  status: string;
  startedAt: string;
  completedAt?: string;
  timeLimitMinutes: number;
  passingScorePercentage: number;
  passed: boolean;
  questions: DetailedQuestionResultDto[];
}

export interface DetailedQuestionResultDto {
  questionId: string;
  questionText?: string;
  questionType: string;
  contentType: string;
  difficultyLevel: string;
  categoryName: string;
  isCorrect: boolean;
  score: number;
  aiEvaluationNotes?: string;
  answeredAt?: string;
  options: DetailedAnswerOptionDto[];
  studentSelectedAnswerIds: string[];
  studentInputText?: string;
  media: DetailedMediaDto[];
}

export interface DetailedAnswerOptionDto {
  id: string;
  text: string;
  isCorrect: boolean;
  wasSelected: boolean;
  orderIndex: number;
}

export interface DetailedMediaDto {
  url: string;
  fileName: string;
  mediaType: string;
}

export interface StudentPerformanceDto {
  studentName: string;
  totalAttempts: number;
  averageScore: number;
  quizzesPassed: number;
  quizzesFailed: number;
  attempts: StudentAttemptDto[];
}

export interface StudentAttemptDto {
  quizTitle: string;
  score?: number;
  passed: boolean;
  completedAt: string;
}
