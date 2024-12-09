import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// データベースURLの設定
const dbUrl = process.env.DATABASE_URL;

// Poolの設定
const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    // Heroku Postgres では SSL が必須
    rejectUnauthorized: false,
  },
  // コネクションエラー時の再試行設定
  max: 20, // デフォルトの最大プール数
  idleTimeoutMillis: 30000, // アイドル接続のタイムアウト
  connectionTimeoutMillis: 2000, // 接続タイムアウト
});

// エラーハンドリングの追加
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export const db = drizzle(pool, { schema });
