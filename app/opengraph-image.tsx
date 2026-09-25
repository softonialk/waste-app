import { ImageResponse } from "next/og";

export const alt = "EcoLoop — Smart Waste Management for Sri Lanka";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #103d32 0%, #185546 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px", fontSize: 44, fontWeight: 700 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              background: "#c9f25b",
              color: "#103d32",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              fontWeight: 800,
            }}
          >
            E
          </div>
          EcoLoop
        </div>
        <div style={{ marginTop: 48, fontSize: 72, fontWeight: 800, lineHeight: 1.1, maxWidth: 950 }}>Turn your waste into a better tomorrow.</div>
        <div style={{ marginTop: 28, fontSize: 32, color: "#c9f25b" }}>Free recyclable waste pickups across Sri Lanka</div>
      </div>
    ),
    size,
  );
}
