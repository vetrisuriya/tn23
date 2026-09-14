import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #294b45 0%, #3f6d62 55%, #8ec96e 100%)",
          color: "#fff8dd",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 8, opacity: 0.9 }}>VELLORE · TAMIL NADU</div>
        <div style={{ fontSize: 190, fontWeight: 900, letterSpacing: -8, lineHeight: 1 }}>TN23</div>
        <div style={{ fontSize: 44, fontWeight: 700, marginTop: 8 }}>Kosapet Cycle Stories</div>
        <div style={{ fontSize: 34, marginTop: 6, opacity: 0.95 }}>கோசப்பேட்டை சைக்கிள் கதைகள்</div>
        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            fontWeight: 700,
            background: "#f5d75d",
            color: "#29453f",
            padding: "12px 36px",
            borderRadius: 18,
          }}
        >
          Repair · Ride · Deliver — Free browser game
        </div>
      </div>
    ),
    { ...size },
  );
}
