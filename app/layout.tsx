import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "./theme-provider";
import IOSInstallPrompt from "./ios-install-prompt";
import PushNotifications from "./push-notifications";
import SiteFooter from "./site-footer";

export const metadata: Metadata = {
  title: "SOLE MARKET PH",
  description: "Find shoes and connect directly with sellers across the Philippines.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/sole-market-app-icon-v2.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    title: "SOLE MARKET",
    statusBarStyle: "black-translucent"
  },
  themeColor: "#000000"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ThemeProvider>{children}<SiteFooter /></ThemeProvider><IOSInstallPrompt /><PushNotifications /></body></html>;
}
