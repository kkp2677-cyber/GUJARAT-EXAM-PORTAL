import { integer, pgTable, serial, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Local auth phone / UID
  email: text('email'),
  phone: text('phone').unique(),
  password: text('password'),
  name: text('name'),
  category: text('category'),
  dob: text('dob'),
  address: text('address'),
  role: text('role').default('user'),
  isBlocked: boolean('is_blocked').default(false),
  subscriptionPlan: text('subscription_plan').default('free'),
  subscriptionExpiry: timestamp('subscription_expiry'),
  allowedExams: integer('allowed_exams').default(3),
  createdAt: timestamp('created_at').defaultNow(),
});

export const exams = pgTable('exams', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  duration: integer('duration').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  type: text('type').notNull(),
  questions: jsonb('questions').notNull(), // Store questions array
  answerKeyUploaded: boolean('answer_key_uploaded').default(false),
  subject: text('subject'),
  difficulty: text('difficulty'),
  totalVacancies: text('total_vacancies'),
  examDate: text('exam_date'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const examResults = pgTable('exam_results', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  examId: integer('exam_id').references(() => exams.id).notNull(),
  score: integer('score').notNull(),
  answers: jsonb('answers').notNull(),
  date: text('date').notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  thumbnail: text('thumbnail'),
  metaTitle: text('meta_title'),
  metaDesc: text('meta_desc'),
  slug: text('slug').unique(),
  views: integer('views').default(0),
  date: text('date').notNull(), // ISO Date string
  focusKeyword: text('focus_keyword'),
  tags: text('tags'),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  type: text('type').notNull(),
  link: text('link'),
  date: text('date').notNull(), // ISO Date string
});

export const calendarEvents = pgTable('calendar_events', {
  id: serial('id').primaryKey(),
  examName: text('exam_name').notNull(),
  department: text('department').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  examDate: text('exam_date').notNull(),
  officialLink: text('official_link'),
  expectedVacancies: integer('expected_vacancies'),
  status: text('status').notNull(), // upcoming, ongoing, completed
});

export const bookmarks = pgTable('bookmarks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  questionId: text('question_id').notNull(),
  examId: integer('exam_id').notNull(),
  examName: text('exam_name').notNull(),
  questionText: text('question_text').notNull(),
  options: jsonb('options').notNull(),
  correctAnswer: text('correct_answer').notNull(),
  date: text('date').notNull(),
});

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'), // optional, if we want to link
  endpoint: text('endpoint').notNull().unique(),
  auth: text('auth').notNull(),
  p256dh: text('p256dh').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const leaderboardSummary = pgTable('leaderboard_summary', {
  id: serial('id').primaryKey(),
  type: text('type').notNull().unique(), // 'combined', 'mock', 'bharti'
  data: jsonb('data').notNull(), // JSON array of rankings
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const wishlist = pgTable('wishlist', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  examId: integer('exam_id').references(() => exams.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

