// アプリ内に埋め込んだサインアップ画面(/sign-up)
// jaJP ローカライゼーションが適用される
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-4 py-8">
      {/* ブランドロゴ */}
      <div className="mb-6 flex flex-col items-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-3"
          style={{
            background: "linear-gradient(135deg,#3b82f6,#1e40af)",
            boxShadow: "0 4px 14px rgba(30,64,175,.18)",
          }}
        >
          医
        </div>
        <h1 className="text-lg font-bold">医局員アプリ</h1>
        <p className="text-xs text-muted">当直表メーカー Pro</p>
      </div>

      <SignUp
        signInUrl="/sign-in"
        forceRedirectUrl="/"
        appearance={{
          elements: {
            rootBox: "w-full max-w-sm",
            card: "shadow-md",
          },
        }}
      />
    </div>
  );
}
