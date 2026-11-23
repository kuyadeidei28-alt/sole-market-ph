import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOLE MARKET PH",
  description: "Find shoes and connect directly with sellers across the Philippines."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
