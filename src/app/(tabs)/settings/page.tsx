// 設定タブ(/settings)
// プロフィール表示・通知設定(UI のみ)・ログアウト・各種リンク
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { eq, and } from "drizzle-orm";
import { db, memberships, medicalDepartments, groups } from "@/db";
import { syncCurrentUser } from "@/lib/sync-user";

export default async function SettingsPage() {
  const appUser = await syncCurrentUser();
  if (!appUser) return null;

  const myMemberships = await db
    .select({
      departmentName: medicalDepartments.name,
      university: medicalDepartments.university,
      role: memberships.role,
      groupName: groups.name,
    })
    .from(memberships)
    .innerJoin(
      medicalDepartments,
      eq(memberships.departmentId, medicalDepartments.id)
    )
    .leftJoin(groups, eq(memberships.groupId, groups.id))
    .where(
      and(
        eq(memberships.userId, appUser.id),
        eq(memberships.status, "active")
      )
    );

  const dept = myMemberships[0];
  const initial = appUser.displayName?.charAt(0) ?? appUser.email.charAt(0);

  return (
    <>
      {/* ヘッダー */}
      <header className="bg-surface border-b border-border sticky top-0 z-20 px-4 py-3">
        <h1 className="font-bold text-base">設定</h1>
      </header>

      <main className="px-4 py-4 space-y-5">
        {/* 医局長メニュー(admin のみ表示) */}
        {dept?.role === "admin" && (
          <section>
            <Link
              href="/admin"
              className="block bg-surface border-2 border-primary rounded-xl p-4 flex items-center gap-3 hover:bg-[#eff6ff]"
              style={{ boxShadow: "0 4px 14px rgba(37,99,235,.08)" }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg,#3b82f6,#1e40af)",
                }}
              >
                ⚙
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">医局長管理画面へ</div>
                <div className="text-[11px] text-muted">
                  期間作成・希望休確認・招待URL発行
                </div>
              </div>
              <span className="text-muted-2">›</span>
            </Link>
          </section>
        )}

        {/* プロフィール */}
        <section>
          <h2 className="accent text-sm font-bold mb-2">プロフィール</h2>
          <div
            className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden"
            style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
          >
            <div className="p-4 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{
                  background: "linear-gradient(135deg,#3b82f6,#1e40af)",
                }}
              >
                {initial.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">
                  {appUser.displayName ?? "未設定"}
                </div>
                <div className="text-xs text-muted truncate">
                  {appUser.email}
                </div>
                {dept && (
                  <div className="text-[11px] text-muted-2">
                    {dept.role === "admin" ? "医局長" : "医局員"}
                    {dept.groupName ? ` ・ ${dept.groupName}` : ""}
                  </div>
                )}
              </div>
            </div>
            {dept && (
              <div className="p-4 flex items-center justify-between text-sm">
                <span className="text-[#475569]">所属医局</span>
                <span className="font-semibold text-right">
                  {dept.departmentName}
                  {dept.university && (
                    <span className="block text-[11px] text-muted-2 font-normal">
                      {dept.university}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* 通知設定(UI のみ・実装は次フェーズ) */}
        <section>
          <h2 className="accent text-sm font-bold mb-2">通知設定</h2>
          <div
            className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden"
            style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
          >
            <ToggleRow
              label="プッシュ通知"
              description="スマホへの通知を受信"
              defaultChecked
            />
            <ToggleRow
              label="メール通知"
              description="重要な通知をメールでも受信"
              defaultChecked
            />
            <ToggleRow
              label="当直リマインダー(当日朝)"
              description="毎朝7:00 に当日のシフトを通知"
              defaultChecked
            />
            <ToggleRow
              label="希望休締切前のリマインド"
              description="3日前と前日に通知"
              defaultChecked
            />
          </div>
          <p className="text-[10px] text-muted-2 mt-2 px-1">
            通知機能は次フェーズで実装予定です(UIのみ表示)
          </p>
        </section>

        {/* 連携サービス */}
        <section>
          <h2 className="accent text-sm font-bold mb-2">連携サービス</h2>
          <div
            className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3"
            style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
          >
            <div className="w-9 h-9 bg-surface border border-border rounded-lg flex items-center justify-center text-base">
              📅
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Googleカレンダー</div>
              <div className="text-[11px] text-[#dc2626]">未連携</div>
            </div>
            <button
              disabled
              className="text-[11px] bg-muted-2 text-white px-3 py-1.5 rounded-md font-semibold cursor-not-allowed"
            >
              開発中
            </button>
          </div>
        </section>

        {/* ヘルプ・規約 */}
        <section>
          <h2 className="accent text-sm font-bold mb-2">ヘルプ・規約</h2>
          <div
            className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden"
            style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
          >
            <a
              href="#"
              className="p-3.5 flex items-center justify-between hover:bg-bg text-sm"
            >
              <span>ヘルプ・使い方</span>
              <span className="text-[#cbd5e1]">›</span>
            </a>
            <a
              href="mailto:medistruct.info@gmail.com"
              className="p-3.5 flex items-center justify-between hover:bg-bg text-sm"
            >
              <span>お問い合わせ</span>
              <span className="text-[#cbd5e1]">›</span>
            </a>
            <a
              href="#"
              className="p-3.5 flex items-center justify-between hover:bg-bg text-sm"
            >
              <span>利用規約</span>
              <span className="text-[#cbd5e1]">›</span>
            </a>
            <a
              href="#"
              className="p-3.5 flex items-center justify-between hover:bg-bg text-sm"
            >
              <span>プライバシーポリシー</span>
              <span className="text-[#cbd5e1]">›</span>
            </a>
            <div className="p-3.5 flex items-center justify-between text-sm">
              <span className="text-muted">バージョン</span>
              <span className="text-muted-2 text-xs">0.1.0 (MVP)</span>
            </div>
          </div>
        </section>

        {/* ログアウト */}
        <section>
          <div
            className="bg-surface border border-border rounded-xl overflow-hidden"
            style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
          >
            <SignOutButton>
              <button className="w-full p-3.5 text-sm text-[#475569] hover:bg-bg text-left">
                ログアウト
              </button>
            </SignOutButton>
          </div>
        </section>

        {/* 開発用リンク */}
        <div className="text-center pt-4 pb-2">
          <Link
            href="/dev/seed"
            className="text-[11px] text-muted-2 hover:text-muted underline"
          >
            🛠 テストデータ管理(開発用)
          </Link>
        </div>
      </main>
    </>
  );
}

function ToggleRow({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="p-4 flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-[11px] text-muted">{description}</div>
      </div>
      <label className="relative inline-block w-11 h-6">
        <input
          type="checkbox"
          defaultChecked={defaultChecked}
          disabled
          className="opacity-0 w-0 h-0 peer"
        />
        <span
          className="absolute inset-0 cursor-not-allowed rounded-full transition-colors"
          style={{
            background: defaultChecked ? "#2563eb" : "#cbd5e1",
            opacity: 0.6,
          }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform"
            style={{
              left: defaultChecked ? "calc(100% - 22px)" : "2px",
              boxShadow: "0 2px 4px rgba(15,23,42,.2)",
            }}
          />
        </span>
      </label>
    </div>
  );
}
