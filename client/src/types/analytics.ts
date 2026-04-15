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
