import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeProvider from "./theme-provider";
import PwaRegister from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "SOLE MARKET PH",
  description: "Find shoes and connect directly with sellers across the Philippines.",
  applicationName: "SOLE MARKET PH",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SOLE MARKET PH",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#075CE5"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ThemeProvider><PwaRegister />{children}</ThemeProvider></body></html>;
}
