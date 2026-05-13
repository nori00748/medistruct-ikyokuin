// 期間(月)一覧(/admin/periods)
import Link from "next/link";
import { eq, desc, sql } from "drizzle-orm";
import { db, shiftPeriods, kibouRequests } from "@/db";
import { requireAdmin } from "@/lib/require-admin";

export default async function PeriodsListPage() {
  const ctx = await requireAdmin();

  // 期間一覧+希望休提出数
  const rows = await db
    .select({
      id: shiftPeriods.id,
      year: shiftPeriods.year,
      month: shiftPeriods.month,
      status: shiftPeriods.status,
      kibouDeadline: shiftPeriods.kibouDeadline,
      confirmedAt: shiftPeriods.confirmedAt,
      kibouCount: sql<number>`count(distinct ${kibouRequests.id})`.as(
        "kibou_count"
      ),
    })
    .from(shiftPeriods)
    .leftJoin(kibouRequests, eq(kibouRequests.periodId, shiftPeriods.id))
    .where(eq(shiftPeriods.departmentId, ctx.departmentId))
    .groupBy(shiftPeriods.id)
    .orderBy(desc(shiftPeriods.year), desc(shiftPeriods.month));

  return (
    <div className="space-y-4">
      {/* パンくず */}
      <div className="text-xs text-muted">
        <Link href="/admin" className="hover:underline">
          管理画面
        </Link>
        <span className="mx-1.5 text-muted-2">›</span>
        <span>期間(月)管理</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="accent text-xl font-bold">期間(月)管理</h1>
        <Link
          href="/admin/periods/new"
          className="bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-md px-4 py-2"
          style={{ boxShadow: "0 1px 2px rgba(37,99,235,.2)" }}
        >
          + 新規作成
        </Link>
      </div>

      {/* 一覧 */}
      {rows.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <p className="text-sm text-muted mb-3">期間がまだ作成されていません</p>
          <Link
            href="/admin/periods/new"
            className="text-primary text-sm font-semibold hover:underline"
          >
            最初の期間を作成する →
          </Link>
        </div>
      ) : (
        <div
          className="bg-surface border border-border rounded-xl overflow-hidden"
          style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-border">
                <th className="text-left p-3 font-semibold text-muted text-xs">対象月</th>
                <th className="text-left p-3 font-semibold text-muted text-xs">ステータス</th>
                <th className="text-left p-3 font-semibold text-muted text-xs">希望休締切</th>
                <th className="text-right p-3 font-semibold text-muted text-xs">提出数</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-[#f8fafc]"
                >
                  <td className="p-3 font-semibold">
                    {p.year}年 {p.month}月
                  </td>
                  <td className="p-3">
                    {p.status === "confirmed" ? (
                      <span className="text-[10px] bg-[#dcfce7] text-[#166534] px-2 py-0.5 rounded-full font-bold">
                        確定済み
                      </span>
                    ) : (
                      <span className="text-[10px] bg-[#fef3c7] text-[#92400e] px-2 py-0.5 rounded-full font-bold">
                        下書き
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-muted text-xs">
                    {p.kibouDeadline
                      ? p.kibouDeadline.toLocaleDateString("ja-JP")
                      : "未設定"}
                  </td>
                  <td className="p-3 text-right font-bold">
                    {p.kibouCount}
                    <span className="text-xs text-muted-2 font-normal ml-0.5">
                      件
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/periods/${p.id}`}
                      className="text-primary text-xs font-semibold hover:underline"
                    >
                      詳細 ›
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
