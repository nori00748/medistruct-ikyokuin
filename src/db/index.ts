// DB接続クライアント
// アプリ全体でこの sql 関数を使ってDBにアクセスする
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

// Neonサーバーレス接続(HTTP経由・サーバレス向き)
const sql = neon(databaseUrl);

// Drizzle のクライアント。これをimportして使う
export const db = drizzle(sql, { schema });

// スキーマも再エクスポート(他のファイルで型として使う用)
export * from "./schema";
