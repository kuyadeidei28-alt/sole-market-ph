import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 192, height: 192 };

export async function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#05070b", borderRadius: 34 }}>
      <div style={{ width: 144, height: 144, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 30, background: "#075CE5", color: "white", fontSize: 104, fontWeight: 900, fontFamily: "Arial" }}>S</div>
    </div>,
    { ...size }
  );
}
