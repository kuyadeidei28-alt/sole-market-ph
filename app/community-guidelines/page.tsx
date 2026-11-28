import Link from "next/link";

export const metadata = {
  title: "Community Guidelines | SOLE MARKET PH",
  description: "Marketplace listing standards and user safety rules."
};

export default function CommunityGuidelinesPage() {
  return (
    <>
      <header className="top"><Link className="brand" href="/">SOLE MARKET PH</Link><nav><Link href="/">Marketplace</Link><Link href="/support">Support</Link></nav></header>
      <main><article className="panel" style={{ maxWidth: 850 }}>
        <h1>Community Guidelines</h1>
        <p className="muted">Last updated: November 28, 2026</p>
        <p>We want SOLE MARKET PH to be a safer place for buyers and independent sellers. Everyone using the marketplace must follow these rules.</p>
        <h2>Allowed marketplace behavior</h2>
        <ul>
          <li>Post accurate product titles, brands, sizes, prices, condition and descriptions.</li>
          <li>Use genuine photos you own or are authorized to use.</li>
          <li>Communicate respectfully and honestly with other users.</li>
          <li>Check details and agree on transaction terms directly before paying or arranging delivery.</li>
        </ul>
        <h2>Not allowed</h2>
        <ul>
          <li>Counterfeit, fake, stolen or unlawfully obtained goods.</li>
          <li>Scams, impersonation, false claims, fake payment proofs or misleading prices.</li>
          <li>Misleading, copied or unauthorized product photos and trademarks.</li>
          <li>Threats, harassment, hate, bullying, doxxing or sharing another person's private information.</li>
          <li>Illegal products, spam, malicious links or attempts to evade marketplace moderation.</li>
        </ul>
        <h2>Listing review and filtering</h2>
        <p>Submitted listings may remain pending until an administrator reviews them. Listings that appear to violate these Guidelines may be rejected, hidden or removed. Review is not a guarantee that a product is authentic or that a seller is trustworthy.</p>
        <h2>Report and block</h2>
        <p>Use the Report Listing control to tell management about suspected counterfeit goods, scams, misleading listings, suspicious activity or harassment. Provide enough detail for review. Use Block Seller to hide that seller's listings from your own marketplace view. Reports are reviewed by management and may result in content removal or account restrictions.</p>
        <h2>How we enforce these rules</h2>
        <p>We may review reports, request clarification, remove content, suspend listing privileges or restrict accounts when necessary to protect the community and comply with law. Repeated or serious violations may result in permanent account action.</p>
        <p>For urgent concerns or questions, use our <Link href="/support">Support page</Link>.</p>
      </article></main>
    </>
  );
}
