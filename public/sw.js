// 医局員アプリ Service Worker (最小構成)
// MVP段階ではキャッシュ・オフライン対応は控えめにし、
// PWAインストール可能要件を満たすことのみ目的とする。
// 将来的に Web Push 通知の受信ロジックを追加予定。

const CACHE_NAME = "medistruct-ikyokuin-v1";

self.addEventListener("install", (event) => {
  // 即座に有効化
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 全てのクライアントを即座に制御
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // ネットワーク優先(キャッシュは将来追加)
  // SSR ベースのアプリなので、基本はサーバから取得
  return;
});

// 将来用:Push 通知受信
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || "医局員アプリ";
    const options = {
      body: data.body || "",
      icon: "/icon",
      badge: "/icon",
      data: data.data || {},
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // ignore
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window" })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});
