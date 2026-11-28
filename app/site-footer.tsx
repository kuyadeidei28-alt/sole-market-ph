import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer" aria-label="Site information">
      <div className="footer-inner" style={{ flexWrap: "wrap" }}>
        <div>
          <strong className="footer-brand">SOLE MARKET PH</strong>
          <p style={{ margin: "6px 0 0" }}>A marketplace connecting buyers and independent sellers.</p>
        </div>
        <nav aria-label="Policies and support" style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Use</Link>
          <Link href="/community-guidelines">Community Guidelines</Link>
          <Link href="/support">Support</Link>
          <Link href="/settings">Account Settings</Link>
        </nav>
      </div>
    </footer>
  );
}
