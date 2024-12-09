import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  credit: integer("credit").notNull().default(0),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const training_models = pgTable("training_models", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  training_data_url: text("training_data_url").notNull(),
  config_url: text("config_url").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const generated_photos = pgTable("generated_photos", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
  model_id: integer("model_id")
    .notNull()
    .references(() => training_models.id),
  prompt: text("prompt").notNull(),
  image_url: text("image_url").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
