// 管理画面共通レイアウト
// - PC幅(最大 960px)で中央寄せ
// - ヘッダーに「医局名 管理画面」+「アプリへ戻る」リンク
// - 管理者権限チェックは各ページで requireAdmin() を呼ぶ
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-surface border-b border-border sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{
                background: "linear-gradient(135deg,#3b82f6,#1e40af)",
                boxShadow: "0 2px 6px rgba(30,64,175,.25)",
              }}
            >
              医
            </span>
            <div>
              <div className="text-[11px] text-muted leading-tight">
                管理画面
              </div>
              <div className="text-sm font-bold leading-tight">医局員アプリ</div>
            </div>
          </Link>
          <Link
            href="/"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            ← 医局員ビューへ
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
