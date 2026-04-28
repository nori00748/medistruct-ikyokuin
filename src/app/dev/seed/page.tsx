// テストデータ管理ページ(/dev/seed)
// ボタンクリックでテスト医局・シフトを作成・削除
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import {
  db,
  medicalDepartments,
  memberships,
  shifts as shiftsTable,
} from "@/db";
import { syncCurrentUser } from "@/lib/sync-user";
import { createTestData, deleteTestData } from "./actions";

export default async function SeedPage() {
  const appUser = await syncCurrentUser();
  if (!appUser) return null;

  // 現在の自分の所属状況をカウント
  const myMemberships = await db
    .select({
      deptId: medicalDepartments.id,
      deptName: medicalDepartments.name,
      role: memberships.role,
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

  // シフト数(自分に割り当てられたもの)
  const myShifts = await db
    .select()
    .from(shiftsTable)
    .where(eq(shiftsTable.assignedUserId, appUser.id));

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-6 flex items-center gap-2">
          <Link href="/" className="text-primary text-sm hover:underline">
            ← ホームに戻る
          </Link>
        </div>

        <h1 className="accent text-2xl font-bold mb-2">
          テストデータ管理
        </h1>
        <p className="text-sm text-muted mb-6">
          開発用ページ。テスト医局・シフトを作成して、ホーム画面の動作を確認できます。
        </p>

        {/* 現在の状態 */}
        <section className="bg-surface border border-border rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="accent text-base font-bold mb-3">現在の状態</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">ログイン中ユーザー</dt>
              <dd className="font-mono text-xs">{appUser.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">所属医局数</dt>
              <dd className="font-bold">{myMemberships.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">割当シフト数</dt>
              <dd className="font-bold">{myShifts.length}</dd>
            </div>
          </dl>

          {myMemberships.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-xs text-muted mb-1">所属医局</div>
              <ul className="space-y-1">
                {myMemberships.map((m) => (
                  <li key={m.deptId} className="text-sm flex justify-between">
                    <span>{m.deptName}</span>
                    <span className="text-xs bg-[#dbeafe] text-[#1e40af] px-2 py-0.5 rounded">
                      {m.role}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* 操作ボタン */}
        <section className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="accent text-base font-bold mb-1">操作</h2>

          <form action={createTestData}>
            <button
              type="submit"
              disabled={myMemberships.length > 0}
              className="w-full bg-primary hover:bg-primary-hover disabled:bg-muted-2 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg text-sm"
            >
              テスト医局+シフト6件を作成
            </button>
            {myMemberships.length > 0 && (
              <p className="text-[11px] text-muted-2 mt-1.5 text-center">
                既に医局に所属しています。先に削除してください。
              </p>
            )}
          </form>

          <form action={deleteTestData}>
            <button
              type="submit"
              disabled={myMemberships.length === 0}
              className="w-full bg-surface border border-danger text-danger hover:bg-[#fef2f2] disabled:border-border disabled:text-muted-2 disabled:cursor-not-allowed font-bold py-3 rounded-lg text-sm"
            >
              テスト医局を削除(関連データもすべて削除)
            </button>
          </form>
        </section>

        {/* 注意書き */}
        <section className="mt-6 bg-[#fef3c7] border border-[#f59e0b] rounded-xl p-4 text-xs text-[#78350f]">
          <strong>⚠ 開発用ページです</strong>
          <p className="mt-1">
            このページは開発・動作確認のために用意したものです。
            本番リリース時には削除またはアクセス制限を入れる必要があります。
          </p>
        </section>
      </div>
    </div>
  );
}
