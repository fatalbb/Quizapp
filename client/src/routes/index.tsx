import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types/enums';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../pages/auth/LoginPage';
import ChangePasswordPage from '../pages/auth/ChangePasswordPage';
import ForbiddenPage from '../pages/auth/ForbiddenPage';
import NotFoundPage from '../pages/auth/NotFoundPage';

// Lazy-loaded admin pages
const AdminDashboardPage = React.lazy(() => import('../pages/admin/DashboardPage'));
const UsersListPage = React.lazy(() => import('../pages/admin/UsersListPage'));
const UserFormPage = React.lazy(() => import('../pages/admin/UserFormPage'));

// Lazy-loaded teacher pages (shared with admin)
const CategoriesPage = React.lazy(() => import('../pages/teacher/CategoriesPage'));
const QuestionsListPage = React.lazy(() => import('../pages/teacher/QuestionsListPage'));
const QuestionFormPage = React.lazy(() => import('../pages/teacher/QuestionFormPage'));
const QuizzesListPage = React.lazy(() => import('../pages/teacher/QuizzesListPage'));
const QuizFormPage = React.lazy(() => import('../pages/teacher/QuizFormPage'));
const AiGeneratePage = React.lazy(() => import('../pages/teacher/AiGeneratePage'));

// Lazy-loaded analytics pages (shared between admin and teacher)
const QuizAnalyticsPage = React.lazy(() => import('../pages/teacher/QuizAnalyticsPage'));
const StudentPerformancePage = React.lazy(() => import('../pages/teacher/StudentPerformancePage'));

// Lazy-loaded student pages
const QuizBrowsePage = React.lazy(() => import('../pages/student/QuizBrowsePage'));
const QuizTakePage = React.lazy(() => import('../pages/student/QuizTakePage'));
const MyAttemptsPage = React.lazy(() => import('../pages/student/MyAttemptsPage'));
const QuizResultPage = React.lazy(() => import('../pages/student/QuizResultPage'));

// Teacher dashboard
const TeacherDashboardPage = React.lazy(() => import('../pages/teacher/DashboardPage'));

function SuspenseWrapper() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: 48 }}>
          <Spin size="large" />
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );
}

function RoleRedirect() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case UserRole.Admin:
      return <Navigate to="/admin/dashboard" replace />;
    case UserRole.Teacher:
      return <Navigate to="/teacher/dashboard" replace />;
    case UserRole.Student:
      return <Navigate to="/student/quizzes" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RoleRedirect />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/change-password',
    element: <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Teacher, UserRole.Student]} />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Spin size="large" style={{ display: 'block', margin: '100px auto' }} />}>
            <ChangePasswordPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute allowedRoles={[UserRole.Admin]} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            element: <SuspenseWrapper />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <AdminDashboardPage /> },
              { path: 'users', element: <UsersListPage /> },
              { path: 'users/new', element: <UserFormPage /> },
              { path: 'categories', element: <CategoriesPage /> },
              { path: 'questions', element: <QuestionsListPage /> },
              { path: 'questions/new', element: <QuestionFormPage /> },
              { path: 'questions/:id/edit', element: <QuestionFormPage /> },
              { path: 'questions/generate', element: <AiGeneratePage /> },
              { path: 'quizzes', element: <QuizzesListPage /> },
              { path: 'quizzes/new', element: <QuizFormPage /> },
              { path: 'quizzes/:id/edit', element: <QuizFormPage /> },
              { path: 'analytics/quiz/:quizId', element: <QuizAnalyticsPage /> },
              { path: 'analytics/student/:studentId', element: <StudentPerformancePage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/teacher',
    element: <ProtectedRoute allowedRoles={[UserRole.Teacher]} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            element: <SuspenseWrapper />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <TeacherDashboardPage /> },
              { path: 'categories', element: <CategoriesPage /> },
              { path: 'questions', element: <QuestionsListPage /> },
              { path: 'questions/new', element: <QuestionFormPage /> },
              { path: 'questions/:id/edit', element: <QuestionFormPage /> },
              { path: 'questions/generate', element: <AiGeneratePage /> },
              { path: 'quizzes', element: <QuizzesListPage /> },
              { path: 'quizzes/new', element: <QuizFormPage /> },
              { path: 'quizzes/:id/edit', element: <QuizFormPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/student',
    element: <ProtectedRoute allowedRoles={[UserRole.Student]} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            element: <SuspenseWrapper />,
            children: [
              { index: true, element: <Navigate to="quizzes" replace /> },
              { path: 'quizzes', element: <QuizBrowsePage /> },
              { path: 'quizzes/:quizId/take', element: <QuizTakePage /> },
              { path: 'attempts', element: <MyAttemptsPage /> },
              { path: 'attempts/:attemptId/result', element: <QuizResultPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/403',
    element: <ForbiddenPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
