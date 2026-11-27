import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "./theme-provider";

export const metadata: Metadata = {
  title: "SOLE MARKET PH",
  description: "Find shoes and connect directly with sellers across the Philippines."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ThemeProvider>{children}</ThemeProvider></body></html>;
}
