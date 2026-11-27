import Link from "next/link";

const FACEBOOK_GROUP_URL = "https://www.facebook.com/share/g/19rvbpYqBp/";

export default function CommunityPage() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 64px" }}>
      <section style={{
        background: "#080808",
        color: "#fff",
        borderRadius: 20,
        padding: "clamp(28px, 6vw, 64px) 24px",
        textAlign: "center",
        marginBottom: 28
      }}>
        <p style={{ letterSpacing: 5, fontWeight: 800, fontSize: 13 }}>SOLE MARKET PH PRESENTS</p>
        <h1 style={{ fontSize: "clamp(34px, 7vw, 58px)", fontWeight: 900, margin: "12px 0" }}>SOLE HYPE</h1>
        <p style={{ fontSize: "clamp(18px, 4vw, 26px)", letterSpacing: 8, fontWeight: 800 }}>COMMUNITY</p>
        <p style={{ maxWidth: 620, margin: "22px auto 0", color: "#d1d5db", lineHeight: 1.7 }}>
          The community for sneaker buyers, sellers, collectors, and shoe enthusiasts.
          Connect with the existing public Facebook group.
        </p>
        <a href={FACEBOOK_GROUP_URL} target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-block", marginTop: 26, background: "#1877F2", color: "#fff", padding: "13px 22px", borderRadius: 10, fontWeight: 800, textDecoration: "none" }}>
          Join SOLE HYPE COMMUNITY on Facebook
        </a>
      </section>

      <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Welcome, sneakerheads!</h2>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          Join discussions, share your sneaker finds, ask for legit checks, and connect with fellow members
          in our public Facebook group.
        </p>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 16 }}>
          Facebook posts and group messages remain on Facebook. Website-based community posts and live chat
          can be added as a separate feature.
        </p>
        <Link href="/chat" style={{ display: "inline-block", marginTop: 18, marginRight: 18, color: "#075ce5", fontWeight: 700, textDecoration: "none" }}>Open Website Chat →</Link>\n        <Link href="/" style={{ display: "inline-block", marginTop: 18, color: "#075ce5", fontWeight: 700, textDecoration: "none" }}>
          ← Back to Marketplace
        </Link>
      </section>
    </main>
  );
}
