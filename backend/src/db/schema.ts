import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).unique().notNull(),
  value: text('value').notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'int' | 'string' | 'bool' | 'array'
  description: varchar('description', { length: 255 }),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 150 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('student'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  classUsers: many(classUser),
  createdTasks: many(tasks),
  taskAssignments: many(taskAssignments),
  submissions: many(submissions),
  activityLogs: many(activityLogs),
}));

export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const classesRelations = relations(classes, ({ many }) => ({
  classUsers: many(classUser),
  taskAssignments: many(taskAssignments),
}));

export const classUser = pgTable('class_user', {
  classId: integer('class_id').references(() => classes.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.classId, t.userId] })
}));

export const classUserRelations = relations(classUser, ({ one }) => ({
  class: one(classes, {
    fields: [classUser.classId],
    references: [classes.id],
  }),
  user: one(users, {
    fields: [classUser.userId],
    references: [users.id],
  }),
}));

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  language: varchar('language', { length: 50 }),
  deadline: timestamp('deadline').notNull(),
  submissionType: varchar('submission_type', { length: 20 }).notNull().default('both'), // 'code' | 'zip' | 'both'
  createdBy: integer('created_by').references(() => users.id),
  starterFilePath: varchar('starter_file_path', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  author: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
  }),
  assignments: many(taskAssignments),
  submissions: many(submissions),
}));

export const taskAssignments = pgTable('task_assignments', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  classId: integer('class_id').references(() => classes.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at').defaultNow(),
});

export const taskAssignmentsRelations = relations(taskAssignments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskAssignments.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskAssignments.userId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [taskAssignments.classId],
    references: [classes.id],
  }),
}));

export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 10 }).notNull(), // 'zip' | 'code'
  codeContent: text('code_content'),
  language: varchar('language', { length: 50 }),
  filePath: varchar('file_path', { length: 500 }),
  submittedAt: timestamp('submitted_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  grade: varchar('grade', { length: 10 }),
  feedback: text('feedback'),
  gradedAt: timestamp('graded_at'),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending' | 'graded' | 'rejected'
  canEdit: boolean('canEdit').default(true),
});

export const submissionsRelations = relations(submissions, ({ one }) => ({
  task: one(tasks, {
    fields: [submissions.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
}));

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  entity: varchar('entity', { length: 100 }),
  entityId: integer('entity_id'),
  meta: jsonb('meta'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));
