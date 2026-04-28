// Drizzle Kit の設定ファイル
// `npx drizzle-kit push` などのコマンドで参照される
import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// .env.local を読み込む
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts", // テーブル定義ファイル
  out: "./drizzle",              // マイグレーションファイル出力先
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,                 // 詳細ログ出力
  strict: true,                  // 厳密モード
});
