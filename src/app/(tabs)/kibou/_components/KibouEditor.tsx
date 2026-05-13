// 希望休の編集UI(カレンダー上でタップ式)
// タップで:空欄 → 第1希望 → 第2希望 → 空欄 のサイクル
"use client";

import { useState, useTransition } from "react";
import { submitKibou, withdrawKibou } from "../actions";

type Priority = 0 | 1 | 2; // 0 = 未選択

type Props = {
  periodId: string;
  year: number;
  month: number;
  initialDates: Array<{ date: string; priority: number }>;
  initialMemo: string;
  alreadySubmitted: boolean;
};

export function KibouEditor({
  periodId,
  year,
  month,
  initialDates,
  initialMemo,
  alreadySubmitted,
}: Props) {
  // 日付 → 優先度 のマップ
  const [selections, setSelections] = useState<Record<string, Priority>>(() => {
    const m: Record<string, Priority> = {};
    for (const d of initialDates) {
      m[d.date] = (d.priority as Priority) || 0;
    }
    return m;
  });
  const [memo, setMemo] = useState(initialMemo);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // カレンダーのセル一覧を計算
  const firstDay = new Date(year, month - 1, 1);
  const lastDate = new Date(year, month, 0).getDate();
  const startWeekday = firstDay.getDay();
  const cells: Array<{ date: string; day: number; inMonth: boolean }> = [];

  // 前月余白
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ date: "", day: 0, inMonth: false });
  }
  // 当月
  for (let d = 1; d <= lastDate; d++) {
    cells.push({
      date: fmtDate(year, month, d),
      day: d,
      inMonth: true,
    });
  }
  // 末尾余白
  while (cells.length % 7 !== 0) {
    cells.push({ date: "", day: 0, inMonth: false });
  }

  // タップで状態遷移
  const handleCellTap = (date: string) => {
    if (!date) return;
    const current = selections[date] || 0;
    const next: Priority = (((current + 1) % 3) as Priority);
    setSelections((prev) => {
      const newSel = { ...prev };
      if (next === 0) delete newSel[date];
      else newSel[date] = next;
      return newSel;
    });
  };

  // 提出
  const handleSubmit = () => {
    setError(null);
    setSuccessMessage(null);

    const dates = Object.entries(selections).map(([date, priority]) => ({
      date,
      priority,
    }));

    const formData = new FormData();
    formData.set("periodId", periodId);
    formData.set("memo", memo);
    formData.set("dates", JSON.stringify(dates));

    startTransition(async () => {
      try {
        await submitKibou(formData);
        setSuccessMessage("提出しました");
      } catch (e) {
        setError(e instanceof Error ? e.message : "提出に失敗しました");
      }
    });
  };

  // 撤回
  const handleWithdraw = () => {
    if (!confirm("提出済みの希望休を撤回します。よろしいですか?")) return;
    setError(null);
    setSuccessMessage(null);
    const formData = new FormData();
    formData.set("periodId", periodId);
    startTransition(async () => {
      try {
        await withdrawKibou(formData);
        setSelections({});
        setMemo("");
        setSuccessMessage("撤回しました");
      } catch (e) {
        setError(e instanceof Error ? e.message : "撤回に失敗しました");
      }
    });
  };

  const selectedCount = Object.keys(selections).length;
  const p1Count = Object.values(selections).filter((p) => p === 1).length;
  const p2Count = Object.values(selections).filter((p) => p === 2).length;

  return (
    <div className="space-y-4">
      {/* カレンダー */}
      <div
        className="bg-surface border border-border rounded-xl overflow-hidden"
        style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
      >
        <div className="grid grid-cols-7 border-b border-border bg-[#f8fafc] text-[10px] font-bold text-center py-2">
          <div className="text-[#dc2626]">日</div>
          <div className="text-[#475569]">月</div>
          <div className="text-[#475569]">火</div>
          <div className="text-[#475569]">水</div>
          <div className="text-[#475569]">木</div>
          <div className="text-[#475569]">金</div>
          <div className="text-primary">土</div>
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            if (!cell.inMonth) {
              return (
                <div
                  key={idx}
                  className="aspect-square border-r border-b border-[#f1f5f9] p-1"
                />
              );
            }
            const priority = selections[cell.date] || 0;
            const dayOfWeek = new Date(cell.date).getDay();
            const dayColor =
              dayOfWeek === 0
                ? "#dc2626"
                : dayOfWeek === 6
                  ? "#2563eb"
                  : "#0f172a";

            const styles =
              priority === 1
                ? { background: "#16a34a", color: "white" }
                : priority === 2
                  ? { background: "#fbbf24", color: "white" }
                  : {};
            const labelText = priority === 1 ? "第1" : priority === 2 ? "第2" : "";

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleCellTap(cell.date)}
                className="aspect-square border-r border-b border-[#f1f5f9] flex flex-col items-center justify-center text-[13px] font-semibold transition-colors active:opacity-80"
                style={{
                  ...styles,
                  color: priority > 0 ? "white" : dayColor,
                  borderRadius: priority > 0 ? 8 : 0,
                  margin: priority > 0 ? 1 : 0,
                }}
              >
                <span>{cell.day}</span>
                {labelText && <span className="text-[8px]">{labelText}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ヘルプ */}
      <div className="bg-surface border border-border rounded-xl p-3 text-xs space-y-1.5">
        <div className="text-muted">
          日付をタップで <strong>空白</strong> → <strong>第1希望</strong> →{" "}
          <strong>第2希望</strong> → 空白 と切替
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-[#16a34a]"></span>第1希望
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-[#fbbf24]"></span>第2希望
          </span>
        </div>
      </div>

      {/* 選択中サマリー */}
      <div className="bg-surface border border-border rounded-xl p-4 text-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold">選択中</span>
          <span className="text-muted text-xs">
            計 {selectedCount} 日(第1: {p1Count} / 第2: {p2Count})
          </span>
        </div>
        {selectedCount === 0 ? (
          <div className="text-muted-2 text-xs">日付をタップして選択してください</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(selections)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, p]) => (
                <span
                  key={date}
                  className="text-[11px] px-2 py-1 rounded font-semibold"
                  style={{
                    background: p === 1 ? "#16a34a" : "#fbbf24",
                    color: "white",
                  }}
                >
                  {formatShort(date)}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* メモ */}
      <div>
        <label className="text-xs font-semibold text-[#475569] block mb-1">
          医局長へのメモ(任意)
        </label>
        <textarea
          rows={3}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="例:5/4-5は学会出張のため希望"
          className="w-full bg-surface border border-border rounded-lg p-3 text-sm resize-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      {/* メッセージ */}
      {error && (
        <div className="bg-[#fef2f2] border border-[#dc2626] rounded-lg p-3 text-sm text-[#7f1d1d]">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-[#dcfce7] border border-[#16a34a] rounded-lg p-3 text-sm text-[#14532d]">
          {successMessage}
        </div>
      )}

      {/* ボタン */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full bg-primary hover:bg-primary-hover disabled:bg-muted-2 text-white font-bold py-3.5 rounded-lg text-sm disabled:cursor-not-allowed"
          style={{ boxShadow: "0 1px 2px rgba(37,99,235,.2)" }}
        >
          {isPending
            ? "送信中..."
            : alreadySubmitted
              ? `更新する(${selectedCount}日)`
              : `提出する(${selectedCount}日)`}
        </button>

        {alreadySubmitted && (
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={isPending}
            className="w-full bg-surface border border-[#dc2626] text-[#dc2626] hover:bg-[#fef2f2] disabled:text-muted-2 disabled:border-border font-bold py-2.5 rounded-lg text-xs disabled:cursor-not-allowed"
          >
            提出を撤回する
          </button>
        )}

        <p className="text-center text-[10px] text-muted-2">
          提出後も締切まで何度でも更新できます
        </p>
      </div>
    </div>
  );
}

function fmtDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatShort(d: string): string {
  const [, m, day] = d.split("-").map(Number);
  const wd = new Date(d).getDay();
  const wds = ["日", "月", "火", "水", "木", "金", "土"];
  return `${m}/${day}(${wds[wd]})`;
}
