
"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

const QR_IMAGES = [
  {
    name: "GCash",
    file: "1000057693.jpg",
    url: "https://wkyvumtdlikosgytyydv.supabase.co/storage/v1/object/public/subsciption-qr./1000057693.jpg",
  },
  {
    name: "BPI",
    file: "1000057695.png",
    url: "https://wkyvumtdlikosgytyydv.supabase.co/storage/v1/object/public/subsciption-qr./1000057695.png",
  },
];

const BUCKET = "subscription-receipts";
type PaymentMethod = "GCash" | "BPI";

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [price, setPrice] = useState(99);
  const [userId, setUserId] = useState("");
  const [reference, setReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("GCash");
  const [file, setFile] = useState<File | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const client = supabase;
    if (!client) throw new Error("Supabase connection unavailable.");

    const [
      { data: paymentRows, error: paymentError },
      { data: subscriptionRows, error: subscriptionError },
    ] = await Promise.all([
      client
        .from("subscription_payments")
        .select("id,amount,payment_method,reference_number,status,proof_url,rejection_reason,created_at,reviewed_at")
        .order("created_at", { ascending: false }),
      client
        .from("seller_subscriptions")
        .select("id,status,started_at,expires_at,created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (paymentError) throw paymentError;
    if (subscriptionError) throw subscriptionError;

    setPayments(paymentRows || []);
    setSubscriptions(subscriptionRows || []);
  }

  useEffect(() => {
    let alive = true;

    async function init() {
      const client = supabase;

      if (!client) {
        setError("Supabase connection unavailable.");
        setLoading(false);
        return;
      }

      try {
        const { data: auth, error: authError } = await client.auth.getUser();

        if (authError || !auth.user) {
          window.location.href = "/login";
          return;
        }

        if (!alive) return;
        setUserId(auth.user.id);

        const { data: settings, error: settingsError } = await client
          .from("subscription_settings")
          .select("is_enabled,monthly_price")
          .eq("id", 1)
          .single();

        if (settingsError) throw settingsError;
        if (!alive) return;

        setEnabled(Boolean(settings.is_enabled));
        setPrice(Number(settings.monthly_price ?? 99));

        await refresh();
      } catch (e: any) {
        if (alive) {
          setError(e?.message || "Unable to load subscription data.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    void init();

    return () => {
      alive = false;
    };
  }, []);

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const client = supabase;

    if (!client || !userId) {
      setError("Supabase connection unavailable. Please log in again.");
      return;
    }

    if (!reference.trim()) {
      setError("Please enter your payment reference number.");
      return;
    }

    if (!file) {
      setError("Please choose your payment receipt.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Maximum receipt size is 5 MB.");
      return;
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowed.includes(file.type)) {
      setError("Upload JPG, PNG, WEBP, or PDF only.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    let objectPath = "";

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      objectPath = `${userId}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await client.storage
        .from(BUCKET)
        .upload(objectPath, file, {
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await client
        .from("subscription_payments")
        .insert({
          seller_id: userId,
          payment_method: paymentMethod,
          amount: price,
          proof_url: objectPath,
          reference_number: reference.trim(),
          status: "pending",
        });

      if (insertError) throw insertError;

      setReference("");
      setFile(null);

      const input = document.getElementById(
        "receipt-file"
      ) as HTMLInputElement | null;

      if (input) input.value = "";

      setMessage(
        "Payment submitted successfully! Please wait for admin verification."
      );

      try {
        await refresh();
      } catch (refreshError) {
        console.error("Payment saved, but history refresh failed:", refreshError);
      }
    } catch (e: any) {
      console.error("PAYMENT SUBMISSION ERROR:", e);

      if (objectPath) {
        await client.storage.from(BUCKET).remove([objectPath]);
      }

      setError(
        e?.message ||
        e?.error_description ||
        e?.details ||
        "Payment submission failed."
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main style={styles.page}>Loading subscription...</main>;
  }

  const current = subscriptions.find(
    (s) =>
      s.status === "active" &&
      s.expires_at &&
      new Date(s.expires_at) > new Date()
  );

  const pending = payments.some((p) => p.status === "pending");

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <a href="/dashboard" style={styles.back}>
          ← Back to Dashboard
        </a>

        <h1 style={styles.title}>SOLE MARKET PH</h1>
        <p style={styles.subtitle}>Seller Subscription</p>

        {error && <div style={styles.error}>{error}</div>}
        {message && <div style={styles.success}>{message}</div>}

        <section style={styles.card}>
          <span style={styles.tag}>MONTHLY PLAN</span>
          <h2 style={styles.price}>₱{price.toFixed(2)}</h2>
          <p style={styles.muted}>per 30 days</p>

          <p style={styles.status}>
            Subscription Status:{" "}
            <strong style={{ color: current ? "#15803d" : "#dc2626" }}>
              {current ? "ACTIVE" : "INACTIVE"}
            </strong>
          </p>

          {current && (
            <p>
              Valid until:{" "}
              <strong>
                {new Date(current.expires_at).toLocaleString()}
              </strong>
            </p>
          )}

          <p>Payment submissions are manually verified by SOLE MARKET PH admin.</p>

          {!enabled && (
            <div style={styles.notice}>
              Subscription payments are currently disabled.
            </div>
          )}
        </section>

        {enabled && (
          <section style={styles.card}>
            <h2>Payment QR Codes</h2>
            <p style={styles.muted}>
              Scan the QR code for your selected payment method. Pay exactly
              ₱{price.toFixed(2)}.
            </p>

            <div style={styles.qrGrid}>
              {QR_IMAGES.map((img) => (
                <div key={img.name} style={styles.qrBox}>
                  <img
                    src={img.url}
                    alt={`${img.name} Payment QR`}
                    style={styles.qr}
                  />
                  <p style={styles.muted}>{img.name}</p>
                </div>
              ))}
            </div>

            <div style={styles.notice}>
              Submit your payment details and receipt below. Do not submit
              until your payment is complete. Your subscription activates
              only after admin approval.
            </div>

            <form onSubmit={submitPayment} style={{ marginTop: 20 }}>
              <label style={styles.label} htmlFor="payment-method">
                Select payment method
              </label>

              <select
                id="payment-method"
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                style={styles.input}
                required
              >
                <option value="GCash">GCash</option>
                <option value="BPI">BPI</option>
              </select>

              <label style={styles.label} htmlFor="reference">
                Payment reference number
              </label>

              <input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
                style={styles.input}
                placeholder="Enter reference number"
              />

              <label style={styles.label} htmlFor="receipt-file">
                Upload receipt / proof (JPG, PNG, WEBP, PDF; max 5 MB)
              </label>

              <input
                id="receipt-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                required
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={styles.input}
              />

              <button
                disabled={busy || pending}
                style={{
                  ...styles.button,
                  opacity: busy || pending ? 0.6 : 1,
                }}
              >
                {busy
                  ? "Submitting..."
                  : pending
                  ? "Payment Pending Review"
                  : "Submit Payment for Approval"}
              </button>

              {pending && (
                <p style={styles.muted}>
                  You already have a pending payment. Please wait for the
                  admin decision.
                </p>
              )}
            </form>
          </section>
        )}

        <section style={styles.card}>
          <h2>Payment History</h2>

          {payments.length === 0 ? (
            <p style={styles.muted}>No payments submitted yet.</p>
          ) : (
            payments.map((p) => (
              <div key={p.id} style={styles.historyItem}>
                <strong>
                  ₱{Number(p.amount).toFixed(2)} · {p.status.toUpperCase()}
                </strong>
                <p style={styles.muted}>
                  Method: {p.payment_method || "—"}
                </p>
                <p style={styles.muted}>
                  Reference: {p.reference_number || "—"} ·{" "}
                  {new Date(p.created_at).toLocaleString()}
                </p>
                {p.rejection_reason && (
                  <p style={styles.error}>
                    Reason: {p.rejection_reason}
                  </p>
                )}
              </div>
            ))
          )}
        </section>

        <section style={styles.card}>
          <h2>Subscription History</h2>

          {subscriptions.length === 0 ? (
            <p style={styles.muted}>No subscription history yet.</p>
          ) : (
            subscriptions.map((s) => (
              <div key={s.id} style={styles.historyItem}>
                <strong>{s.status.toUpperCase()}</strong>
                <p style={styles.muted}>
                  Started:{" "}
                  {s.started_at
                    ? new Date(s.started_at).toLocaleString()
                    : "—"}
                </p>
                <p style={styles.muted}>
                  Expires:{" "}
                  {s.expires_at
                    ? new Date(s.expires_at).toLocaleString()
                    : "—"}
                </p>
              </div>
            ))
          )}
        </section>

        <p style={styles.footer}>
          SOLE MARKET PH · Your Shoe Marketplace
        </p>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    fontFamily: "Inter, Arial, sans-serif",
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "32px 16px",
    color: "#172033",
  },
  container: { maxWidth: 760, margin: "0 auto" },
  back: {
    display: "inline-block",
    marginBottom: 24,
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 600,
  },
  title: { fontSize: 30, fontWeight: 800, margin: 0 },
  subtitle: { color: "#64748b", marginTop: 8, marginBottom: 28 },
  card: {
    background: "#fff",
    borderRadius: 18,
    padding: 28,
    marginBottom: 22,
    boxShadow: "0 5px 24px rgba(15,23,42,0.06)",
  },
  tag: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1,
  },
  price: { fontSize: 38, margin: "14px 0 0" },
  muted: { color: "#64748b" },
  status: { marginTop: 24, fontSize: 17 },
  notice: {
    background: "#eff6ff",
    borderRadius: 12,
    padding: 18,
    marginTop: 22,
    lineHeight: 1.6,
  },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    overflowWrap: "anywhere",
  },
  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
  },
  qrGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 18,
    marginTop: 20,
  },
  qrBox: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 14,
    textAlign: "center",
  },
  qr: {
    width: "100%",
    maxHeight: 260,
    height: "auto",
    objectFit: "contain",
  },
  label: { display: "block", fontWeight: 700, margin: "16px 0 7px" },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    padding: 12,
    background: "white",
  },
  button: {
    marginTop: 18,
    width: "100%",
    border: 0,
    borderRadius: 9,
    padding: 14,
    background: "#1769e0",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
  historyItem: {
    borderTop: "1px solid #e2e8f0",
    padding: "14px 0",
    overflowWrap: "anywhere",
  },
  footer: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 30,
  },
};
