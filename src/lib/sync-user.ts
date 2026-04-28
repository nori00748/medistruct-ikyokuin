// Clerk のユーザー情報を DB の ikyokuin_users テーブルに同期する
// 初回ログイン時に自動的に呼ばれ、ユーザー情報が DB に作られる
import { currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/db";

export type AppUser = {
  id: string;          // DB側のユーザーID(UUID)
  clerkUserId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * 現在ログイン中の Clerk ユーザーを DB に同期し、DB側のユーザー情報を返す。
 * INSERT ... ON CONFLICT DO UPDATE でアトミックに動作するため
 * 並列リクエストでも安全。
 */
export async function syncCurrentUser(): Promise<AppUser | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    null;
  const avatarUrl = clerkUser.imageUrl || null;

  // Upsert(衝突時は更新)でアトミックに同期
  const [user] = await db
    .insert(users)
    .values({
      clerkUserId: clerkUser.id,
      email,
      displayName,
      avatarUrl,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        email,
        displayName,
        avatarUrl,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    id: user.id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}
