import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #294b45 0%, #3f6d62 60%, #8ec96e 100%)",
          color: "#f5d75d",
          fontFamily: "Arial, sans-serif",
          fontSize: 64,
          fontWeight: 900,
          letterSpacing: -4,
        }}
      >
        TN23
      </div>
    ),
    { ...size },
  );
}
