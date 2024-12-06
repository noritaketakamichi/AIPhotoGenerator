import { pgTable, serial, text, timestamp, integer, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: text('name'),
  google_id: text('google_id').unique(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  status: text('status').notNull(),
  file_count: integer('file_count').notNull(),
  zip_path: text('zip_path').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  user_id: integer('user_id').references(() => users.id),
});
