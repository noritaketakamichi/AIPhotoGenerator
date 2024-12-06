import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const uploads = pgTable("uploads", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  zipPath: text("zip_path").notNull(),
  falUrl: text("fal_url"),
  status: text("status").notNull().default("processing"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertUploadSchema = createInsertSchema(uploads);
export const selectUploadSchema = createSelectSchema(uploads);
export type InsertUpload = z.infer<typeof insertUploadSchema>;
export type Upload = z.infer<typeof selectUploadSchema>;
