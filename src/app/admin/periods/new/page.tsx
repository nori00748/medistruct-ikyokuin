// 期間新規作成(/admin/periods/new)
import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { createPeriod } from "./actions";

export default async function NewPeriodPage() {
  await requireAdmin();

  // デフォルト値:翌月
  const now = new Date();
  const defaultYear =
    now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const defaultMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2;

  // 希望休締切のデフォルト:対象月の前月15日
  const deadlineDefault = new Date(defaultYear, defaultMonth - 2, 15);
  const deadlineDefaultStr = deadlineDefault.toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
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
        <span>新規作成</span>
      </div>

      <h1 className="accent text-xl font-bold">期間(月)の新規作成</h1>

      <form
        action={createPeriod}
        className="bg-surface border border-border rounded-xl p-6 space-y-4 max-w-xl"
        style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
      >
        {/* 年月 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-[#475569] block mb-1.5">
              対象年
            </label>
            <input
              type="number"
              name="year"
              defaultValue={defaultYear}
              min={2024}
              max={2100}
              required
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#475569] block mb-1.5">
              対象月
            </label>
            <select
              name="month"
              defaultValue={defaultMonth}
              required
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}月
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 希望休締切 */}
        <div>
          <label className="text-xs font-bold text-[#475569] block mb-1.5">
            希望休 提出締切
          </label>
          <input
            type="date"
            name="kibouDeadline"
            defaultValue={deadlineDefaultStr}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
          <p className="text-[10px] text-muted-2 mt-1">
            締切日まで医局員は希望休を提出・修正できます
          </p>
        </div>

        {/* ボタン */}
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg text-sm"
            style={{ boxShadow: "0 1px 2px rgba(37,99,235,.2)" }}
          >
            期間を作成する
          </button>
          <Link
            href="/admin/periods"
            className="bg-surface border border-border text-text hover:bg-bg font-semibold py-3 px-5 rounded-lg text-sm"
          >
            キャンセル
          </Link>
        </div>
      </form>

      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-4 max-w-xl text-xs text-[#1e3a8a]">
        <strong>💡 ヒント</strong>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>期間を作成すると、医局員アプリの「希望休」タブに表示されます</li>
          <li>締切日を過ぎても手動で提出を受け付けられます(後続フェーズで自動ロック予定)</li>
          <li>同じ年月の期間は1つしか作れません</li>
        </ul>
      </div>
    </div>
  );
}
