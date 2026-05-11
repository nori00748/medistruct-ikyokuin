// 動的アイコン生成(512x512、スプラッシュ画面用)
import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon512() {
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
          fontSize: 360,
          fontWeight: 700,
          fontFamily: "system-ui",
          borderRadius: 96,
        }}
      >
        医
      </div>
    ),
    { ...size }
  );
}
