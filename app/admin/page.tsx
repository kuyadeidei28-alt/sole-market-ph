
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
  reviewed_at: string | null;
};

type Subscription = {
  id: string;
  seller_id: string;
  status: string;
  started_at: string | null;
  expires_at: string | null;
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
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});

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

      const { data: userData, error: userError } =
        await client.auth.getUser();

      if (userError || !userData.user) {
        router.replace("/login");
        return;
      }

      const { data: adminResult, error: adminError } =
        await client.rpc("is_sole_market_admin");

      if (adminError || adminResult !== true) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      const [
        { data: settings, error: settingsError },
        { data: paymentRows, error: paymentError },
        { data: subscriptionRows, error: subscriptionError },
      ] = await Promise.all([
        client
          .from("subscription_settings")
          .select("is_enabled, monthly_price")
          .eq("id", 1)
          .single(),

        client
          .from("subscription_payments")
          .select(
            "id,seller_id,amount,payment_method,reference_number,status,proof_url,rejection_reason,created_at,reviewed_at"
          )
          .order("created_at", { ascending: false }),

        client
          .from("seller_subscriptions")
          .select("id,seller_id,status,started_at,expires_at,created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (settingsError) throw settingsError;
      if (paymentError) throw paymentError;
      if (subscriptionError) throw subscriptionError;

      setEnabled(Boolean(settings.is_enabled));
      setMonthlyPrice(Number(settings.monthly_price ?? 99));

      const loadedPayments = (paymentRows || []) as Payment[];
      setPayments(loadedPayments);
      setSubscriptions((subscriptionRows || []) as Subscription[]);

      // Generate temporary secure links for private payment receipts.
      const signedLinks: Record<string, string> = {};

      await Promise.all(
        loadedPayments.map(async (payment) => {
          if (!payment.proof_url) return;

          if (payment.proof_url.startsWith("http")) {
            signedLinks[payment.id] = payment.proof_url;
            return;
          }

          const { data, error: signedError } = await client.storage
            .from(RECEIPT_BUCKET)
            .createSignedUrl(payment.proof_url, 600);

          if (!signedError && data?.signedUrl) {
            signedLinks[payment.id] = data.signedUrl;
          }
        })
      );

      setProofUrls(signedLinks);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function toggleSubscription() {
    const client = supabase;
    if (!client) return;

    const confirmed = window.confirm(
      enabled
        ? "Turn OFF seller subscriptions?"
        : "Turn ON seller subscriptions?"
    );

    if (!confirmed) return;

    setBusy("settings");
    setMessage("");
    setError("");

    try {
      const { error: updateError } = await client
        .from("subscription_settings")
        .update({
          is_enabled: !enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      if (updateError) throw updateError;

      setEnabled(!enabled);
      setMessage("Subscription setting updated successfully.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to update subscription setting."
      );
    } finally {
      setBusy("");
    }
  }

  async function approvePayment(payment: Payment) {
    const client = supabase;
    if (!client || !enabled) return;

    const confirmed = window.confirm(
      `Approve this ₱${Number(payment.amount).toFixed(
        2
      )} payment and activate the seller's subscription for 30 days?`
    );

    if (!confirmed) return;

    setBusy(payment.id);
    setMessage("");
    setError("");

    try {
      const { error: approvalError } = await client.rpc(
        "admin_approve_subscription_payment",
        {
          p_payment_id: payment.id,
        }
      );

      if (approvalError) throw approvalError;

      setMessage(
        "Payment approved successfully. Seller subscription activated for 30 days."
      );

      await loadData();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to approve payment."
      );
    } finally {
      setBusy("");
    }
  }

  async function rejectPayment(payment: Payment) {
    const client = supabase;
    if (!client) return;

    const reason = window.prompt(
      "Enter the reason for rejecting this payment:"
    );

    if (reason === null) return;

    if (!reason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }

    const confirmed = window.confirm("Reject this payment submission?");

    if (!confirmed) return;

    setBusy(payment.id);
    setMessage("");
    setError("");

    try {
      const { error: rejectionError } = await client.rpc(
        "admin_reject_subscription_payment",
        {
          p_payment_id: payment.id,
          p_reason: reason.trim(),
        }
      );

      if (rejectionError) throw rejectionError;

      setMessage("Payment rejected successfully.");

      await loadData();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to reject payment."
      );
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        Loading admin dashboard...
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <h1>Access Denied</h1>
          <p>This page is for the SOLE MARKET PH admin only.</p>
          <Link href="/dashboard">Back to Dashboard</Link>
        </div>
      </main>
    );
  }

  const pendingPayments = payments.filter(
    (payment) => payment.status === "pending"
  );

  const activeSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.status === "active" &&
      subscription.expires_at &&
      new Date(subscription.expires_at) > new Date()
  );

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>SOLE MARKET PH</h1>
            <p style={styles.subtitle}>Admin Dashboard</p>
          </div>

          <div style={styles.headerLinks}>
            <button
              onClick={() => {
                setLoading(true);
                loadData();
              }}
              style={styles.refreshButton}
              disabled={busy !== ""}
            >
              Refresh
            </button>

            <Link href="/dashboard">Seller Dashboard</Link>
          </div>
        </header>

        {error && <div style={styles.error}>{error}</div>}
        {message && <div style={styles.success}>{message}</div>}

        <section style={styles.card}>
          <h2>Subscription Control</h2>

          <p>
            Monthly Plan:{" "}
            <strong>₱{monthlyPrice.toFixed(2)} / month</strong>
          </p>

          <p>
            Status:{" "}
            <strong style={{ color: enabled ? "#15803d" : "#dc2626" }}>
              {enabled ? "ON" : "OFF"}
            </strong>
          </p>

          <button
            onClick={toggleSubscription}
            disabled={busy === "settings"}
            style={{
              ...styles.button,
              background: enabled ? "#dc2626" : "#1677e8",
            }}
          >
            {busy === "settings"
              ? "Updating..."
              : enabled
                ? "Turn OFF Subscription"
                : "Turn ON Subscription"}
          </button>

          {!enabled && (
            <p style={styles.muted}>
              Subscription is currently disabled. Sellers remain free.
            </p>
          )}
        </section>

        <section style={styles.statsGrid}>
          <div style={styles.statCard}>
            <p>Pending Payments</p>
            <h2>{pendingPayments.length}</h2>
          </div>

          <div style={styles.statCard}>
            <p>Active Subscriptions</p>
            <h2>{activeSubscriptions.length}</h2>
          </div>

          <div style={styles.statCard}>
            <p>Total Payments</p>
            <h2>{payments.length}</h2>
          </div>
        </section>

        <section style={styles.card}>
          <h2>Payment Submissions</h2>

          {payments.length === 0 ? (
            <p style={styles.muted}>No payment submissions yet.</p>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} style={styles.historyItem}>
                <p>
                  <strong>Seller ID:</strong> {payment.seller_id}
                </p>

                <p>
                  <strong>Method:</strong> {payment.payment_method}
                </p>

                <p>
                  <strong>Reference Number:</strong>{" "}
                  {payment.reference_number || "—"}
                </p>

                <p>
                  <strong>Amount:</strong>{" "}
                  ₱{Number(payment.amount).toFixed(2)}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    style={{
                      color:
                        payment.status === "approved"
                          ? "#15803d"
                          : payment.status === "rejected"
                            ? "#dc2626"
                            : "#b45309",
                      fontWeight: 700,
                    }}
                  >
                    {payment.status.toUpperCase()}
                  </span>
                </p>

                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(payment.created_at).toLocaleString()}
                </p>

                {payment.proof_url && (
                  <p>
                    {proofUrls[payment.id] ? (
                      <a
                        href={proofUrls[payment.id]}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.proofLink}
                      >
                        View Payment Proof
                      </a>
                    ) : (
                      <span style={styles.muted}>
                        Payment proof link unavailable.
                      </span>
                    )}
                  </p>
                )}

                {payment.rejection_reason && (
                  <p style={styles.errorText}>
                    <strong>Rejection Reason:</strong>{" "}
                    {payment.rejection_reason}
                  </p>
                )}

                {payment.status === "pending" && (
                  <div style={styles.actionRow}>
                    <button
                      onClick={() => approvePayment(payment)}
                      disabled={!enabled || busy !== ""}
                      style={styles.approveButton}
                    >
                      {busy === payment.id ? "Processing..." : "Approve"}
                    </button>

                    <button
                      onClick={() => rejectPayment(payment)}
                      disabled={busy !== ""}
                      style={styles.rejectButton}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        <section style={styles.card}>
          <h2>Seller Subscriptions</h2>

          {subscriptions.length === 0 ? (
            <p style={styles.muted}>No subscriptions yet.</p>
          ) : (
            subscriptions.map((subscription) => (
              <div key={subscription.id} style={styles.historyItem}>
                <p>
                  <strong>Seller ID:</strong> {subscription.seller_id}
                </p>

                <p>
                  <strong>Status:</strong> {subscription.status.toUpperCase()}
                </p>

                <p>
                  <strong>Started:</strong>{" "}
                  {subscription.started_at
                    ? new Date(subscription.started_at).toLocaleString()
                    : "—"}
                </p>

                <p>
                  <strong>Expires:</strong>{" "}
                  {subscription.expires_at
                    ? new Date(subscription.expires_at).toLocaleString()
                    : "Not set"}
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
  headerLinks: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
  },
  subtitle: {
    color: "#64748b",
    marginTop: 8,
  },
  card: {
    background: "white",
    padding: 20,
    borderRadius: 14,
    marginTop: 20,
    boxShadow: "0 2px 10px #0000000a",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginTop: 20,
  },
  statCard: {
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
  refreshButton: {
    padding: "9px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "white",
    cursor: "pointer",
  },
  muted: {
    color: "#64748b",
  },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
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
  errorText: {
    color: "#b91c1c",
    overflowWrap: "anywhere",
  },
  historyItem: {
    borderTop: "1px solid #e5e7eb",
    padding: "16px 0",
    overflowWrap: "anywhere",
  },
  actionRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 12,
  },
  approveButton: {
    padding: "10px 16px",
    background: "#16834a",
    color: "white",
    border: 0,
    borderRadius: 7,
    fontWeight: 700,
    cursor: "pointer",
  },
  rejectButton: {
    padding: "10px 16px",
    background: "#dc2626",
    color: "white",
    border: 0,
    borderRadius: 7,
    fontWeight: 700,
    cursor: "pointer",
  },
  proofLink: {
    color: "#2563eb",
    fontWeight: 700,
    textDecoration: "underline",
  },
  footer: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 30,
  },
};
