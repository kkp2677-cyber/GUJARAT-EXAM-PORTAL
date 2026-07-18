export interface Question {
  id: string;
  type: 'regular' | 'paragraph';
  passage?: string;
  questionText: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string;
}

export interface Exam {
  id: string;
  name: string;
  duration: number; // in minutes
  totalQuestions: number;
  type: 'mock' | 'bharti';
  questions: Question[];
  answerKeyUploaded: boolean;
  subject?: string | null;
  difficulty?: 'easy' | 'difficult' | string | null;
  totalVacancies?: string | null;
  examDate?: string | null;
}

export interface User {
  id: string;
  phone?: string;
  mobile?: string;
  name: string;
  email: string;
  category: 'General' | 'OBC' | 'EWS' | 'SC' | 'ST';
  dob: string;
  address: string;
  isBlocked: boolean;
  role?: 'user' | 'admin';
  allowedExams?: number;
  subscriptionPlan?: string;
  subscriptionExpiry?: string;
  token?: string;
}

export interface ExamHistory {
  id: string;
  examId: string;
  examName: string;
  marksObtained: number | null; // null if answer key not uploaded (bharti exam)
  totalMarks: number;
  timeTaken: string; // duration format (e.g., "12:34")
  submittedAt: string;
  answerKeyUploaded: boolean;
  correctCount?: number;
  incorrectCount?: number;
  leftCount?: number;
  eCount?: number;
  questions?: Question[];
  answers?: Record<string, string>;
}

export interface BlogPost {
  id: string;
  category: 'job' | 'answer_key' | 'result' | 'selection_list' | 'news';
  title: string;
  content: string;
  thumbnail: string;
  metaTitle: string;
  metaDesc: string;
  slug?: string;
  createdAt: string;
  date?: string;
  status?: 'draft' | 'published';
  isPinned?: boolean;
  views?: number;
  focusKeyword?: string;
  tags?: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  examName: string;
  category: string;
  selectionProbability?: number; // for bharti exam
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  link?: string;
  type: 'info' | 'alert' | 'job' | 'exam';
  createdAt: string;
  subscriptionPlan?: string;
  subscriptionExpiry?: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  examId: string;
  examName: string;
  questionId: string;
  question: Question;
  bookmarkedAt: string;
}

export interface ExamCalendarEvent {
  id: string;
  examName: string;
  department: string;
  startDate: string;
  endDate: string;
  examDate: string;
  officialLink?: string;
  expectedVacancies?: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'delayed';
  createdAt: string;
}


