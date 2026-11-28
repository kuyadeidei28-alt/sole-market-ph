"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
function decodeKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export default function PushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    setSupported(true);
    setPermission(Notification.permission);
    let alive = true;
    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      if (alive) setSubscribed(Boolean(subscription));
    }).catch((error) => console.error("Push setup failed:", error));
    return () => { alive = false; };
  }, []);

  async function enable() {
    if (!VAPID_PUBLIC_KEY) { setMessage("Push notifications are being configured. Please try again later."); return; }
    if (!supabase) { setMessage("Please refresh the website and try again."); return; }
    setBusy(true); setMessage("");
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setMessage("Notifications were not enabled. You can allow them in your browser settings.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(VAPID_PUBLIC_KEY),
      });
      const json = subscription.toJSON();
      const p256dh = json.keys?.p256dh, auth = json.keys?.auth;
      if (!json.endpoint || !p256dh || !auth) throw new Error("This device did not return a valid push subscription.");
      const { error } = await supabase.rpc("register_push_subscription", {
        p_endpoint: json.endpoint, p_p256dh: p256dh, p_auth: auth,
        p_user_agent: navigator.userAgent.slice(0, 500),
      });
      if (error) throw error;
      setSubscribed(true);
      setMessage("This device is subscribed to SOLE MARKET PH announcements.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to enable notifications.");
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        if (supabase) await supabase.rpc("unregister_push_subscription", { p_endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Notifications are turned off on this device.");
    } catch {
      setMessage("Unable to turn off notifications. Please use your browser settings.");
    } finally { setBusy(false); }
  }

  if (!supported || dismissed) return null;
  const panel: React.CSSProperties = {
    position:"fixed", zIndex:80, left:14, bottom:"calc(88px + env(safe-area-inset-bottom))",
    width:"min(410px, calc(100vw - 86px))", display:"flex", alignItems:"center", gap:10,
    padding:"11px 12px", border:"1px solid #dbe4f0", borderRadius:14,
    background:"#fff", color:"#111827", boxShadow:"0 8px 28px rgba(15,23,42,.16)"
  };
  const action: React.CSSProperties = {
    border:0, borderRadius:9, background:"#075ce5", color:"#fff",
    padding:"8px 10px", fontSize:11, fontWeight:900, whiteSpace:"nowrap"
  };
  return (
    <aside aria-label="SOLE MARKET PH notifications" style={panel}>
      <div style={{minWidth:0,flex:1,display:"flex",flexDirection:"column",gap:3}}>
        <strong style={{fontSize:12,fontWeight:900}}>🔔 SOLE MARKET PH Updates</strong>
        <span style={{color:"#64748b",fontSize:10,lineHeight:1.35}}>
          {subscribed ? "This device is subscribed to announcements." : "Get important announcements on this device."}
        </span>
        {message && <small role="status" style={{color:"#475569",fontSize:10,lineHeight:1.35}}>{message}</small>}
        <Link href="/announcements" style={{color:"#075ce5",fontSize:10,fontWeight:800}}>View announcements</Link>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
        {subscribed
          ? <button type="button" disabled={busy} style={action} onClick={disable}>{busy ? "Wait…" : "Turn off"}</button>
          : <button type="button" disabled={busy || permission==="denied"} style={{...action,opacity: (busy || permission === "denied") ? 0.55 : 1}} onClick={enable}>
              {busy ? "Wait…" : permission==="denied" ? "Blocked" : "Enable"}
            </button>}
        <button type="button" aria-label="Dismiss notification prompt" onClick={()=>setDismissed(true)}
          style={{border:0,background:"transparent",color:"#64748b",fontSize:10,fontWeight:700}}>Not now ×</button>
      </div>
    </aside>
  );
}
