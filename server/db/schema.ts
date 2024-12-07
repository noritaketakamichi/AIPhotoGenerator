import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  status: text('status').notNull(),
  file_count: integer('file_count').notNull(),
  zip_path: text('zip_path').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  credit: integer('credit').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
