// 招待URL受諾ページ(/invite/[token])
// - ログインなし → サインアップ/ログインに誘導(redirect_url で戻ってくる)
// - ログイン済 → 招待詳細を表示して受諾ボタン
import Link from "next/link";
import { eq } from "drizzle-orm";
import {
  db,
  invitations,
  medicalDepartments,
  memberships,
  groups,
} from "@/db";
import { currentUser } from "@clerk/nextjs/server";
import { syncCurrentUser } from "@/lib/sync-user";
import { acceptInvitation } from "./actions";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // 招待情報を取得(医局名・グループ名も結合)
  const [invite] = await db
    .select({
      id: invitations.id,
      token: invitations.token,
      expiresAt: invitations.expiresAt,
      maxUses: invitations.maxUses,
      usedCount: invitations.usedCount,
      departmentId: medicalDepartments.id,
      departmentName: medicalDepartments.name,
      university: medicalDepartments.university,
      groupName: groups.name,
      groupColor: groups.color,
    })
    .from(invitations)
    .innerJoin(
      medicalDepartments,
      eq(invitations.departmentId, medicalDepartments.id)
    )
    .leftJoin(groups, eq(invitations.groupId, groups.id))
    .where(eq(invitations.token, token))
    .limit(1);

  // 招待が存在しない
  if (!invite) return <InvalidState reason="not_found" />;

  // 期限切れ
  if (invite.expiresAt < new Date()) {
    return <InvalidState reason="expired" />;
  }

  // 利用上限到達
  if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
    return <InvalidState reason="max_uses" />;
  }

  // ログイン状態確認
  const clerkUser = await currentUser();
  if (!clerkUser) {
    // 未ログイン:サインアップ/ログインに誘導
    return <UnauthenticatedState invite={invite} token={token} />;
  }

  // DBユーザー同期
  const appUser = await syncCurrentUser();
  if (!appUser) return <InvalidState reason="not_found" />;

  // 既に同医局のメンバーかチェック
  const existingMembership = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, appUser.id))
    .limit(50);

  const alreadyInThisDept = existingMembership.some(
    (m) => m.departmentId === invite.departmentId && m.status === "active"
  );

  if (alreadyInThisDept) {
    return <AlreadyMemberState invite={invite} />;
  }

  // 受諾画面
  return (
    <ConfirmJoinState
      invite={invite}
      token={token}
      userEmail={appUser.email}
      userName={appUser.displayName}
    />
  );
}

// ===================================================================
// 共通レイアウト
// ===================================================================
function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* ブランドヘッダー */}
      <header className="bg-surface border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-2.5">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{
              background: "linear-gradient(135deg,#3b82f6,#1e40af)",
              boxShadow: "0 2px 6px rgba(30,64,175,.25)",
            }}
          >
            医
          </span>
          <span className="font-bold text-sm">医局員アプリ</span>
        </div>
      </header>
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

// ===================================================================
// 未ログイン状態
// ===================================================================
function UnauthenticatedState({
  invite,
  token,
}: {
  invite: {
    departmentName: string;
    university: string | null;
    groupName: string | null;
    groupColor: string | null;
    expiresAt: Date;
  };
  token: string;
}) {
  const redirectUrl = encodeURIComponent(`/invite/${token}`);
  return (
    <PageFrame>
      <DeptInfoCard invite={invite} />

      <section className="mt-5 bg-surface border border-border rounded-xl p-5 space-y-3">
        <div className="text-center">
          <p className="text-sm font-bold mb-1">医局に参加するには</p>
          <p className="text-xs text-muted">
            アカウント登録 または ログインしてください
          </p>
        </div>
        <div className="space-y-2 pt-2">
          <Link
            href={`/sign-up?redirect_url=${redirectUrl}`}
            className="block bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg text-sm text-center"
            style={{ boxShadow: "0 1px 2px rgba(37,99,235,.2)" }}
          >
            新規アカウント登録
          </Link>
          <Link
            href={`/sign-in?redirect_url=${redirectUrl}`}
            className="block bg-surface border border-border text-text hover:bg-bg font-semibold py-3 rounded-lg text-sm text-center"
          >
            既存アカウントでログイン
          </Link>
        </div>
      </section>

      <div className="mt-5 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-4 text-xs text-[#1e3a8a]">
        <strong>📨 招待URL について</strong>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>登録後、自動的にこの医局のメンバーに追加されます</li>
          <li>引き継ぎを想定する場合は、医局共有のメールアドレス推奨</li>
        </ul>
      </div>
    </PageFrame>
  );
}

// ===================================================================
// ログイン済み・受諾画面
// ===================================================================
function ConfirmJoinState({
  invite,
  token,
  userEmail,
  userName,
}: {
  invite: {
    departmentName: string;
    university: string | null;
    groupName: string | null;
    groupColor: string | null;
    expiresAt: Date;
  };
  token: string;
  userEmail: string;
  userName: string | null;
}) {
  return (
    <PageFrame>
      <DeptInfoCard invite={invite} />

      <section className="mt-5 bg-surface border border-border rounded-xl p-5">
        <h2 className="accent text-sm font-bold mb-3">参加するアカウント</h2>
        <div className="bg-bg rounded-lg p-3 mb-4 text-sm">
          <div className="font-semibold">{userName ?? "未設定"}</div>
          <div className="text-xs text-muted">{userEmail}</div>
        </div>

        <form action={acceptInvitation}>
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg text-sm"
            style={{ boxShadow: "0 1px 2px rgba(37,99,235,.2)" }}
          >
            この医局に参加する
          </button>
        </form>

        <p className="text-[10px] text-muted-2 mt-3 text-center">
          別のアカウントで参加する場合は、一度ログアウトしてください
        </p>
      </section>
    </PageFrame>
  );
}

// ===================================================================
// 既に所属している
// ===================================================================
function AlreadyMemberState({
  invite,
}: {
  invite: { departmentName: string };
}) {
  return (
    <PageFrame>
      <section className="bg-surface border border-border rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">✓</div>
        <h2 className="text-base font-bold mb-2">既に所属しています</h2>
        <p className="text-sm text-muted mb-5">
          あなたは既に <strong>{invite.departmentName}</strong> のメンバーです。
        </p>
        <Link
          href="/"
          className="inline-block bg-primary hover:bg-primary-hover text-white font-bold py-3 px-6 rounded-lg text-sm"
          style={{ boxShadow: "0 1px 2px rgba(37,99,235,.2)" }}
        >
          ホームへ
        </Link>
      </section>
    </PageFrame>
  );
}

// ===================================================================
// 無効な招待
// ===================================================================
function InvalidState({
  reason,
}: {
  reason: "not_found" | "expired" | "max_uses";
}) {
  const messages = {
    not_found: {
      title: "招待URLが見つかりません",
      detail: "URL が正しいかご確認ください。リンクが失効している可能性もあります。",
    },
    expired: {
      title: "招待URLの期限が切れています",
      detail: "医局長に新しい招待URLの発行を依頼してください。",
    },
    max_uses: {
      title: "招待URLの利用上限に達しています",
      detail: "医局長に新しい招待URLの発行を依頼してください。",
    },
  } as const;

  const msg = messages[reason];

  return (
    <PageFrame>
      <section className="bg-surface border border-border rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <h2 className="text-base font-bold mb-2">{msg.title}</h2>
        <p className="text-sm text-muted mb-5">{msg.detail}</p>
        <Link
          href="/"
          className="inline-block bg-surface border border-border text-text hover:bg-bg font-semibold py-2.5 px-5 rounded-lg text-sm"
        >
          ホームへ
        </Link>
      </section>
    </PageFrame>
  );
}

// ===================================================================
// 医局情報カード
// ===================================================================
function DeptInfoCard({
  invite,
}: {
  invite: {
    departmentName: string;
    university: string | null;
    groupName: string | null;
    groupColor: string | null;
    expiresAt: Date;
  };
}) {
  return (
    <section
      className="bg-surface border border-border rounded-xl p-5"
      style={{ boxShadow: "0 4px 14px rgba(15,23,42,.06)" }}
    >
      <div className="text-xs text-muted font-semibold mb-2">招待されました</div>
      <h1 className="text-xl font-bold mb-1">{invite.departmentName}</h1>
      {invite.university && (
        <div className="text-sm text-muted mb-3">{invite.university}</div>
      )}

      {invite.groupName && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs">
          <span className="text-muted">参加グループ</span>
          <span
            className="px-2 py-0.5 rounded text-white text-[10px] font-semibold"
            style={{ background: invite.groupColor ?? "#64748b" }}
          >
            {invite.groupName}
          </span>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border text-[11px] text-muted-2">
        招待有効期限:{invite.expiresAt.toLocaleDateString("ja-JP")}
      </div>
    </section>
  );
}
