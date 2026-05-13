// 希望休の提出・更新サーバーアクション
"use server";

import { revalidatePath } from "next/cache";
import { eq, and, inArray } from "drizzle-orm";
import {
  db,
  shiftPeriods,
  memberships,
  kibouRequests,
  kibouDates,
} from "@/db";
import { syncCurrentUser } from "@/lib/sync-user";

/**
 * 希望休を提出 or 更新
 * - period に対する自分の kibou_request を upsert
 * - kibou_dates を全削除→再投入(差分管理が複雑なため一旦全置換)
 */
export async function submitKibou(formData: FormData): Promise<void> {
  const appUser = await syncCurrentUser();
  if (!appUser) throw new Error("認証されていません");

  const periodId = formData.get("periodId") as string;
  const memo = (formData.get("memo") as string) || "";
  // dates は JSON 文字列で渡される: [{date:"2026-06-04",priority:1},...]
  const datesJson = formData.get("dates") as string;
  if (!periodId || !datesJson) {
    throw new Error("不正なリクエストです");
  }

  let dates: Array<{ date: string; priority: number }>;
  try {
    dates = JSON.parse(datesJson);
  } catch {
    throw new Error("dates の形式が不正です");
  }

  // バリデーション
  for (const d of dates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
      throw new Error("日付の形式が不正です");
    }
    if (d.priority !== 1 && d.priority !== 2) {
      throw new Error("優先度が不正です");
    }
  }

  // period 取得 + 自分が同じ医局に所属しているかチェック
  const [period] = await db
    .select()
    .from(shiftPeriods)
    .where(eq(shiftPeriods.id, periodId))
    .limit(1);
  if (!period) throw new Error("期間が見つかりません");

  const myMembership = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, appUser.id),
        eq(memberships.departmentId, period.departmentId),
        eq(memberships.status, "active")
      )
    )
    .limit(1);
  if (myMembership.length === 0) {
    throw new Error("この医局に所属していません");
  }

  // 期間外の日付を弾く
  const periodStart = `${period.year}-${String(period.month).padStart(2, "0")}-01`;
  const lastDay = new Date(period.year, period.month, 0).getDate();
  const periodEnd = `${period.year}-${String(period.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  for (const d of dates) {
    if (d.date < periodStart || d.date > periodEnd) {
      throw new Error("期間外の日付が含まれています");
    }
  }

  // upsert kibou_request
  const [request] = await db
    .insert(kibouRequests)
    .values({
      periodId,
      userId: appUser.id,
      memo,
    })
    .onConflictDoUpdate({
      target: [kibouRequests.periodId, kibouRequests.userId],
      set: {
        memo,
        updatedAt: new Date(),
      },
    })
    .returning();

  // 既存の kibou_dates を全削除して再投入
  await db.delete(kibouDates).where(eq(kibouDates.kibouRequestId, request.id));

  if (dates.length > 0) {
    await db.insert(kibouDates).values(
      dates.map((d) => ({
        kibouRequestId: request.id,
        date: d.date,
        priority: d.priority,
      }))
    );
  }

  revalidatePath("/kibou");
  revalidatePath("/");
}

/**
 * 希望休を全削除(撤回)
 */
export async function withdrawKibou(formData: FormData): Promise<void> {
  const appUser = await syncCurrentUser();
  if (!appUser) throw new Error("認証されていません");

  const periodId = formData.get("periodId") as string;
  if (!periodId) throw new Error("不正なリクエストです");

  await db
    .delete(kibouRequests)
    .where(
      and(
        eq(kibouRequests.periodId, periodId),
        eq(kibouRequests.userId, appUser.id)
      )
    );

  revalidatePath("/kibou");
}
