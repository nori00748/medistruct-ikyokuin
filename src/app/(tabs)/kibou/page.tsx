// 希望休タブ(/kibou)
// 翌月の希望休提出 / 既存の提出済みデータ表示
import { eq, and, gte, desc } from "drizzle-orm";
import {
  db,
  memberships,
  medicalDepartments,
  shiftPeriods,
  kibouRequests,
  kibouDates,
} from "@/db";
import { syncCurrentUser } from "@/lib/sync-user";
import { KibouEditor } from "./_components/KibouEditor";

export default async function KibouPage() {
  const appUser = await syncCurrentUser();
  if (!appUser) return null;

  // 所属医局
  const myMemberships = await db
    .select({
      departmentId: medicalDepartments.id,
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

  const dept = myMemberships[0];

  // 今月以降の period 一覧
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  // 当該医局の今月以降の period(下書きと確定の両方)
  const periodsRaw = await db
    .select()
    .from(shiftPeriods)
    .where(
      and(
        eq(shiftPeriods.departmentId, dept.departmentId),
        gte(
          shiftPeriods.year,
          currentYear - 1 /* 大きめにマージン取って取得後フィルタ */
        )
      )
    )
    .orderBy(desc(shiftPeriods.year), desc(shiftPeriods.month));

  // 「今月以降」のみフィルタ
  const futurePeriods = periodsRaw.filter((p) => {
    if (p.year > currentYear) return true;
    if (p.year < currentYear) return false;
    return p.month >= currentMonth;
  });

  // 翌月対象 period を優先選択(なければ最初に見つかった未来の period)
  const targetPeriod =
    futurePeriods.find((p) => {
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      return p.year === nextYear && p.month === nextMonth;
    }) ?? futurePeriods.find((p) => p.year > currentYear || p.month > currentMonth);

  // 既存の提出データ
  let initialDates: Array<{ date: string; priority: number }> = [];
  let initialMemo = "";
  let alreadySubmitted = false;
  let lastUpdatedAt: Date | null = null;

  if (targetPeriod) {
    const existing = await db
      .select()
      .from(kibouRequests)
      .where(
        and(
          eq(kibouRequests.periodId, targetPeriod.id),
          eq(kibouRequests.userId, appUser.id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      alreadySubmitted = true;
      initialMemo = existing[0].memo ?? "";
      lastUpdatedAt = existing[0].updatedAt;

      const dateRows = await db
        .select()
        .from(kibouDates)
        .where(eq(kibouDates.kibouRequestId, existing[0].id));
      initialDates = dateRows.map((d) => ({
        date: d.date,
        priority: d.priority,
      }));
    }
  }

  return (
    <>
      <header className="bg-surface border-b border-border sticky top-0 z-20 px-4 py-3">
        <h1 className="font-bold text-base">希望休の提出</h1>
        <div className="text-[11px] text-muted">{dept.departmentName}</div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {!targetPeriod ? (
          <NoPeriodState />
        ) : (
          <>
            {/* 対象期間情報 */}
            <PeriodInfo
              period={targetPeriod}
              alreadySubmitted={alreadySubmitted}
              lastUpdatedAt={lastUpdatedAt}
            />

            {/* 編集UI(クライアントコンポーネント) */}
            <KibouEditor
              periodId={targetPeriod.id}
              year={targetPeriod.year}
              month={targetPeriod.month}
              initialDates={initialDates}
              initialMemo={initialMemo}
              alreadySubmitted={alreadySubmitted}
            />
          </>
        )}
      </main>
    </>
  );
}

// ===================================================================
// 期間情報カード
// ===================================================================
function PeriodInfo({
  period,
  alreadySubmitted,
  lastUpdatedAt,
}: {
  period: { year: number; month: number; kibouDeadline: Date | null; status: string };
  alreadySubmitted: boolean;
  lastUpdatedAt: Date | null;
}) {
  const deadline = period.kibouDeadline;
  const deadlineLabel = deadline
    ? `${deadline.getFullYear()}/${deadline.getMonth() + 1}/${deadline.getDate()}`
    : "未設定";
  const daysUntil = deadline
    ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isUrgent = daysUntil !== null && daysUntil <= 3 && daysUntil >= 0;

  return (
    <section
      className={`border rounded-xl p-4 ${
        isUrgent
          ? "bg-[#fef3c7] border-[#f59e0b]"
          : "bg-surface border-border"
      }`}
      style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted">対象期間</span>
        {alreadySubmitted ? (
          <span className="text-[10px] bg-[#dcfce7] text-[#166534] px-2 py-0.5 rounded-full font-bold">
            提出済み
          </span>
        ) : (
          <span className="text-[10px] bg-[#fef3c7] text-[#92400e] px-2 py-0.5 rounded-full font-bold">
            未提出
          </span>
        )}
      </div>
      <div className="text-xl font-bold mb-1">
        {period.year}年 {period.month}月 分
      </div>
      <dl className="text-xs space-y-1 text-muted">
        <div className="flex justify-between">
          <dt>提出締切</dt>
          <dd className="font-semibold text-text">
            {deadlineLabel}
            {daysUntil !== null && daysUntil >= 0 && (
              <span
                className={`ml-1 text-[10px] ${
                  isUrgent ? "text-[#dc2626]" : "text-muted-2"
                }`}
              >
                (あと{daysUntil}日)
              </span>
            )}
          </dd>
        </div>
        {alreadySubmitted && lastUpdatedAt && (
          <div className="flex justify-between">
            <dt>最終更新</dt>
            <dd className="font-semibold text-text">
              {lastUpdatedAt.toLocaleString("ja-JP", {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function NoPeriodState() {
  return (
    <section className="bg-surface border border-border rounded-xl p-5 text-center">
      <div className="text-2xl mb-3">📅</div>
      <p className="text-sm font-semibold mb-2">
        希望休の受付はまだ開始されていません
      </p>
      <p className="text-xs text-muted">
        医局長が次月の期間を作成すると、ここに提出フォームが表示されます。
      </p>
    </section>
  );
}
