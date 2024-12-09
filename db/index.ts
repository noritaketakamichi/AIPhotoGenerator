import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl.includes("sslmode=require")) {
  dbUrl += dbUrl.includes("?") ? "&sslmode=require" : "?sslmode=require";
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const db = drizzle(pool, { schema });
