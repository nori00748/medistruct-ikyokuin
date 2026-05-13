// 招待URL管理(/admin/invitations)
import { headers } from "next/headers";
import Link from "next/link";
import { eq, desc, asc } from "drizzle-orm";
import { db, invitations, groups, users as usersTable } from "@/db";
import { requireAdmin } from "@/lib/require-admin";
import { createInvitation, revokeInvitation } from "./actions";
import { CopyLinkButton } from "./_components/CopyLinkButton";

export default async function InvitationsPage() {
  const ctx = await requireAdmin();

  // ベースURL(本番URL or リクエストヘッダから)
  const h = await headers();
  const protocol = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "localhost:3000";
  const baseUrl = `${protocol}://${host}`;

  // 招待一覧
  const invites = await db
    .select({
      id: invitations.id,
      token: invitations.token,
      groupName: groups.name,
      groupColor: groups.color,
      expiresAt: invitations.expiresAt,
      maxUses: invitations.maxUses,
      usedCount: invitations.usedCount,
      createdByName: usersTable.displayName,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .leftJoin(groups, eq(invitations.groupId, groups.id))
    .leftJoin(usersTable, eq(invitations.createdByUserId, usersTable.id))
    .where(eq(invitations.departmentId, ctx.departmentId))
    .orderBy(desc(invitations.createdAt));

  // 医局のグループ一覧(招待時に選択用)
  const deptGroups = await db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .where(eq(groups.departmentId, ctx.departmentId))
    .orderBy(asc(groups.displayOrder));

  return (
    <div className="space-y-4">
      {/* パンくず */}
      <div className="text-xs text-muted">
        <Link href="/admin" className="hover:underline">
          管理画面
        </Link>
        <span className="mx-1.5 text-muted-2">›</span>
        <span>招待URL管理</span>
      </div>

      <h1 className="accent text-xl font-bold">医局員の招待</h1>
      <p className="text-sm text-muted">
        招待URLを生成し、医局員に共有してください。リンクからログインすると自動で医局に所属します。
      </p>

      {/* 新規発行フォーム */}
      <section
        className="bg-surface border border-border rounded-xl p-5 max-w-xl"
        style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
      >
        <h2 className="accent text-base font-bold mb-3">新規発行</h2>
        <form action={createInvitation} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-[#475569] block mb-1.5">
              事前にグループを指定(任意)
            </label>
            <select
              name="groupId"
              defaultValue=""
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            >
              <option value="">(医局員側で選択)</option>
              {deptGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-2 mt-1">
              指定すると登録時に自動的にそのグループに所属します
            </p>
          </div>
          <div>
            <label className="text-xs font-bold text-[#475569] block mb-1.5">
              有効期限(日数)
            </label>
            <input
              type="number"
              name="days"
              defaultValue={30}
              min={1}
              max={365}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <button
            type="submit"
            className="bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-md px-4 py-2 w-full sm:w-auto"
            style={{ boxShadow: "0 1px 2px rgba(37,99,235,.2)" }}
          >
            招待URLを発行
          </button>
        </form>
      </section>

      {/* 既存の招待URL一覧 */}
      <section>
        <h2 className="accent text-base font-bold mb-3">
          発行済み招待URL ({invites.length}件)
        </h2>
        {invites.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-6 text-center text-sm text-muted">
            まだ招待URLが発行されていません
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((inv) => {
              const fullUrl = `${baseUrl}/invite/${inv.token}`;
              const isExpired = inv.expiresAt < new Date();
              return (
                <div
                  key={inv.id}
                  className="bg-surface border border-border rounded-xl p-4 space-y-2"
                  style={{ boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      {inv.groupName ? (
                        <span
                          className="px-2 py-0.5 rounded text-white text-[10px] font-semibold"
                          style={{ background: inv.groupColor ?? "#64748b" }}
                        >
                          {inv.groupName}
                        </span>
                      ) : (
                        <span className="text-muted-2">グループ未指定</span>
                      )}
                      {isExpired ? (
                        <span className="text-[10px] bg-[#fee2e2] text-[#991b1b] px-2 py-0.5 rounded-full font-bold">
                          期限切れ
                        </span>
                      ) : (
                        <span className="text-[10px] bg-[#dcfce7] text-[#166534] px-2 py-0.5 rounded-full font-bold">
                          有効
                        </span>
                      )}
                      <span className="text-muted-2 text-[10px]">
                        利用 {inv.usedCount} 回
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyLinkButton url={fullUrl} />
                      <form action={revokeInvitation}>
                        <input
                          type="hidden"
                          name="invitationId"
                          value={inv.id}
                        />
                        <button
                          type="submit"
                          className="text-[11px] text-[#dc2626] hover:bg-[#fef2f2] font-semibold rounded-md px-2 py-1.5"
                        >
                          失効
                        </button>
                      </form>
                    </div>
                  </div>
                  <div className="font-mono text-[11px] text-muted break-all bg-bg rounded px-2 py-1.5">
                    {fullUrl}
                  </div>
                  <div className="text-[10px] text-muted-2">
                    有効期限:{inv.expiresAt.toLocaleDateString("ja-JP")} ・
                    発行:{inv.createdByName ?? "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 補足 */}
      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-4 max-w-xl text-xs text-[#1e3a8a]">
        <strong>💡 招待URLについて</strong>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>このURLを医局員に LINE / メール 等で共有してください</li>
          <li>受信した医局員はリンクをタップしてサインアップすると、自動で医局に所属します</li>
          <li>有効期限内なら何人でも登録可能です</li>
          <li>失効したリンクは即座に無効化されます</li>
        </ul>
      </div>
    </div>
  );
}
