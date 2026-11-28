import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "#000", borderRadius: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="156" height="156" viewBox="0 0 1248 1248">
        <defs>
          <linearGradient id="blue" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#08b9ed" />
            <stop offset=".48" stopColor="#0787f4" />
            <stop offset="1" stopColor="#073cff" />
          </linearGradient>
        </defs>
        <path fill="url(#blue)" d="M627 297 839 422 839 521 626 397 557 438 759 554 626 659 411 524 411 427Z" />
        <path fill="#fff" d="M431 469 431 437 562 364 562 390Z" />
        <path fill="#fff" d="M371 532 626 696 878 532 878 777 812 829 812 656 626 780 438 656 438 829 371 777Z" />
        <path fill="url(#blue)" d="M471 712 565 768 565 924 471 858Z" />
        <path fill="url(#blue)" d="M779 712 685 768 685 924 779 858Z" />
      </svg>
    </div>,
    { ...size }
  );
}
