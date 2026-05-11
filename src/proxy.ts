import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 公開ルート(ログイン不要のページ)
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/invite(.*)",
]);

export default clerkMiddleware(
  async (auth, req) => {
    // 公開ルート以外はログイン必須
    if (!isPublicRoute(req)) {
      const { userId } = await auth();
      if (!userId) {
        // 未ログインなら自前の /sign-in に転送(Clerk のホスト型ポータルは使わない)
        const signInUrl = new URL("/sign-in", req.url);
        signInUrl.searchParams.set("redirect_url", req.url);
        return NextResponse.redirect(signInUrl);
      }
    }
  },
  {
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
  }
);

export const config = {
  matcher: [
    // _next/static, _next/image, ファイル拡張子付きURL は除外
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    // API ルートはミドルウェア対象
    "/(api|trpc)(.*)",
  ],
};
