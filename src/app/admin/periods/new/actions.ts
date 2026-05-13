"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, shiftPeriods } from "@/db";
import { requireAdmin } from "@/lib/require-admin";

export async function createPeriod(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();

  const year = parseInt(formData.get("year") as string, 10);
  const month = parseInt(formData.get("month") as string, 10);
  const deadlineStr = formData.get("kibouDeadline") as string;
  const kibouDeadline = deadlineStr ? new Date(deadlineStr) : null;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < 2024 ||
    year > 2100 ||
    month < 1 ||
    month > 12
  ) {
    throw new Error("年月の値が不正です");
  }

  let createdId: string;
  try {
    const [period] = await db
      .insert(shiftPeriods)
      .values({
        departmentId: ctx.departmentId,
        year,
        month,
        status: "draft",
        kibouDeadline,
      })
      .returning();
    createdId = period.id;
  } catch (e) {
    // UNIQUE違反 (year, month, department) はリダイレクト先のメッセージで対応
    throw new Error(
      `${year}年${month}月の期間は既に存在します。期間一覧から編集してください。`
    );
  }

  revalidatePath("/admin/periods");
  revalidatePath("/admin");
  redirect(`/admin/periods/${createdId}`);
}
