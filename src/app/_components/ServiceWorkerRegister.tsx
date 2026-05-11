// Service Worker をブラウザに登録するクライアントコンポーネント
// 本番環境(HTTPS)でのみ有効。localhost でも動くが、Hot Reload と干渉しないよう
// development では一旦無効化する選択肢もある。
"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // 開発環境では一旦スキップ(必要なら process.env.NODE_ENV で分岐)
    if (process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (err) {
        console.error("Service Worker registration failed:", err);
      }
    };

    register();
  }, []);

  return null;
}
