import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | SOLE MARKET PH",
  description: "How SOLE MARKET PH collects, uses, stores and deletes personal information."
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <header className="top"><Link className="brand" href="/">SOLE MARKET PH</Link><nav><Link href="/">Marketplace</Link><Link href="/support">Support</Link></nav></header>
      <main><article className="panel" style={{ maxWidth: 850 }}>
        <h1>Privacy Policy</h1>
        <p className="muted">Last updated: November 28, 2026</p>
        <p>SOLE MARKET PH operates an online marketplace that helps buyers discover shoe listings and contact independent sellers directly. This policy explains the information handled when you use our website and related app experience.</p>

        <h2>1. Information we collect</h2>
        <ul>
          <li><strong>Account information:</strong> email address and authentication identifiers used to create and secure an account.</li>
          <li><strong>Profile information:</strong> display or store name, location, biography and Messenger link that a seller chooses to provide.</li>
          <li><strong>Marketplace content:</strong> listing title, brand, category, size, price, description, seller name and product photos.</li>
          <li><strong>Seller verification information:</strong> where a seller applies for verification, information submitted for review may include legal name, contact details, address, Facebook URL, business details and uploaded identity or business documents.</li>
          <li><strong>Subscription and referral records:</strong> subscription status, payment amount and status, payment proof submitted for review, referral codes and commission records.</li>
          <li><strong>Safety and support information:</strong> reports, block preferences, support messages and account-deletion requests.</li>
          <li><strong>Optional push notification data:</strong> browser push endpoint and subscription keys when a user chooses to enable notifications.</li>
        </ul>

        <h2>2. How we use information</h2>
        <p>We use information to operate accounts, display listings and seller profiles, connect buyers with sellers, review listings and seller verification submissions, administer subscriptions and referrals, respond to support requests, investigate reports, prevent fraud and abuse, process account-deletion requests, and deliver notifications when enabled.</p>

        <h2>3. Public marketplace information</h2>
        <p>Information intentionally included in a public seller profile or approved product listing may be visible to website and app visitors. Do not publish private contact details or sensitive information in public listing fields. Messenger links open an external Meta service and are governed by that service's terms and privacy practices.</p>

        <h2>4. Service providers and sharing</h2>
        <p>We use Supabase for database, authentication and file storage services, and Vercel for website hosting and delivery. We share information with these providers only as needed to operate and secure the service. When you choose to contact a seller through Messenger, you leave SOLE MARKET PH and interact with Meta's service. We do not sell personal information. We may disclose information where required by law or where reasonably necessary to protect users, the platform or the public.</p>

        <h2>5. Storage and security</h2>
        <p>We use access controls and platform security features intended to protect account, listing, verification, payment-review and support information. No internet transmission or storage system can be guaranteed completely secure. Access to sensitive seller verification documents and payment proofs should be limited to authorized review personnel.</p>

        <h2>6. Retention and deletion</h2>
        <p>We retain information while it is needed to provide the service, administer subscriptions and referrals, resolve reports or disputes, maintain security, and meet legal or accounting obligations. You may initiate account deletion from <Link href="/settings">Account Settings</Link> while signed in. If a request needs manual review, we will process it within a reasonable period and provide an update. We delete or de-identify information that is no longer needed, except information we are legally required or permitted to retain, such as certain transaction, fraud-prevention or dispute records.</p>
        <p>Deleting an account may remove or de-identify associated profile and user-generated content where appropriate. Some records may be retained where required for legal, accounting, security or dispute-resolution purposes.</p>

        <h2>7. Your choices</h2>
        <p>You can update seller profile information in Account Settings, choose whether to enable browser push notifications, report listings or sellers, block sellers so their listings are hidden from your marketplace view, and request account deletion from within your account.</p>

        <h2>8. Children</h2>
        <p>The marketplace is intended for a general audience and is not designed to collect personal information from children. If you believe a child has provided personal information, contact us through the support page so we can review the request.</p>

        <h2>9. Changes to this policy</h2>
        <p>We may update this policy when our services or legal requirements change. The current version will be published on this page with its latest update date.</p>

        <h2>10. Contact</h2>
        <p>For privacy questions, data requests or concerns, use our <Link href="/support">Support page</Link> and choose the privacy-related subject.</p>
      </article></main>
    </>
  );
}
