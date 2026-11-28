"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function IOSInstallPrompt() {
  const [platform, setPlatform] = useState<"ios" | "native" | null>(null);
  const [open, setOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isAppleMobile = /iPhone|iPad|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isInstalled = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isInstalled) return;

    if (isAppleMobile) setPlatform("ios");

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
      setPlatform("native");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => {
      setPlatform(null);
      setInstallEvent(null);
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("SOLE MARKET service worker registration failed:", error);
      });
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setPlatform(null);
    setInstallEvent(null);
  };

  if (!platform) return null;

  return (
    <>
      <div style={{ position: "fixed", zIndex: 90, left: 12, right: 12, bottom: "calc(12px + env(safe-area-inset-bottom))", maxWidth: 520, margin: "0 auto", padding: "12px 14px", borderRadius: 16, background: "#101827", color: "#fff", border: "1px solid rgba(255,255,255,.16)", boxShadow: "0 10px 35px rgba(0,0,0,.3)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, overflow: "hidden", flexShrink: 0, background: "#000" }}>
          <img src="/sole-market-app-icon-v2.svg" alt="SOLE MARKET PH" width="42" height="42" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Install SOLE MARKET PH</div>
          <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 2 }}>
            {platform === "ios" ? "Add it to your iPhone Home Screen" : "Install the app on this device"}
          </div>
        </div>
        <button onClick={() => platform === "ios" ? setOpen(true) : void install()} style={{ border: 0, borderRadius: 10, background: "#087cf0", color: "white", padding: "9px 12px", fontWeight: 700, fontSize: 13 }}>Install</button>
        <button aria-label="Dismiss install prompt" onClick={() => setPlatform(null)} style={{ border: 0, background: "transparent", color: "#cbd5e1", fontSize: 20, padding: "2px 4px" }}>×</button>
      </div>
      {open && platform === "ios" && (
        <div role="dialog" aria-modal="true" aria-label="Install SOLE MARKET PH" style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.68)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14 }}>
          <div style={{ width: "100%", maxWidth: 520, borderRadius: 20, background: "#fff", color: "#111827", padding: 22, paddingBottom: "calc(22px + env(safe-area-inset-bottom))", boxShadow: "0 12px 40px rgba(0,0,0,.35)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Add to your iPhone</div>
              <button onClick={() => setOpen(false)} aria-label="Close" style={{ border: 0, background: "#eef2f7", borderRadius: 20, width: 32, height: 32, fontSize: 20 }}>×</button>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: "#475569" }}>Apple requires one quick step from you. SOLE MARKET PH cannot install automatically.</p>
            <ol style={{ paddingLeft: 22, margin: "14px 0", fontSize: 14, lineHeight: 1.8 }}>
              <li>Tap the <b>Share</b> button in Safari (the square with an up arrow).</li>
              <li>Scroll down and choose <b>Add to Home Screen</b>.</li>
              <li>Tap <b>Add</b> at the top right.</li>
            </ol>
            <div style={{ borderRadius: 12, background: "#eff6ff", padding: 12, fontSize: 13, color: "#1e40af" }}>Tip: Open this website in Safari for the best installation experience.</div>
            <button onClick={() => setOpen(false)} style={{ width: "100%", marginTop: 16, border: 0, borderRadius: 12, background: "#087cf0", color: "white", padding: 13, fontWeight: 700 }}>Got it</button>
          </div>
        </div>
      )}
    </>
  );
}
