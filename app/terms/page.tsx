import Link from "next/link";

export const metadata = {
  title: "Terms of Use | SOLE MARKET PH",
  description: "Terms for using the SOLE MARKET PH marketplace."
};

export default function TermsPage() {
  return (
    <>
      <header className="top"><Link className="brand" href="/">SOLE MARKET PH</Link><nav><Link href="/">Marketplace</Link><Link href="/support">Support</Link></nav></header>
      <main><article className="panel" style={{ maxWidth: 850 }}>
        <h1>Terms of Use</h1>
        <p className="muted">Last updated: November 28, 2026</p>
        <p>These Terms apply to your use of SOLE MARKET PH. By using the marketplace, you agree to follow these Terms and the <Link href="/community-guidelines">Community Guidelines</Link>.</p>

        <h2>1. Marketplace role</h2>
        <p>SOLE MARKET PH is an online marketplace and connection platform. It helps buyers discover listings and contact independent sellers directly, including through external Messenger links. Unless expressly stated otherwise, SOLE MARKET PH is not the seller, buyer, payment processor, shipper or delivery provider for transactions between users.</p>

        <h2>2. Independent transactions</h2>
        <p>Buyers and sellers are responsible for checking product details, authenticity, condition, availability, price, payment arrangements, shipping, delivery, returns and other transaction terms before proceeding. Users should independently verify the other party and keep appropriate transaction records. Product approval or a seller profile does not guarantee authenticity, quality, ownership, availability or performance.</p>
        <p>To the extent permitted by applicable law, SOLE MARKET PH is not responsible for separate agreements, payments, delivery arrangements, product condition or disputes between buyers and sellers. Nothing in these Terms excludes liability that cannot lawfully be excluded.</p>

        <h2>3. Seller responsibilities</h2>
        <p>Sellers must provide accurate listing information, use photos they are authorized to share, keep contact details current, respond honestly to buyers, and comply with applicable laws. Sellers are responsible for their subscriptions and any separate agreements they make with buyers.</p>

        <h2>4. Prohibited conduct</h2>
        <p>Users may not post counterfeit or stolen goods, fraudulent or misleading listings, illegal products, deceptive photos, abusive content, threats, harassment, spam, or content that infringes another person's rights. Users may not impersonate another person or misuse identity and business documents.</p>

        <h2>5. Listing review and enforcement</h2>
        <p>New listings may be held for management review before appearing publicly. We may reject, hide or remove content, restrict an account, or investigate reports where we reasonably believe these Terms, the Community Guidelines or applicable law have been violated. Users can report listings and block sellers through available marketplace controls.</p>

        <h2>6. Accounts and subscriptions</h2>
        <p>You are responsible for protecting your login credentials and for activity under your account. Buyer browsing is free. Seller posting and subscription features are subject to the plan and payment terms displayed in the website. Subscription approval is subject to payment review and the current subscription settings.</p>

        <h2>7. External services</h2>
        <p>Links to Messenger and other third-party services are provided for convenience. Those services operate independently and are subject to their own terms, policies and availability.</p>

        <h2>8. Account suspension and deletion</h2>
        <p>We may restrict accounts for safety, fraud prevention, policy violations or legal compliance. You may request deletion from <Link href="/settings">Account Settings</Link>. Some records may be retained where required for legal, accounting, security or dispute-resolution purposes.</p>

        <h2>9. Changes and contact</h2>
        <p>We may update these Terms as the marketplace changes. For questions or complaints, contact us through the <Link href="/support">Support page</Link>.</p>
      </article></main>
    </>
  );
}
