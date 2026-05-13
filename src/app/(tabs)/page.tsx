// ホーム画面(/)
// - Clerk のユーザーを DB に同期
// - 所属医局があるかチェック
// - 所属あり:今日のシフトと今後の予定を実データから表示
// - 所属なし:「招待URLから登録してください」のウェルカム表示
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { eq, and, gte, asc } from "drizzle-orm";
import {
  db,
  memberships,
  medicalDepartments,
  shifts as shiftsTable,
} from "@/db";
import { syncCurrentUser } from "@/lib/sync-user";

export default async function Home() {
  // Clerkユーザーを DBに同期
  const appUser = await syncCurrentUser();
  if (!appUser) return null;

  // 所属している医局を取得
  const myMemberships = await db
    .select({
      membershipId: memberships.id,
      role: memberships.role,
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

  const hasMembership = myMemberships.length > 0;

  // 自分のシフト取得(今日以降、最大10件)
  const today = new Date();
  const todayStr = formatDate(today);
  let myShifts: Array<typeof shiftsTable.$inferSelect> = [];
  if (hasMembership) {
    myShifts = await db
      .select()
      .from(shiftsTable)
      .where(
        and(
          eq(shiftsTable.assignedUserId, appUser.id),
          gte(shiftsTable.date, todayStr)
        )
      )
      .orderBy(asc(shiftsTable.date))
      .limit(10);
  }

  return (
    <>
      {/* ヘッダー */}
      <header className="bg-surface border-b border-border sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
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
                {hasMembership ? "所属医局" : "医局員アプリ"}
              </div>
              <div className="text-sm font-bold leading-tight">
                {hasMembership ? myMemberships[0].departmentName : "未登録"}
              </div>
            </div>
          </div>
          <UserButton />
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 py-4 space-y-5">
        {/* 医局長バナー(admin のみ表示) */}
        {hasMembership && myMemberships[0].role === "admin" && (
          <AdminBanner departmentName={myMemberships[0].departmentName} />
        )}

        {hasMembership ? (
          <MembershipHome
            userName={appUser.displayName ?? "あなた"}
            departmentName={myMemberships[0].departmentName}
            myShifts={myShifts}
            today={today}
          />
        ) : (
          <NoMembershipHome
            userName={appUser.displayName ?? "ユーザー"}
            email={appUser.email}
          />
        )}
      </main>
    </>
  );
}

// ===================================================================
// ホーム:医局所属あり
// ===================================================================
function MembershipHome({
  userName,
  departmentName,
  myShifts,
  today,
}: {
  userName: string;
  departmentName: string;
  myShifts: Array<typeof shiftsTable.$inferSelect>;
  today: Date;
}) {
  const todayStr = formatDate(today);
  const todayShift = myShifts.find((s) => s.date === todayStr);
  const upcomingShifts = myShifts.filter((s) => s.date !== todayStr).slice(0, 5);

  // 今月の集計
  const thisMonthShifts = myShifts.filter((s) => {
    const d = new Date(s.date);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth()
    );
  });
  const dutyCount = thisMonthShifts.filter((s) => s.type === "duty").length;
  const oncallCount = thisMonthShifts.filter((s) => s.type === "oncall").length;
  const gaikinCount = thisMonthShifts.filter((s) => s.type === "gaikin").length;

  return (
    <>
      {/* 今日のシフト */}
      <section>
        <div className="text-xs text-muted font-semibold mb-2 flex items-center justify-between">
          <span>今日のシフト</span>
          <span className="text-muted-2 font-medium">
            {today.toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "short",
            })}
          </span>
        </div>
        {todayShift ? <TodayShiftCard shift={todayShift} /> : <NoShiftToday />}
      </section>

      {/* 今後の予定 */}
      <section>
        <h2 className="accent text-base font-bold mb-3">今後の予定</h2>
        {upcomingShifts.length > 0 ? (
          <div className="bg-surface border border-border rounded-xl divide-y divide-border shadow-sm">
            {upcomingShifts.map((shift) => (
              <ShiftListItem key={shift.id} shift={shift} />
            ))}
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl p-5 text-center text-sm text-muted">
            今後の予定はありません
          </div>
        )}
      </section>

      {/* 今月の集計 */}
      <section>
        <h2 className="accent text-base font-bold mb-3">
          今月の集計({today.getFullYear()}年{today.getMonth() + 1}月)
        </h2>
        <div className="bg-surface border border-border rounded-xl p-4 grid grid-cols-3 gap-3 shadow-sm">
          <Stat label="当直" value={dutyCount} color="#1e40af" />
          <Stat label="オンコール" value={oncallCount} color="#92400e" border />
          <Stat label="外勤" value={gaikinCount} color="#166534" />
        </div>
      </section>

      <section className="text-[11px] text-muted-2 text-center pt-2">
        ログイン中:{userName} / 所属:{departmentName}
      </section>
    </>
  );
}

// ===================================================================
// 今日のシフトカード
// ===================================================================
function TodayShiftCard({
  shift,
}: {
  shift: typeof shiftsTable.$inferSelect;
}) {
  const typeInfo = getShiftTypeInfo(shift.type);
  return (
    <div
      className="bg-surface border-2 border-primary rounded-xl p-5"
      style={{ boxShadow: "0 4px 14px rgba(37,99,235,.08)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`duty-badge duty-badge-${typeInfo.key}`}>
          {typeInfo.label}
        </span>
        {shift.startTime && shift.endTime && (
          <span className="text-xs text-muted">
            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
          </span>
        )}
      </div>
      <div className="text-xl font-bold mb-1">
        {shift.label || typeInfo.label}
      </div>
      {shift.notes && (
        <div className="text-sm text-[#475569]">{shift.notes}</div>
      )}
    </div>
  );
}

function NoShiftToday() {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 text-center text-sm text-muted shadow-sm">
      今日のシフトはありません
    </div>
  );
}

// ===================================================================
// シフト一覧の1行
// ===================================================================
function ShiftListItem({
  shift,
}: {
  shift: typeof shiftsTable.$inferSelect;
}) {
  const typeInfo = getShiftTypeInfo(shift.type);
  const date = new Date(shift.date);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  const weekdayColor =
    date.getDay() === 0 ? "#dc2626" : date.getDay() === 6 ? "#2563eb" : "#475569";

  return (
    <div className="p-4 flex items-center gap-3">
      <div className="text-center w-12 flex-shrink-0">
        <div className="text-[10px] text-muted-2">{month}月</div>
        <div className="text-lg font-bold leading-none">{day}</div>
        <div
          className="text-[10px] font-semibold"
          style={{ color: weekdayColor }}
        >
          {weekday}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`duty-badge duty-badge-${typeInfo.key}`}>
            {typeInfo.label}
          </span>
        </div>
        <div className="text-sm font-semibold truncate">
          {shift.label || typeInfo.label}
        </div>
        {shift.startTime && shift.endTime && (
          <div className="text-xs text-muted">
            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
          </div>
        )}
      </div>
      <span className="text-[#cbd5e1]">›</span>
    </div>
  );
}

// ===================================================================
// 集計の数字
// ===================================================================
function Stat({
  label,
  value,
  color,
  border,
}: {
  label: string;
  value: number;
  color: string;
  border?: boolean;
}) {
  return (
    <div className={`text-center ${border ? "border-x border-border" : ""}`}>
      <div className="text-[10px] text-muted font-semibold mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
        <span className="text-xs text-muted-2 font-normal">回</span>
      </div>
    </div>
  );
}

// ===================================================================
// 医局未所属:ウェルカム画面
// ===================================================================
function NoMembershipHome({
  userName,
  email,
}: {
  userName: string;
  email: string;
}) {
  return (
    <>
      <section className="bg-surface border border-border rounded-xl p-6 text-center shadow-sm">
        <div
          className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-4"
          style={{
            background: "linear-gradient(135deg,#3b82f6,#1e40af)",
            boxShadow: "0 4px 14px rgba(30,64,175,.18)",
          }}
        >
          医
        </div>
        <h1 className="text-lg font-bold mb-1">ようこそ、{userName}さん</h1>
        <p className="text-xs text-muted mb-1">{email}</p>
        <p className="text-sm text-text mt-4 mb-2">
          医局員アプリへの登録は完了しました。
        </p>
        <p className="text-xs text-muted">
          まだどの医局にも所属していません。
        </p>
      </section>

      <section className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-4">
        <h2 className="accent text-sm font-bold mb-2 text-[#1e40af]">次の手順</h2>
        <ol className="space-y-2 text-sm text-[#1e3a8a] ml-5 list-decimal">
          <li>医局長から共有された<strong>招待URL</strong>を受け取る</li>
          <li>招待URLをタップしてアクセス</li>
          <li>所属グループを選択して登録完了</li>
        </ol>
        <p className="text-[11px] text-[#3730a3] mt-3">
          招待URLが届いていない場合は、医局長へお問い合わせください。
        </p>
      </section>
    </>
  );
}

// ===================================================================
// ヘルパー関数
// ===================================================================
function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(t: string): string {
  // "09:00:00" → "9:00", "17:00:00" → "17:00"
  const [h, m] = t.split(":");
  return `${parseInt(h, 10)}:${m}`;
}

function getShiftTypeInfo(type: string): { key: string; label: string } {
  switch (type) {
    case "duty":
      return { key: "toutyoku", label: "当直" };
    case "oncall":
      return { key: "oncall", label: "オンコール" };
    case "gaikin":
      return { key: "gaikin", label: "外勤" };
    default:
      return { key: "toutyoku", label: type };
  }
}

// ===================================================================
// 医局長バナー(admin のみホームに表示)
// ===================================================================
function AdminBanner({ departmentName }: { departmentName: string }) {
  return (
    <Link
      href="/admin"
      className="block rounded-xl p-4 text-white flex items-center gap-3"
      style={{
        background: "linear-gradient(135deg,#3b82f6,#1e40af)",
        boxShadow: "0 4px 14px rgba(30,64,175,.25)",
      }}
    >
      <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center text-lg flex-shrink-0">
        ⚙
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] opacity-90 font-semibold">
          医局長メニュー
        </div>
        <div className="font-bold text-sm truncate">
          {departmentName}の管理画面へ
        </div>
        <div className="text-[11px] opacity-80 mt-0.5">
          期間作成・希望休確認・医局員招待
        </div>
      </div>
      <span className="text-white/80">›</span>
    </Link>
  );
}
