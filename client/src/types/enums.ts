export enum UserRole {
  Admin = 'Admin',
  Teacher = 'Teacher',
  Student = 'Student',
}

export enum QuestionType {
  MultipleChoice = 'MultipleChoice',
  SingleChoice = 'SingleChoice',
  TrueFalse = 'TrueFalse',
  Input = 'Input',
}

export enum QuestionContentType {
  TextOnly = 'TextOnly',
  PictureOnly = 'PictureOnly',
  TextAndPicture = 'TextAndPicture',
  TextAndTable = 'TextAndTable',
}

export enum DifficultyLevel {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export enum MediaType {
  Image = 'Image',
  ExcelTable = 'ExcelTable',
}

export enum QuizStatus {
  Draft = 'Draft',
  Published = 'Published',
  Archived = 'Archived',
}

export enum QuizMode {
  Learning = 'Learning',
  Exam = 'Exam',
}

export enum ExamStartMode {
  Manual = 'Manual',
  Scheduled = 'Scheduled',
}

export enum QuizAttemptStatus {
  InProgress = 'InProgress',
  Completed = 'Completed',
  TimedOut = 'TimedOut',
}
