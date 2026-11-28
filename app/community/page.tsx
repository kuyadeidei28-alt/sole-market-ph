import Link from "next/link";

const FACEBOOK_GROUP_URL = "https://www.facebook.com/share/g/19rvbpYqBp/";

const communities = [
  {
    name: "VOMERO & P6000 SALE PH",
    members: "14K members",
    image: "/communities/vomero-p6000.webp",
    url: "https://www.facebook.com/share/g/19qfkKAcqe/",
    note: "Sneaker buy & sell community",
  },
  {
    name: "SOLE SLAM COMMUNITY V2",
    members: "24K members",
    image: "/communities/sole-slam.webp",
    url: "https://www.facebook.com/share/g/192bSzZ6No/",
    note: "Sneaker community",
  },
];

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

      <section aria-labelledby="community-list-title" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, marginBottom: 14 }}>
          <div>
            <p style={{ color: "#64748b", fontSize: 12, fontWeight: 800, letterSpacing: 2, margin: 0 }}>DISCOVER MORE GROUPS</p>
            <h2 id="community-list-title" style={{ fontSize: 24, fontWeight: 850, color: "#111827", margin: "5px 0 0" }}>Sneaker Communities</h2>
          </div>
          <span style={{ color: "#64748b", fontSize: 12, whiteSpace: "nowrap" }}>Swipe to explore →</span>
        </div>
        <div style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          padding: "2px 2px 14px",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch"
        }}>
          {communities.map((community) => (
            <article key={community.name} style={{
              flex: "0 0 min(84vw, 420px)",
              minWidth: 0,
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 18,
              overflow: "hidden",
              scrollSnapAlign: "start",
              boxShadow: "0 4px 18px rgba(15, 23, 42, 0.06)"
            }}>
              <img
                src={community.image}
                alt={community.name + " Facebook group cover"}
                style={{ display: "block", width: "100%", height: 180, objectFit: "cover", background: "#080808" }}
              />
              <div style={{ padding: 18 }}>
                <h3 style={{ color: "#111827", fontSize: 19, lineHeight: 1.25, fontWeight: 850, margin: "0 0 9px" }}>
                  {community.name}
                </h3>
                <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 5px" }}>
                  <strong style={{ color: "#111827" }}>{community.members}</strong>
                  <span> · Facebook group</span>
                </p>
                <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 16px" }}>{community.note}</p>
                <a href={community.url} target="_blank" rel="noopener noreferrer" style={{
                  display: "block",
                  textAlign: "center",
                  background: "#1877F2",
                  color: "#fff",
                  padding: "12px 16px",
                  borderRadius: 10,
                  fontWeight: 800,
                  textDecoration: "none"
                }}>
                  Join Community on Facebook
                </a>
              </div>
            </article>
          ))}
        </div>
        <p style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.5, margin: "2px 2px 0" }}>
          Member counts shown are from the screenshots provided. Automatic live updates are not connected yet.
        </p>
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
        <div aria-disabled="true" style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap",
          gap: 9, marginTop: 18, marginRight: 18, padding: "11px 14px",
          border: "1.5px solid #8b5cf6", borderRadius: 12, background: "#f7f2ff",
          color: "#24124b", fontWeight: 800, cursor: "not-allowed",
          boxShadow: "0 5px 14px rgba(124,58,237,.12)"
        }}>
          <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" style={{ color: "#6d28d9", flex: "0 0 19px" }}>
            <rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor" />
            <path d="M8 10V7a4 4 0 1 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="12" cy="15" r="1.2" fill="#fff" />
          </svg>
          <span>Website Chat</span>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            padding: "4px 9px", borderRadius: 20, background: "#DC2626",
            color: "#fff", fontSize: 10, fontWeight: 900, letterSpacing: ".3px",
            whiteSpace: "nowrap"
          }}>COMING SOON</span>
        </div>
        <Link href="/" style={{ display: "inline-block", marginTop: 18, color: "#075ce5", fontWeight: 700, textDecoration: "none" }}>
          ← Back to Marketplace
        </Link>
      </section>
    </main>
  );
}
