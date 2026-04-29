import axiosInstance from './axiosInstance';
import type {
  TeacherDashboardDto,
  QuizAnalyticsDto,
  StudentPerformanceDto,
  AttemptDetailedDto,
} from '../types/analytics';

export const analyticsApi = {
  getDashboard() {
    return axiosInstance.get<TeacherDashboardDto>('/analytics/dashboard');
  },

  getQuizAnalytics(quizId: string) {
    return axiosInstance.get<QuizAnalyticsDto>(`/analytics/quiz/${quizId}`);
  },

  getStudentPerformance(studentId: string) {
    return axiosInstance.get<StudentPerformanceDto>(`/analytics/student/${studentId}`);
  },

  getAttemptDetailed(attemptId: string) {
    return axiosInstance.get<AttemptDetailedDto>(`/analytics/attempt/${attemptId}`);
  },
};
