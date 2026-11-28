import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 512, height: 512 };

export async function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#05070b", borderRadius: 92 }}>
      <div style={{ width: 384, height: 384, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 80, background: "#075CE5", color: "white", fontSize: 280, fontWeight: 900, fontFamily: "Arial" }}>S</div>
    </div>,
    { ...size }
  );
}
