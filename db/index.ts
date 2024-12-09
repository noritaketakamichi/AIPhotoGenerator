import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// DATABASE_URLにSSLモードを追加
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl.includes("sslmode=require")) {
  dbUrl += (dbUrl.includes("?") ? "&" : "?") + "sslmode=require";
}

// Heroku Postgres用の設定
const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

// エラーハンドリング
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export const db = drizzle(pool, { schema });
