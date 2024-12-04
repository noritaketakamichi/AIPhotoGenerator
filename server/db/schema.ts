import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  status: text('status').notNull(),
  fileCount: integer('file_count').notNull(),
  zipPath: text('zip_path').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
