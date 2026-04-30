// 全員カレンダータブ(/calendar)
// 当月のシフトを月表示で確認
// 日付タップで詳細を下に表示
import { eq, and, gte, lte } from "drizzle-orm";
import {
  db,
  memberships,
  medicalDepartments,
  shifts as shiftsTable,
  users as usersTable,
} from "@/db";
import { syncCurrentUser } from "@/lib/sync-user";

type ShiftRow = typeof shiftsTable.$inferSelect & {
  userName: string | null;
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; m?: string }>;
}) {
  const params = await searchParams;
  const appUser = await syncCurrentUser();
  if (!appUser) return null;

  // 所属医局取得
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
    return <NoMembershipState />;
  }

  const dept = myMemberships[0];

  // 月選択(クエリパラメータ ?m=YYYY-MM、未指定は今月)
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth() + 1;
  if (params.m) {
    const m = params.m.match(/^(\d{4})-(\d{1,2})$/);
    if (m) {
      year = parseInt(m[1], 10);
      month = parseInt(m[2], 10);
    }
  }

  // 当該月の全シフト取得
  const monthStart = formatDate(new Date(year, month - 1, 1));
  const monthEnd = formatDate(new Date(year, month, 0));
  const monthShifts: ShiftRow[] = await db
    .select({
      id: shiftsTable.id,
      periodId: shiftsTable.periodId,
      date: shiftsTable.date,
      type: shiftsTable.type,
      label: shiftsTable.label,
      assignedUserId: shiftsTable.assignedUserId,
      startTime: shiftsTable.startTime,
      endTime: shiftsTable.endTime,
      isSplit: shiftsTable.isSplit,
      splitRole: shiftsTable.splitRole,
      notes: shiftsTable.notes,
      createdAt: shiftsTable.createdAt,
      updatedAt: shiftsTable.updatedAt,
      userName: usersTable.displayName,
    })
    .from(shiftsTable)
    .leftJoin(usersTable, eq(shiftsTable.assignedUserId, usersTable.id))
    .where(
      and(
        gte(shiftsTable.date, monthStart),
        lte(shiftsTable.date, monthEnd)
      )
    );

  // 日付ごとにシフトをグループ化
  const shiftsByDate = new Map<string, ShiftRow[]>();
  for (const s of monthShifts) {
    if (!shiftsByDate.has(s.date)) shiftsByDate.set(s.date, []);
    shiftsByDate.get(s.date)!.push(s);
  }

  // 選択日(?d=YYYY-MM-DD、未指定は今日 or 月初)
  const todayStr = formatDate(today);
  let selectedDate = params.d || todayStr;
  // 選択日が当該月外なら月初に
  if (!selectedDate.startsWith(`${year}-${String(month).padStart(2, "0")}`)) {
    selectedDate =
      todayStr.startsWith(`${year}-${String(month).padStart(2, "0")}`)
        ? todayStr
        : monthStart;
  }
  const selectedShifts = shiftsByDate.get(selectedDate) ?? [];

  // 月遷移用URL
  const prevMonth = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const prevHref = `/calendar?m=${prevMonth.y}-${String(prevMonth.m).padStart(2, "0")}`;
  const nextHref = `/calendar?m=${nextMonth.y}-${String(nextMonth.m).padStart(2, "0")}`;

  return (
    <>
      {/* ヘッダー */}
      <header className="bg-surface border-b border-border sticky top-0 z-20 px-4 py-3">
        <h1 className="font-bold text-base">全員カレンダー</h1>
        <div className="text-[11px] text-muted">{dept.departmentName}</div>
      </header>

      <main className="px-3 py-3 space-y-3">
        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between bg-surface border border-border rounded-xl px-3 py-2">
          <a
            href={prevHref}
            className="w-8 h-8 rounded-full hover:bg-bg flex items-center justify-center text-muted"
          >
            ‹
          </a>
          <div className="font-bold text-base">
            {year}年 {month}月
          </div>
          <a
            href={nextHref}
            className="w-8 h-8 rounded-full hover:bg-bg flex items-center justify-center text-muted"
          >
            ›
          </a>
        </div>

        {/* カレンダーグリッド */}
        <CalendarGrid
          year={year}
          month={month}
          shiftsByDate={shiftsByDate}
          selfUserId={appUser.id}
          selectedDate={selectedDate}
        />

        {/* 凡例 */}
        <div className="flex flex-wrap items-center gap-3 px-1 text-[11px] text-[#475569]">
          <Legend color="#1e40af" label="当直" />
          <Legend color="#d97706" label="オンコール" />
          <Legend color="#059669" label="外勤" />
          <div className="ml-auto flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm border-2 border-primary"></span>
            自分
          </div>
        </div>

        {/* 選択日のシフト詳細 */}
        <section>
          <h2 className="accent text-sm font-bold mb-2">
            {formatDateLabel(selectedDate)} のシフト
          </h2>
          {selectedShifts.length > 0 ? (
            <div className="bg-surface border border-border rounded-xl divide-y divide-border">
              {selectedShifts.map((s) => (
                <ShiftDetailRow
                  key={s.id}
                  shift={s}
                  isSelf={s.assignedUserId === appUser.id}
                />
              ))}
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl p-4 text-center text-sm text-muted">
              シフトはありません
            </div>
          )}
        </section>
      </main>
    </>
  );
}

// ===================================================================
// カレンダーグリッド
// ===================================================================
function CalendarGrid({
  year,
  month,
  shiftsByDate,
  selfUserId,
  selectedDate,
}: {
  year: number;
  month: number;
  shiftsByDate: Map<string, ShiftRow[]>;
  selfUserId: string;
  selectedDate: string;
}) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDate = new Date(year, month, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0=日

  // グリッドのセル(前月の余白 + 当月の日 + 次月の余白)
  const cells: Array<{ date: string; dayNum: number; inMonth: boolean }> = [];

  // 前月余白
  const prevLastDate = new Date(year, month - 1, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevLastDate - i;
    cells.push({
      date: formatDate(new Date(year, month - 2, d)),
      dayNum: d,
      inMonth: false,
    });
  }
  // 当月
  for (let d = 1; d <= lastDate; d++) {
    cells.push({
      date: formatDate(new Date(year, month - 1, d)),
      dayNum: d,
      inMonth: true,
    });
  }
  // 次月余白(7の倍数になるまで)
  while (cells.length % 7 !== 0) {
    const d = cells.length - lastDate - startWeekday + 1;
    cells.push({
      date: formatDate(new Date(year, month, d)),
      dayNum: d,
      inMonth: false,
    });
  }

  return (
    <div
      className="bg-surface border border-border rounded-xl overflow-hidden"
      style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
    >
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-border bg-[#f8fafc] text-[10px] font-bold text-center py-1.5">
        <div className="text-[#dc2626]">日</div>
        <div className="text-[#475569]">月</div>
        <div className="text-[#475569]">火</div>
        <div className="text-[#475569]">水</div>
        <div className="text-[#475569]">木</div>
        <div className="text-[#475569]">金</div>
        <div className="text-primary">土</div>
      </div>
      {/* 日付グリッド */}
      <div className="grid grid-cols-7 text-center text-[11px]">
        {cells.map((cell, i) => {
          const dayShifts = shiftsByDate.get(cell.date) ?? [];
          const hasSelf = dayShifts.some((s) => s.assignedUserId === selfUserId);
          const types = uniqueTypes(dayShifts);
          const dayOfWeek = new Date(cell.date).getDay();
          const isSelected = cell.date === selectedDate && cell.inMonth;

          let textColor = "#0f172a";
          if (!cell.inMonth) textColor = "#cbd5e1";
          else if (dayOfWeek === 0) textColor = "#dc2626";
          else if (dayOfWeek === 6) textColor = "#2563eb";

          return (
            <a
              key={i}
              href={cell.inMonth ? `/calendar?m=${year}-${String(month).padStart(2, "0")}&d=${cell.date}` : undefined}
              className={`aspect-square border-r border-b border-[#f1f5f9] p-1 flex flex-col items-center justify-start ${
                isSelected ? "bg-[#eff6ff] ring-2 ring-primary" : ""
              } ${hasSelf && !isSelected ? "bg-[#eff6ff]" : ""}`}
              style={{ color: textColor }}
            >
              <div className={`font-semibold ${hasSelf ? "text-[#1e40af]" : ""}`}>
                {cell.dayNum}
              </div>
              <div className="flex justify-center gap-px mt-0.5">
                {types.map((t) => (
                  <span
                    key={t}
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: typeColor(t) }}
                  />
                ))}
              </div>
              {hasSelf && (
                <div className="text-[8px] text-[#1e40af] font-bold mt-0.5">
                  自分
                </div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ===================================================================
// シフト詳細行
// ===================================================================
function ShiftDetailRow({
  shift,
  isSelf,
}: {
  shift: ShiftRow;
  isSelf: boolean;
}) {
  const typeInfo = getTypeInfo(shift.type);
  return (
    <div className="p-3 flex items-center gap-2 text-sm">
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded"
        style={{ background: typeInfo.bg, color: typeInfo.color }}
      >
        {typeInfo.label}
      </span>
      <div className="flex-1 min-w-0 truncate">
        <span className={isSelf ? "font-bold" : ""}>
          {shift.userName ?? "未割当"}
          {isSelf && <span className="text-primary text-xs ml-1">(自分)</span>}
        </span>
        {shift.label && (
          <span className="text-muted text-xs ml-2">・{shift.label}</span>
        )}
      </div>
      {shift.startTime && shift.endTime && (
        <span className="text-[10px] text-muted-2 flex-shrink-0">
          {formatTime(shift.startTime)}-{formatTime(shift.endTime)}
        </span>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </div>
  );
}

function NoMembershipState() {
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

// ===================================================================
// ヘルパー
// ===================================================================
function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(t: string): string {
  const [h, m] = t.split(":");
  return `${parseInt(h, 10)}:${m}`;
}

function formatDateLabel(d: string): string {
  const date = new Date(d);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${date.getMonth() + 1}月${date.getDate()}日(${weekday})`;
}

function typeColor(t: string): string {
  switch (t) {
    case "duty":
      return "#1e40af";
    case "oncall":
      return "#d97706";
    case "gaikin":
      return "#059669";
    default:
      return "#94a3b8";
  }
}

function getTypeInfo(t: string): { label: string; color: string; bg: string } {
  switch (t) {
    case "duty":
      return { label: "当直", color: "#1e40af", bg: "#dbeafe" };
    case "oncall":
      return { label: "オンコール", color: "#92400e", bg: "#fef3c7" };
    case "gaikin":
      return { label: "外勤", color: "#166534", bg: "#dcfce7" };
    default:
      return { label: t, color: "#475569", bg: "#f1f5f9" };
  }
}

function uniqueTypes(shifts: ShiftRow[]): string[] {
  return Array.from(new Set(shifts.map((s) => s.type)));
}
