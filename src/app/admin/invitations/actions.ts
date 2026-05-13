"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db, invitations, groups } from "@/db";
import { requireAdmin } from "@/lib/require-admin";

/**
 * 招待URLを発行
 * - ランダムトークン生成
 * - 有効期限:30日(デフォルト)
 */
export async function createInvitation(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const groupId = (formData.get("groupId") as string) || null;
  const daysStr = (formData.get("days") as string) || "30";
  const days = Math.max(1, Math.min(365, parseInt(daysStr, 10) || 30));

  // グループの所属医局チェック(他医局のIDを指定されたら拒否)
  if (groupId) {
    const [g] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);
    if (!g || g.departmentId !== ctx.departmentId) {
      throw new Error("グループが不正です");
    }
  }

  // URL-safe な16文字トークン
  const token = randomBytes(12).toString("base64url");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  await db.insert(invitations).values({
    departmentId: ctx.departmentId,
    token,
    groupId,
    expiresAt,
    createdByUserId: ctx.user.id,
  });

  revalidatePath("/admin/invitations");
  revalidatePath("/admin");
}

/**
 * 招待URLを失効(削除)
 */
export async function revokeInvitation(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const invitationId = formData.get("invitationId") as string;
  if (!invitationId) throw new Error("ID が不正です");

  await db
    .delete(invitations)
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.departmentId, ctx.departmentId)
      )
    );

  revalidatePath("/admin/invitations");
  revalidatePath("/admin");
}
