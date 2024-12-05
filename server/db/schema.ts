import { pgTable, serial, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password'),
  name: text('name').notNull(),
  googleId: text('google_id').unique(),
  picture: text('picture'),
  aiTrials: integer('ai_trials').default(0).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  status: text('status').notNull(),
  file_count: integer('file_count').notNull(),
  zip_path: text('zip_path').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});
