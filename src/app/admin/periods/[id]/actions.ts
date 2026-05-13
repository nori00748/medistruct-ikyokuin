"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db, shiftPeriods } from "@/db";
import { requireAdmin } from "@/lib/require-admin";

export async function updatePeriod(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const periodId = formData.get("periodId") as string;
  const deadlineStr = formData.get("kibouDeadline") as string;
  const status = formData.get("status") as string;

  if (!periodId) throw new Error("期間IDが不正です");
  if (status !== "draft" && status !== "confirmed") {
    throw new Error("ステータスが不正です");
  }

  await db
    .update(shiftPeriods)
    .set({
      kibouDeadline: deadlineStr ? new Date(deadlineStr) : null,
      status,
      ...(status === "confirmed"
        ? {
            confirmedAt: new Date(),
            confirmedByUserId: ctx.user.id,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(shiftPeriods.id, periodId),
        eq(shiftPeriods.departmentId, ctx.departmentId)
      )
    );

  revalidatePath(`/admin/periods/${periodId}`);
  revalidatePath("/admin/periods");
  revalidatePath("/admin");
}

export async function deletePeriod(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const periodId = formData.get("periodId") as string;
  if (!periodId) throw new Error("期間IDが不正です");

  await db
    .delete(shiftPeriods)
    .where(
      and(
        eq(shiftPeriods.id, periodId),
        eq(shiftPeriods.departmentId, ctx.departmentId)
      )
    );

  revalidatePath("/admin/periods");
  revalidatePath("/admin");
  redirect("/admin/periods");
}
