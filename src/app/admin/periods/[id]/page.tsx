// 期間詳細+希望休集約表示(/admin/periods/[id])
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import {
  db,
  shiftPeriods,
  kibouRequests,
  kibouDates,
  memberships,
  users as usersTable,
  groups,
} from "@/db";
import { requireAdmin } from "@/lib/require-admin";
import { updatePeriod, deletePeriod } from "./actions";

export default async function PeriodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: periodId } = await params;
  const ctx = await requireAdmin();

  // 期間取得
  const [period] = await db
    .select()
    .from(shiftPeriods)
    .where(
      and(
        eq(shiftPeriods.id, periodId),
        eq(shiftPeriods.departmentId, ctx.departmentId)
      )
    )
    .limit(1);
  if (!period) notFound();

  // この医局の全 active メンバー
  const allMembers = await db
    .select({
      userId: usersTable.id,
      displayName: usersTable.displayName,
      email: usersTable.email,
      role: memberships.role,
      groupName: groups.name,
      groupColor: groups.color,
    })
    .from(memberships)
    .innerJoin(usersTable, eq(memberships.userId, usersTable.id))
    .leftJoin(groups, eq(memberships.groupId, groups.id))
    .where(
      and(
        eq(memberships.departmentId, ctx.departmentId),
        eq(memberships.status, "active")
      )
    )
    .orderBy(asc(usersTable.displayName));

  // この期間の全希望休提出
  const submissions = await db
    .select({
      requestId: kibouRequests.id,
      userId: kibouRequests.userId,
      memo: kibouRequests.memo,
      submittedAt: kibouRequests.submittedAt,
      updatedAt: kibouRequests.updatedAt,
    })
    .from(kibouRequests)
    .where(eq(kibouRequests.periodId, periodId));

  // 各提出に紐づく日付
  const allDates = await db
    .select({
      requestId: kibouDates.kibouRequestId,
      date: kibouDates.date,
      priority: kibouDates.priority,
    })
    .from(kibouDates)
    .innerJoin(kibouRequests, eq(kibouDates.kibouRequestId, kibouRequests.id))
    .where(eq(kibouRequests.periodId, periodId))
    .orderBy(asc(kibouDates.date));

  // 集計マップ
  const datesByRequest = new Map<
    string,
    Array<{ date: string; priority: number }>
  >();
  for (const d of allDates) {
    if (!datesByRequest.has(d.requestId)) datesByRequest.set(d.requestId, []);
    datesByRequest
      .get(d.requestId)!
      .push({ date: d.date, priority: d.priority });
  }

  const submissionsByUser = new Map<string, (typeof submissions)[number]>();
  for (const s of submissions) {
    submissionsByUser.set(s.userId, s);
  }

  const submittedCount = submissions.length;
  const totalMembers = allMembers.length;
  const deadlineStr = period.kibouDeadline
    ? period.kibouDeadline.toISOString().slice(0, 10)
    : "";

  return (
    <div className="space-y-6">
      {/* パンくず */}
      <div className="text-xs text-muted">
        <Link href="/admin" className="hover:underline">
          管理画面
        </Link>
        <span className="mx-1.5 text-muted-2">›</span>
        <Link href="/admin/periods" className="hover:underline">
          期間管理
        </Link>
        <span className="mx-1.5 text-muted-2">›</span>
        <span>
          {period.year}年{period.month}月
        </span>
      </div>

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="accent text-xl font-bold">
            {period.year}年 {period.month}月
          </h1>
          <div className="text-xs text-muted mt-0.5">
            {period.status === "confirmed" ? (
              <span className="text-[10px] bg-[#dcfce7] text-[#166534] px-2 py-0.5 rounded-full font-bold">
                確定済み
              </span>
            ) : (
              <span className="text-[10px] bg-[#fef3c7] text-[#92400e] px-2 py-0.5 rounded-full font-bold">
                下書き
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 集計サマリー */}
      <section className="grid grid-cols-3 gap-3">
        <StatCard label="希望休提出" value={submittedCount} max={totalMembers} />
        <StatCard
          label="未提出"
          value={totalMembers - submittedCount}
          max={totalMembers}
        />
        <StatCard
          label="提出率"
          value={
            totalMembers > 0
              ? Math.round((submittedCount / totalMembers) * 100)
              : 0
          }
          suffix="%"
        />
      </section>

      {/* 期間設定編集 */}
      <section
        className="bg-surface border border-border rounded-xl p-5"
        style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
      >
        <h2 className="accent text-base font-bold mb-3">期間設定</h2>
        <form action={updatePeriod} className="space-y-3">
          <input type="hidden" name="periodId" value={periodId} />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#475569] block mb-1.5">
                希望休 提出締切
              </label>
              <input
                type="date"
                name="kibouDeadline"
                defaultValue={deadlineStr}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#475569] block mb-1.5">
                ステータス
              </label>
              <select
                name="status"
                defaultValue={period.status}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              >
                <option value="draft">下書き</option>
                <option value="confirmed">確定済み</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-md px-4 py-2"
          >
            更新する
          </button>
        </form>
      </section>

      {/* 希望休集約表 */}
      <section
        className="bg-surface border border-border rounded-xl overflow-hidden"
        style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
      >
        <div className="px-5 py-3 border-b border-border">
          <h2 className="accent text-base font-bold">医局員の希望休 一覧</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-border">
                <th className="text-left p-3 font-semibold text-muted text-xs">
                  医局員
                </th>
                <th className="text-left p-3 font-semibold text-muted text-xs">
                  グループ
                </th>
                <th className="text-left p-3 font-semibold text-muted text-xs">
                  希望日
                </th>
                <th className="text-left p-3 font-semibold text-muted text-xs">
                  メモ
                </th>
                <th className="text-right p-3 font-semibold text-muted text-xs">
                  提出日時
                </th>
              </tr>
            </thead>
            <tbody>
              {allMembers.map((m) => {
                const sub = submissionsByUser.get(m.userId);
                const dates = sub
                  ? datesByRequest.get(sub.requestId) ?? []
                  : [];
                return (
                  <tr
                    key={m.userId}
                    className="border-b border-border last:border-0"
                  >
                    <td className="p-3">
                      <div className="font-semibold">
                        {m.displayName ?? m.email}
                        {m.role === "admin" && (
                          <span className="text-[9px] bg-[#dbeafe] text-[#1e40af] px-1.5 py-0.5 rounded ml-1.5 font-bold">
                            医局長
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-2">{m.email}</div>
                    </td>
                    <td className="p-3 text-xs">
                      {m.groupName ? (
                        <span
                          className="px-2 py-0.5 rounded text-white text-[10px] font-semibold"
                          style={{ background: m.groupColor ?? "#64748b" }}
                        >
                          {m.groupName}
                        </span>
                      ) : (
                        <span className="text-muted-2">未設定</span>
                      )}
                    </td>
                    <td className="p-3">
                      {!sub ? (
                        <span className="text-[10px] bg-[#fee2e2] text-[#991b1b] px-2 py-0.5 rounded-full font-bold">
                          未提出
                        </span>
                      ) : dates.length === 0 ? (
                        <span className="text-[10px] bg-[#f1f5f9] text-muted px-2 py-0.5 rounded-full font-bold">
                          希望なし
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {dates.map((d) => (
                            <span
                              key={d.date}
                              className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-white"
                              style={{
                                background:
                                  d.priority === 1 ? "#16a34a" : "#fbbf24",
                              }}
                            >
                              {formatShortDate(d.date)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted max-w-[200px] truncate">
                      {sub?.memo ?? "—"}
                    </td>
                    <td className="p-3 text-right text-[10px] text-muted-2">
                      {sub?.updatedAt
                        ? sub.updatedAt.toLocaleString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted">
          <div>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-[#16a34a]"></span>第1希望
            </span>
            <span className="inline-flex items-center gap-1 ml-3">
              <span className="w-2 h-2 rounded bg-[#fbbf24]"></span>第2希望
            </span>
          </div>
          <div>合計 {allMembers.length} 人</div>
        </div>
      </section>

      {/* 危険ゾーン:期間削除 */}
      {period.status !== "confirmed" && (
        <section
          className="bg-surface border border-[#fecaca] rounded-xl p-5"
          style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
        >
          <h2 className="text-sm font-bold text-[#991b1b] mb-2">危険な操作</h2>
          <p className="text-xs text-muted mb-3">
            この期間を削除すると、関連する希望休提出データもすべて削除されます。
          </p>
          <form action={deletePeriod}>
            <input type="hidden" name="periodId" value={periodId} />
            <button
              type="submit"
              className="bg-surface border border-[#dc2626] text-[#dc2626] hover:bg-[#fef2f2] text-xs font-bold rounded-md px-3 py-2"
            >
              この期間を削除する
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  max,
  suffix,
}: {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="text-[11px] text-muted font-semibold mb-1">{label}</div>
      <div className="text-2xl font-bold">
        {value}
        {suffix && (
          <span className="text-xs text-muted-2 font-normal ml-0.5">
            {suffix}
          </span>
        )}
        {max !== undefined && (
          <span className="text-xs text-muted-2 font-normal ml-0.5">
            / {max}
          </span>
        )}
      </div>
    </div>
  );
}

function formatShortDate(d: string): string {
  const [, m, day] = d.split("-").map(Number);
  const wd = new Date(d).getDay();
  const wds = ["日", "月", "火", "水", "木", "金", "土"];
  return `${m}/${day}(${wds[wd]})`;
}
