import Link from "next/link";

export default function OfflinePage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#05070b", color: "#fff", textAlign: "center" }}>
      <section style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>👟</div>
        <p style={{ color: "#60a5fa", fontWeight: 800, letterSpacing: 2 }}>SOLE MARKET PH</p>
        <h1 style={{ fontSize: 30, margin: "12px 0" }}>You’re offline</h1>
        <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>Please reconnect to the internet to browse listings, sign in, and contact sellers.</p>
        <Link href="/" style={{ display: "inline-block", marginTop: 18, padding: "12px 20px", borderRadius: 10, background: "#075CE5", color: "#fff", fontWeight: 800 }}>Try again</Link>
      </section>
    </main>
  );
}
