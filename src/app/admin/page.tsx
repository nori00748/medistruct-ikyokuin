// 管理ダッシュボード(/admin)
import Link from "next/link";
import { eq, and, count } from "drizzle-orm";
import {
  db,
  memberships,
  shiftPeriods,
  invitations,
  kibouRequests,
} from "@/db";
import { requireAdmin } from "@/lib/require-admin";

export default async function AdminDashboard() {
  const ctx = await requireAdmin();

  // 各種カウント
  const [memberCountRows, periodCountRows, inviteCountRows, kibouCountRows] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(memberships)
        .where(
          and(
            eq(memberships.departmentId, ctx.departmentId),
            eq(memberships.status, "active")
          )
        ),
      db
        .select({ value: count() })
        .from(shiftPeriods)
        .where(eq(shiftPeriods.departmentId, ctx.departmentId)),
      db
        .select({ value: count() })
        .from(invitations)
        .where(eq(invitations.departmentId, ctx.departmentId)),
      db
        .select({ value: count() })
        .from(kibouRequests)
        .innerJoin(shiftPeriods, eq(kibouRequests.periodId, shiftPeriods.id))
        .where(eq(shiftPeriods.departmentId, ctx.departmentId)),
    ]);

  const memberCount = memberCountRows[0]?.value ?? 0;
  const periodCount = periodCountRows[0]?.value ?? 0;
  const inviteCount = inviteCountRows[0]?.value ?? 0;
  const kibouCount = kibouCountRows[0]?.value ?? 0;

  return (
    <div className="space-y-6">
      {/* 医局情報 */}
      <section
        className="bg-surface border border-border rounded-xl p-6"
        style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
      >
        <h1 className="accent text-xl font-bold mb-1">
          {ctx.departmentName}
        </h1>
        <div className="text-sm text-muted">
          {ctx.university ? `${ctx.university} ・ ` : ""}
          プラン: {ctx.plan}
        </div>
      </section>

      {/* 集計カード */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="医局員" value={memberCount} suffix="人" />
        <StatCard label="期間(月)" value={periodCount} suffix="件" />
        <StatCard label="希望休提出" value={kibouCount} suffix="件" />
        <StatCard label="招待URL" value={inviteCount} suffix="件" />
      </section>

      {/* 管理メニュー */}
      <section>
        <h2 className="accent text-base font-bold mb-3">管理メニュー</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <AdminLinkCard
            href="/admin/periods"
            title="期間(月)管理"
            description="シフト作成対象の月を作成・編集します"
            icon="📅"
          />
          <AdminLinkCard
            href="/admin/invitations"
            title="医局員の招待"
            description="招待URLを発行・管理します"
            icon="✉️"
          />
          <AdminLinkCard
            href="/admin/periods"
            title="希望休の確認"
            description="各期間の希望休提出状況を確認します"
            icon="🗓"
          />
          <AdminLinkCard
            href="/"
            title="医局員ビューに戻る"
            description="通常のホーム・カレンダー画面へ"
            icon="🏠"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="text-[11px] text-muted font-semibold mb-1">{label}</div>
      <div className="text-2xl font-bold">
        {value}
        <span className="text-xs text-muted-2 font-normal ml-0.5">{suffix}</span>
      </div>
    </div>
  );
}

function AdminLinkCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="bg-surface border border-border rounded-xl p-5 hover:border-primary hover:shadow-md transition-all flex items-start gap-3"
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <div className="font-semibold text-sm mb-0.5">{title}</div>
        <div className="text-xs text-muted">{description}</div>
      </div>
      <span className="text-muted-2">›</span>
    </Link>
  );
}
