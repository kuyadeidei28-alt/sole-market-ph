
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const RECEIPT_BUCKET = "subscription-receipts";

type Payment = {
  id: string;
  seller_id: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  status: string;
  proof_url: string | null;
  rejection_reason: string | null;
  created_at: string;
};

type Subscription = {
  id: string;
  seller_id: string;
  status: string;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type Product = {
  id: string;
  seller_id: string;
  title: string;
  brand: string | null;
  category: string;
  size: string | null;
  price: number;
  description: string | null;
  messenger_url: string;
  seller_name: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
};

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState(99);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [subscriptionWarning, setSubscriptionWarning] = useState("");

  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    const client = supabase;

    if (!client) {
      setError("Supabase connection is unavailable.");
      setLoading(false);
      return;
    }

    try {
      setError("");
      setSubscriptionWarning("");

      const { data: auth, error: authError } =
        await client.auth.getUser();

      if (authError || !auth.user) {
        router.replace("/login");
        return;
      }

      const { data: adminResult, error: adminError } =
        await client.rpc("is_sole_market_admin");

      if (adminError || adminResult !== true) {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(true);

      const [
        { data: settings, error: settingsError },
        { data: paymentRows, error: paymentError },
        { data: productRows, error: productError },
      ] = await Promise.all([
        client
          .from("subscription_settings")
          .select("is_enabled,monthly_price")
          .eq("id", 1)
          .single(),

        client
          .from("subscription_payments")
          .select(
            "id,seller_id,amount,payment_method,reference_number,status,proof_url,rejection_reason,created_at"
          )
          .order("created_at", { ascending: false }),

        client.rpc("admin_list_pending_products"),
      ]);

      if (settingsError) throw settingsError;
      if (paymentError) throw paymentError;
      if (productError) throw productError;

      setEnabled(Boolean(settings.is_enabled));
      setMonthlyPrice(Number(settings.monthly_price ?? 99));

      const loadedPayments = (paymentRows || []) as Payment[];
      setPayments(loadedPayments);

      setProducts((productRows || []) as Product[]);

      // Load subscriptions separately so a subscription-table
      // permission error does not stop payment management.
      const { data: subscriptionRows, error: subscriptionError } =
        await client
          .from("seller_subscriptions")
          .select("id,seller_id,status,started_at,expires_at,created_at")
          .order("created_at", { ascending: false });

      if (subscriptionError) {
        setSubscriptions([]);
        setSubscriptionWarning(
          "Seller subscription list is unavailable: " +
            subscriptionError.message
        );
      } else {
        setSubscriptions((subscriptionRows || []) as Subscription[]);
      }

      // Create signed links for private payment receipts.
      const links: Record<string, string> = {};

      await Promise.all(
        loadedPayments.map(async (payment) => {
          if (!payment.proof_url) return;

          if (payment.proof_url.startsWith("http")) {
            links[payment.id] = payment.proof_url;
            return;
          }

          const { data } = await client.storage
            .from(RECEIPT_BUCKET)
            .createSignedUrl(payment.proof_url, 600);

          if (data?.signedUrl) {
            links[payment.id] = data.signedUrl;
          }
        })
      );

      setProofUrls(links);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function refreshDashboard() {
    setLoading(true);
    await loadData();
  }

  async function toggleSubscription() {
    const client = supabase;
    if (!client) return;

    if (
      !window.confirm(
        enabled
          ? "Turn OFF seller subscriptions?"
          : "Turn ON seller subscriptions?"
      )
    ) {
      return;
    }

    setBusy("settings");
    setError("");
    setMessage("");

    try {
      const { error } = await client
        .from("subscription_settings")
        .update({
          is_enabled: !enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      if (error) throw error;

      setEnabled(!enabled);
      setMessage("Subscription setting updated successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy("");
    }
  }

  async function approvePayment(payment: Payment) {
    const client = supabase;
    if (!client || !enabled) return;

    if (
      !window.confirm(
        `Approve ₱${Number(payment.amount).toFixed(
          2
        )} and activate the seller subscription for 30 days?`
      )
    ) {
      return;
    }

    setBusy(payment.id);
    setError("");
    setMessage("");

    try {
      const { error } = await client.rpc(
        "admin_approve_subscription_payment",
        { p_payment_id: payment.id }
      );

      if (error) throw error;

      setMessage(
        "Payment approved. Subscription activation was processed."
      );

      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed.");
    } finally {
      setBusy("");
    }
  }

  async function rejectPayment(payment: Payment) {
    const client = supabase;
    if (!client) return;

    const reason = window.prompt("Reason for rejecting this payment:");
    if (reason === null) return;

    if (!reason.trim()) {
      setError("Please enter a rejection reason.");
      return;
    }

    if (!window.confirm("Reject this payment?")) return;

    setBusy(payment.id);
    setError("");
    setMessage("");

    try {
      const { error } = await client.rpc(
        "admin_reject_subscription_payment",
        {
          p_payment_id: payment.id,
          p_reason: reason.trim(),
        }
      );

      if (error) throw error;

      setMessage("Payment rejected successfully.");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rejection failed.");
    } finally {
      setBusy("");
    }
  }

  async function approveProduct(product: Product) {
    const client = supabase;
    if (!client) return;

    if (
      !window.confirm(
        `Approve "${product.title}"? This product will become visible in the marketplace.`
      )
    ) {
      return;
    }

    setBusy(product.id);
    setError("");
    setMessage("");

    try {
      const { error } = await client.rpc(
        "admin_approve_product",
        { p_product_id: product.id }
      );

      if (error) throw error;

      setMessage(`Product "${product.title}" approved successfully.`);
      await loadData();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Product approval failed."
      );
    } finally {
      setBusy("");
    }
  }

  async function rejectProduct(product: Product) {
    const client = supabase;
    if (!client) return;

    if (
      !window.confirm(
        `Reject "${product.title}"? The product will not appear in the public marketplace.`
      )
    ) {
      return;
    }

    setBusy(product.id);
    setError("");
    setMessage("");

    try {
      const { error } = await client.rpc(
        "admin_reject_product",
        { p_product_id: product.id }
      );

      if (error) throw error;

      setMessage(`Product "${product.title}" rejected successfully.`);
      await loadData();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Product rejection failed."
      );
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return <main style={styles.page}>Loading admin dashboard...</main>;
  }

  if (!isAdmin) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <h1>Access Denied</h1>
          <p>This page is for SOLE MARKET PH admin only.</p>
          <Link href="/dashboard">Back to Dashboard</Link>
        </div>
      </main>
    );
  }

  const pendingPayments = payments.filter(
    (p) => p.status === "pending"
  );

  const active = subscriptions.filter(
    (s) =>
      s.status === "active" &&
      s.expires_at &&
      new Date(s.expires_at) > new Date()
  );

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>SOLE MARKET PH</h1>
            <p style={styles.muted}>Admin Dashboard</p>
          </div>

          <div style={styles.actions}>
            <button
              style={styles.refresh}
              disabled={busy !== ""}
              onClick={refreshDashboard}
            >
              Refresh
            </button>

            <Link href="/admin/referrals">Referral Management</Link>
            <Link href="/dashboard">Seller Dashboard</Link>
          </div>
        </header>

        {error && <div style={styles.error}>{error}</div>}
        {message && <div style={styles.success}>{message}</div>}

        {subscriptionWarning && (
          <div style={styles.warning}>{subscriptionWarning}</div>
        )}

        {/* SUBSCRIPTION CONTROL */}
        <section style={styles.card}>
          <h2>Subscription Control</h2>

          <p>
            Monthly Plan:{" "}
            <strong>₱{monthlyPrice.toFixed(2)} / month</strong>
          </p>

          <p>
            Status:{" "}
            <strong style={{ color: enabled ? "green" : "red" }}>
              {enabled ? "ON" : "OFF"}
            </strong>
          </p>

          <button
            style={{
              ...styles.button,
              background: enabled ? "#dc2626" : "#1677e8",
            }}
            disabled={busy === "settings"}
            onClick={toggleSubscription}
          >
            {busy === "settings"
              ? "Updating..."
              : enabled
                ? "Turn OFF Subscription"
                : "Turn ON Subscription"}
          </button>
        </section>

        {/* DASHBOARD STATISTICS */}
        <section style={styles.stats}>
          <div style={styles.stat}>
            <p>Pending Payments</p>
            <h2>{pendingPayments.length}</h2>
          </div>

          <div style={styles.stat}>
            <p>Active Subscriptions</p>
            <h2>{active.length}</h2>
          </div>

          <div style={styles.stat}>
            <p>Total Payments</p>
            <h2>{payments.length}</h2>
          </div>

          <div style={styles.stat}>
            <p>Pending Products</p>
            <h2>{products.length}</h2>
          </div>
        </section>

        {/* PRODUCT APPROVAL */}
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2>Pending Products</h2>
              <p style={styles.muted}>
                Review products before they appear in the marketplace.
              </p>
            </div>

            <span style={styles.pendingBadge}>
              {products.length} Pending
            </span>
          </div>

          {products.length === 0 ? (
            <p style={styles.muted}>
              No pending products. All submitted listings are reviewed.
            </p>
          ) : (
            products.map((product) => (
              <div key={product.id} style={styles.productItem}>
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    style={styles.productImage}
                  />
                ) : (
                  <div style={styles.noImage}>No Product Photo</div>
                )}

                <div style={styles.productDetails}>
                  <h3 style={styles.productTitle}>{product.title}</h3>

                  <p>
                    <strong>Brand:</strong> {product.brand || "—"}
                  </p>

                  <p>
                    <strong>Category:</strong> {product.category}
                  </p>

                  <p>
                    <strong>Size:</strong> {product.size || "—"}
                  </p>

                  <p>
                    <strong>Price:</strong>{" "}
                    ₱{Number(product.price).toLocaleString("en-PH")}
                  </p>

                  <p>
                    <strong>Seller:</strong>{" "}
                    {product.seller_name || "Not provided"}
                  </p>

                  <p>
                    <strong>Seller ID:</strong> {product.seller_id}
                  </p>

                  {product.description && (
                    <p>
                      <strong>Description:</strong> {product.description}
                    </p>
                  )}

                  <p>
                    <strong>Messenger:</strong>{" "}
                    <a
                      href={product.messenger_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Messenger Link
                    </a>
                  </p>

                  <p style={styles.muted}>
                    Submitted:{" "}
                    {new Date(product.created_at).toLocaleString()}
                  </p>

                  <div style={styles.actions}>
                    <button
                      style={styles.approve}
                      disabled={busy !== ""}
                      onClick={() => approveProduct(product)}
                    >
                      {busy === product.id
                        ? "Processing..."
                        : "Approve Product"}
                    </button>

                    <button
                      style={styles.reject}
                      disabled={busy !== ""}
                      onClick={() => rejectProduct(product)}
                    >
                      Reject Product
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        {/* PAYMENT SUBMISSIONS */}
        <section style={styles.card}>
          <h2>Payment Submissions</h2>

          {payments.length === 0 ? (
            <p style={styles.muted}>
              No payment submissions yet.
            </p>
          ) : (
            payments.map((p) => (
              <div key={p.id} style={styles.item}>
                <p>
                  <strong>Seller ID:</strong> {p.seller_id}
                </p>

                <p>
                  <strong>Method:</strong> {p.payment_method}
                </p>

                <p>
                  <strong>Reference:</strong>{" "}
                  {p.reference_number || "—"}
                </p>

                <p>
                  <strong>Amount:</strong>{" "}
                  ₱{Number(p.amount).toFixed(2)}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  <strong
                    style={{
                      color:
                        p.status === "approved"
                          ? "green"
                          : p.status === "rejected"
                            ? "red"
                            : "#b45309",
                    }}
                  >
                    {p.status.toUpperCase()}
                  </strong>
                </p>

                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(p.created_at).toLocaleString()}
                </p>

                {p.proof_url && (
                  <p>
                    {proofUrls[p.id] ? (
                      <a
                        href={proofUrls[p.id]}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Payment Proof
                      </a>
                    ) : (
                      <span style={styles.muted}>
                        Proof link unavailable.
                      </span>
                    )}
                  </p>
                )}

                {p.rejection_reason && (
                  <p style={{ color: "red" }}>
                    Rejection Reason: {p.rejection_reason}
                  </p>
                )}

                {p.status === "pending" && (
                  <div style={styles.actions}>
                    <button
                      style={styles.approve}
                      disabled={!enabled || busy !== ""}
                      onClick={() => approvePayment(p)}
                    >
                      {busy === p.id ? "Processing..." : "Approve"}
                    </button>

                    <button
                      style={styles.reject}
                      disabled={busy !== ""}
                      onClick={() => rejectPayment(p)}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        {/* SELLER SUBSCRIPTIONS */}
        <section style={styles.card}>
          <h2>Seller Subscriptions</h2>

          {subscriptions.length === 0 ? (
            <p style={styles.muted}>
              No subscriptions available yet.
            </p>
          ) : (
            subscriptions.map((s) => (
              <div key={s.id} style={styles.item}>
                <p>
                  <strong>Seller ID:</strong> {s.seller_id}
                </p>

                <p>
                  <strong>Status:</strong> {s.status.toUpperCase()}
                </p>

                <p>
                  <strong>Started:</strong>{" "}
                  {s.started_at
                    ? new Date(s.started_at).toLocaleString()
                    : "—"}
                </p>

                <p>
                  <strong>Expires:</strong>{" "}
                  {s.expires_at
                    ? new Date(s.expires_at).toLocaleString()
                    : "—"}
                </p>
              </div>
            ))
          )}
        </section>

        <p style={styles.footer}>
          SOLE MARKET PH · Admin Dashboard
        </p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4f6fb",
    padding: "24px 16px",
    color: "#172033",
    fontFamily: "Inter, Arial, sans-serif",
  },

  container: {
    maxWidth: 1050,
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },

  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
  },

  muted: {
    color: "#64748b",
    overflowWrap: "anywhere",
  },

  actions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },

  card: {
    background: "white",
    padding: 20,
    borderRadius: 14,
    marginTop: 20,
    boxShadow: "0 2px 10px #0000000a",
  },

  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginTop: 20,
  },

  stat: {
    background: "white",
    padding: 20,
    borderRadius: 12,
  },

  button: {
    padding: "12px 20px",
    border: 0,
    borderRadius: 8,
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },

  refresh: {
    padding: "9px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "white",
    cursor: "pointer",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    overflowWrap: "anywhere",
  },

  warning: {
    background: "#fef3c7",
    color: "#92400e",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    overflowWrap: "anywhere",
  },

  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    overflowWrap: "anywhere",
  },

  item: {
    borderTop: "1px solid #e5e7eb",
    padding: "16px 0",
    overflowWrap: "anywhere",
  },

  productItem: {
    display: "flex",
    flexWrap: "wrap",
    gap: 18,
    borderTop: "1px solid #e5e7eb",
    padding: "20px 0",
    overflowWrap: "anywhere",
  },

  productImage: {
    width: 190,
    height: 190,
    objectFit: "cover",
    borderRadius: 10,
    background: "#f1f5f9",
  },

  noImage: {
    width: 190,
    height: 190,
    borderRadius: 10,
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    fontSize: 13,
  },

  productDetails: {
    flex: 1,
    minWidth: 240,
  },

  productTitle: {
    marginTop: 0,
    marginBottom: 12,
    fontSize: 20,
  },

  pendingBadge: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "7px 12px",
    borderRadius: 20,
    fontWeight: 700,
    fontSize: 13,
  },

  approve: {
    padding: "10px 16px",
    background: "#16834a",
    color: "white",
    border: 0,
    borderRadius: 7,
    fontWeight: 700,
    cursor: "pointer",
  },

  reject: {
    padding: "10px 16px",
    background: "#dc2626",
    color: "white",
    border: 0,
    borderRadius: 7,
    fontWeight: 700,
    cursor: "pointer",
  },

  footer: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 30,
  },
};
