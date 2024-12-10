import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  credit: integer('credit').notNull().default(0),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

export const trainingModels = pgTable('training_models', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id), // ← usersテーブルのidを参照
  name: text('name').notNull(),
  trainingDataUrl: text('training_data_url').notNull(),
  configUrl: text('config_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertTrainingModelSchema = createInsertSchema(trainingModels);
export const selectTrainingModelSchema = createSelectSchema(trainingModels);
export type InsertTrainingModel = z.infer<typeof insertTrainingModelSchema>;
export type TrainingModel = z.infer<typeof selectTrainingModelSchema>;

export const generatedPhotos = pgTable('generated_photos', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id), // ← usersテーブルのidを参照
  modelId: integer('model_id')
    .notNull()
    .references(() => trainingModels.id), // ← training_modelsテーブルのidを参照
  prompt: text('prompt').notNull(),
  imageUrl: text('image_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
});

export const insertGeneratedPhotoSchema = createInsertSchema(generatedPhotos);
export const selectGeneratedPhotoSchema = createSelectSchema(generatedPhotos);
export type InsertGeneratedPhoto = z.infer<typeof insertGeneratedPhotoSchema>;
export type GeneratedPhoto = z.infer<typeof selectGeneratedPhotoSchema>;