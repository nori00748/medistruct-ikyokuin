// 動的アイコン生成(192x192)
// Next.js が /icon に配信、PWA manifest から参照される
import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 130,
          fontWeight: 700,
          fontFamily: "system-ui",
          borderRadius: 36,
        }}
      >
        医
      </div>
    ),
    { ...size }
  );
}
