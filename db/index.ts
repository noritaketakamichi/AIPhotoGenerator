import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let dbUrl = process.env.DATABASE_URL;

// sslmode=require がURL内に含まれていない場合、付与する
if (!dbUrl.includes("sslmode=require")) {
  dbUrl += dbUrl.includes("?") ? "&sslmode=require" : "?sslmode=require";
}

export const db = drizzle({
  connection: dbUrl,
  schema,
  ws: ws,
});
