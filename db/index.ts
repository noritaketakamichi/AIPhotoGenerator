import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 本番環境（Heroku）でのSSL設定
const sslConfig =
  process.env.NODE_ENV === "production"
    ? {
        ssl: {
          rejectUnauthorized: false,
          require: true,
        },
      }
    : {};

// Poolの設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

// エラーハンドリング
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export const db = drizzle(pool, { schema });
