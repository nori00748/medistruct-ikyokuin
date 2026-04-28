import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 公開ルート(ログイン不要のページ)
// 招待URL・ログイン画面・サインアップ画面は誰でもアクセス可能
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/invite(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // 公開ルート以外はログイン必須
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // _next/static, _next/image, ファイル拡張子付きURL は除外
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    // API ルートはミドルウェア対象
    "/(api|trpc)(.*)",
  ],
};
