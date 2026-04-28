// テストデータ投入用のサーバーアクション(開発専用)
// /dev/seed ページから呼び出される
"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import {
  db,
  medicalDepartments,
  groups,
  memberships,
  shiftPeriods,
  shifts,
} from "@/db";
import { syncCurrentUser } from "@/lib/sync-user";

const TEST_DEPT_NAME = "テスト医局(循環器内科)";

/**
 * テスト用医局・グループ・所属・シフトを一括作成
 * <form action={createTestData}> で呼ばれる前提の Server Action
 */
export async function createTestData(_formData: FormData): Promise<void> {
  const appUser = await syncCurrentUser();
  if (!appUser) throw new Error("認証されていません");

  // 既に所属がある場合はスキップ(UIでもボタンは無効化される)
  const existing = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, appUser.id),
        eq(memberships.status, "active")
      )
    );
  if (existing.length > 0) {
    throw new Error("既に医局に所属しています");
  }

  // 1. 医局を作成
  const [dept] = await db
    .insert(medicalDepartments)
    .values({
      name: TEST_DEPT_NAME,
      university: "テスト大学",
      plan: "pro",
      ownerUserId: appUser.id,
    })
    .returning();

  // 2. グループ作成
  const [group] = await db
    .insert(groups)
    .values({
      departmentId: dept.id,
      name: "スタッフ",
      color: "#3b82f6",
      displayOrder: 0,
      targetDutyWeekday: 3,
      targetDutyWeekend: 1,
    })
    .returning();

  // 3. 自分を医局長(admin)として登録
  await db.insert(memberships).values({
    userId: appUser.id,
    departmentId: dept.id,
    role: "admin",
    groupId: group.id,
    status: "active",
  });

  // 4. 当月+翌月の period を作成
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  const [currentPeriod] = await db
    .insert(shiftPeriods)
    .values({
      departmentId: dept.id,
      year: currentYear,
      month: currentMonth,
      status: "confirmed",
      confirmedAt: new Date(),
      confirmedByUserId: appUser.id,
    })
    .returning();

  const [nextPeriod] = await db
    .insert(shiftPeriods)
    .values({
      departmentId: dept.id,
      year: nextYear,
      month: nextMonth,
      status: "confirmed",
      confirmedAt: new Date(),
      confirmedByUserId: appUser.id,
    })
    .returning();

  // 5. シフトを作成
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dayOffset = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return d;
  };

  const sampleShifts = [
    {
      periodId: currentPeriod.id,
      date: fmt(now),
      type: "gaikin",
      label: "〇〇病院",
      assignedUserId: appUser.id,
      startTime: "09:00:00",
      endTime: "17:00:00",
    },
    {
      periodId: currentPeriod.id,
      date: fmt(dayOffset(2)),
      type: "duty",
      label: "院内当直",
      assignedUserId: appUser.id,
      startTime: "17:00:00",
      endTime: "09:00:00",
    },
    ...generateShiftAcrossPeriod(
      dayOffset(7),
      "gaikin",
      "△△クリニック",
      appUser.id,
      currentPeriod,
      nextPeriod,
      "09:00:00",
      "17:00:00"
    ),
    ...generateShiftAcrossPeriod(
      dayOffset(14),
      "duty",
      "院内当直",
      appUser.id,
      currentPeriod,
      nextPeriod,
      "17:00:00",
      "09:00:00"
    ),
    ...generateShiftAcrossPeriod(
      dayOffset(21),
      "oncall",
      "第2オンコール",
      appUser.id,
      currentPeriod,
      nextPeriod,
      null,
      null
    ),
    ...generateShiftAcrossPeriod(
      dayOffset(28),
      "gaikin",
      "〇〇病院",
      appUser.id,
      currentPeriod,
      nextPeriod,
      "09:00:00",
      "17:00:00"
    ),
  ];

  await db.insert(shifts).values(sampleShifts);

  revalidatePath("/");
  revalidatePath("/dev/seed");
}

// 日付に応じて適切な period を選択するヘルパー
function generateShiftAcrossPeriod(
  date: Date,
  type: string,
  label: string,
  userId: string,
  currentPeriod: { id: string; year: number; month: number },
  nextPeriod: { id: string; year: number; month: number },
  startTime: string | null,
  endTime: string | null
) {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const periodId =
    date.getFullYear() === currentPeriod.year &&
    date.getMonth() + 1 === currentPeriod.month
      ? currentPeriod.id
      : nextPeriod.id;
  return [
    {
      periodId,
      date: fmt(date),
      type,
      label,
      assignedUserId: userId,
      startTime,
      endTime,
    },
  ];
}

/**
 * テスト用データ削除
 * <form action={deleteTestData}> で呼ばれる
 */
export async function deleteTestData(_formData: FormData): Promise<void> {
  const appUser = await syncCurrentUser();
  if (!appUser) throw new Error("認証されていません");

  await db
    .delete(medicalDepartments)
    .where(
      and(
        eq(medicalDepartments.ownerUserId, appUser.id),
        eq(medicalDepartments.name, TEST_DEPT_NAME)
      )
    );

  revalidatePath("/");
  revalidatePath("/dev/seed");
}
