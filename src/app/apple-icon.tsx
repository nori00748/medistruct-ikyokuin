// iOS Safari 用 apple-touch-icon (180x180)
// 「ホーム画面に追加」した時のアイコン
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #3b82f6, #1e40af)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 120,
          fontWeight: 700,
          fontFamily: "system-ui",
        }}
      >
        医
      </div>
    ),
    { ...size }
  );
}
