// 希望休タブ(/kibou)
// MVPではプレースホルダー表示(実装は次フェーズ)
import { eq, and } from "drizzle-orm";
import { db, memberships, medicalDepartments } from "@/db";
import { syncCurrentUser } from "@/lib/sync-user";

export default async function KibouPage() {
  const appUser = await syncCurrentUser();
  if (!appUser) return null;

  const myMemberships = await db
    .select({
      departmentName: medicalDepartments.name,
    })
    .from(memberships)
    .innerJoin(
      medicalDepartments,
      eq(memberships.departmentId, medicalDepartments.id)
    )
    .where(
      and(
        eq(memberships.userId, appUser.id),
        eq(memberships.status, "active")
      )
    );

  if (myMemberships.length === 0) {
    return (
      <main className="p-4 mt-8">
        <div className="bg-surface border border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted">
            所属医局がありません。招待URLから登録してください。
          </p>
        </div>
      </main>
    );
  }

  // 翌月の年月を計算
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthLabel = `${nextMonth.getFullYear()}年${nextMonth.getMonth() + 1}月`;

  return (
    <>
      {/* ヘッダー */}
      <header className="bg-surface border-b border-border sticky top-0 z-20 px-4 py-3">
        <h1 className="font-bold text-base">希望休の提出</h1>
        <div className="text-[11px] text-muted">
          {myMemberships[0].departmentName}
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* 開発中のお知らせ */}
        <section className="bg-[#fef3c7] border border-[#f59e0b] rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-base leading-none">🚧</span>
            <div>
              <div className="text-sm font-bold text-[#78350f] mb-1">
                希望休機能は開発中です
              </div>
              <div className="text-xs text-[#92400e]">
                現在は当直表メーカーで医局長が直接シフトを編集する運用です。
                Web経由の希望休提出は次フェーズでリリース予定。
              </div>
            </div>
          </div>
        </section>

        {/* 提出予定 */}
        <section className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <h2 className="accent text-sm font-bold mb-3">次回提出予定</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">対象月</dt>
              <dd className="font-bold">{nextMonthLabel}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">提出締切</dt>
              <dd className="text-muted">未設定</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">提出状況</dt>
              <dd className="text-muted">未提出</dd>
            </div>
          </dl>
        </section>

        {/* 機能予告 */}
        <section className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <h2 className="accent text-sm font-bold mb-3">予定している機能</h2>
          <ul className="text-xs text-text space-y-2 ml-5 list-disc">
            <li>カレンダー上で日付タップで希望休選択</li>
            <li>第1希望/第2希望の優先度設定</li>
            <li>医局長へのメモ欄</li>
            <li>締切3日前のリマインド通知</li>
            <li>過去の提出履歴閲覧</li>
          </ul>
        </section>

        <p className="text-[11px] text-muted-2 text-center pt-2">
          機能リリースまでは医局長へ直接ご連絡ください
        </p>
      </main>
    </>
  );
}
