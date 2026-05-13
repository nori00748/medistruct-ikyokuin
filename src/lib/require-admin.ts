// 医局長(role='admin')権限を要求するヘルパー
// 該当しない場合は / にリダイレクト
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db, memberships, medicalDepartments } from "@/db";
import { syncCurrentUser, type AppUser } from "./sync-user";

export type AdminContext = {
  user: AppUser;
  departmentId: string;
  departmentName: string;
  university: string | null;
  plan: string;
};

/**
 * 現在ログイン中のユーザーが医局長(admin)権限を持っているか確認する。
 * 持っていれば admin context を返す。持っていなければホームにリダイレクト。
 */
export async function requireAdmin(): Promise<AdminContext> {
  const user = await syncCurrentUser();
  if (!user) redirect("/");

  const adminMembership = await db
    .select({
      departmentId: medicalDepartments.id,
      departmentName: medicalDepartments.name,
      university: medicalDepartments.university,
      plan: medicalDepartments.plan,
    })
    .from(memberships)
    .innerJoin(
      medicalDepartments,
      eq(memberships.departmentId, medicalDepartments.id)
    )
    .where(
      and(
        eq(memberships.userId, user.id),
        eq(memberships.role, "admin"),
        eq(memberships.status, "active")
      )
    )
    .limit(1);

  if (adminMembership.length === 0) {
    redirect("/");
  }

  return {
    user,
    ...adminMembership[0],
  };
}
