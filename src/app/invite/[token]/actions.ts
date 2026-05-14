"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, sql } from "drizzle-orm";
import {
  db,
  invitations,
  memberships,
} from "@/db";
import { syncCurrentUser } from "@/lib/sync-user";

/**
 * 招待URL を受諾して、医局のメンバーになる。
 * - 招待トークン検証
 * - 既存メンバーシップチェック
 * - membership INSERT
 * - invitations.usedCount を +1
 */
export async function acceptInvitation(formData: FormData): Promise<void> {
  const token = formData.get("token") as string;
  if (!token) throw new Error("トークンが不正です");

  const appUser = await syncCurrentUser();
  if (!appUser) throw new Error("ログインが必要です");

  // 招待を取得
  const [invite] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);

  if (!invite) {
    throw new Error("招待URLが見つかりません");
  }

  // 期限チェック
  if (invite.expiresAt < new Date()) {
    throw new Error("招待URLの期限が切れています");
  }

  // 利用上限チェック
  if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
    throw new Error("招待URLの利用上限に達しています");
  }

  // 既存メンバーシップ(同医局・active)があるかチェック
  const existing = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, appUser.id),
        eq(memberships.departmentId, invite.departmentId),
        eq(memberships.status, "active")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // 既に所属しているので何もしない
    redirect("/?already_member=1");
  }

  // membership 作成
  await db.insert(memberships).values({
    userId: appUser.id,
    departmentId: invite.departmentId,
    role: "member",
    groupId: invite.groupId,
    status: "active",
  });

  // 利用回数をインクリメント
  await db
    .update(invitations)
    .set({
      usedCount: sql`${invitations.usedCount} + 1`,
    })
    .where(eq(invitations.id, invite.id));

  revalidatePath("/");
  redirect("/?joined=1");
}
