"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    if (!supabase) {
      setMessage("Supabase connection is unavailable.");
      setLoading(false);
      return;
    }

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      router.replace("/login");
      return;
    }

    const { data: adminResult, error: adminError } =
      await supabase.rpc("is_sole_market_admin");

    if (adminError || adminResult !== true) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const { data: settings, error: settingsError } =
      await supabase
        .from("subscription_settings")
        .select("is_enabled, monthly_price")
        .eq("id", 1)
        .single();

    if (settingsError) {
      setMessage(settingsError.message);
    } else {
      setEnabled(settings.is_enabled);
    }

    const { data: paymentData, error: paymentError } =
      await supabase
        .from("subscription_payments")
        .select("*")
        .order("created_at", { ascending: false });

    if (paymentError) {
      setMessage(paymentError.message);
    } else {
      setPayments(paymentData || []);
    }

    const { data: subscriptionData, error: subscriptionError } =
      await supabase
        .from("seller_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

    if (subscriptionError) {
      setMessage(subscriptionError.message);
    } else {
      setSubscriptions(subscriptionData || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function toggleSubscription() {
    if (!supabase) return;

    const confirmed = window.confirm(
      enabled
        ? "Turn OFF seller subscriptions?"
        : "Turn ON seller subscriptions? Sellers may now be asked to pay."
    );

    if (!confirmed) return;

    setBusy("settings");
    setMessage("");

    const { error } = await supabase
      .from("subscription_settings")
      .update({ is_enabled: !enabled, updated_at: new Date().toISOString() })
      .eq("id", 1);

    if (error) {
      setMessage(error.message);
    } else {
      setEnabled(!enabled);
      setMessage("Subscription setting updated.");
    }

    setBusy("");
  }

  async function approvePayment(payment: any) {
    if (!supabase || !enabled) return;

    const confirmed = window.confirm(
      "Approve this payment and activate one month of subscription?"
    );

    if (!confirmed) return;

    setBusy(payment.id);
    setMessage("");

    const start = new Date();
    const expiry = new Date(start);
    expiry.setMonth(expiry.getMonth() + 1);

    const { data: newSubscription, error: insertError } =
      await supabase
        .from("seller_subscriptions")
        .insert({
          seller_id: payment.seller_id,
          status: "active",
          started_at: start.toISOString(),
          expires_at: expiry.toISOString(),
        })
        .select("id")
        .single();

    if (insertError || !newSubscription) {
      setMessage(insertError?.message || "Could not create subscription.");
      setBusy("");
      return;
    }

    const { error: updateError } = await supabase
      .from("subscription_payments")
      .update({
        status: "approved",
        subscription_id: newSubscription.id,
      })
      .eq("id", payment.id)
      .eq("status", "pending");

    if (updateError) {
      setMessage(
        "Subscription was created, but payment update failed: " +
          updateError.message
      );
    } else {
      setMessage("Payment approved. Subscription activated for one month.");
    }

    await loadData();
    setBusy("");
  }

  async function rejectPayment(payment: any) {
    if (!supabase) return;

    const confirmed = window.confirm("Reject this payment submission?");
    if (!confirmed) return;

    setBusy(payment.id);
    setMessage("");

    const { error } = await supabase
      .from("subscription_payments")
      .update({ status: "rejected" })
      .eq("id", payment.id)
      .eq("status", "pending");

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Payment rejected.");
    }

    await loadData();
    setBusy("");
  }

  if (loading) {
    return <main style={{ padding: 30 }}>Loading admin dashboard...</main>;
  }

  if (!isAdmin) {
    return (
      <main style={{ padding: 30 }}>
        <h1>Access Denied</h1>
        <p>This page is for the SOLE MARKET PH admin only.</p>
        <Link href="/dashboard">Back to Dashboard</Link>
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
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f6fb",
        padding: "24px",
        color: "#172033",
      }}
    >
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>SOLE MARKET PH</h1>
            <p style={{ color: "#64748b" }}>Admin Dashboard</p>
          </div>
          <Link href="/dashboard">Seller Dashboard</Link>
        </header>

        {message && (
          <p
            style={{
              background: "#e8f1ff",
              padding: 12,
              borderRadius: 8,
              overflowWrap: "anywhere",
            }}
          >
            {message}
          </p>
        )}

        <section
          style={{
            background: "white",
            padding: 20,
            borderRadius: 14,
            marginTop: 20,
            boxShadow: "0 2px 10px #0000000a",
          }}
        >
          <h2>Subscription Control</h2>
          <p>
            Monthly Plan: <strong>₱99 / month</strong>
          </p>
          <p>
            Status:{" "}
            <strong style={{ color: enabled ? "green" : "#dc2626" }}>
              {enabled ? "ON" : "OFF"}
            </strong>
          </p>
          <button
            onClick={toggleSubscription}
            disabled={busy === "settings"}
            style={{
              padding: "12px 20px",
              border: 0,
              borderRadius: 8,
              background: enabled ? "#dc2626" : "#1677e8",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {busy === "settings"
              ? "Updating..."
              : enabled
                ? "Turn OFF Subscription"
                : "Turn ON Subscription"}
          </button>
          {!enabled && (
            <p style={{ color: "#64748b" }}>
              Subscription is currently disabled. Sellers remain free.
            </p>
          )}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginTop: 20,
          }}
        >
          <div style={{ background: "white", padding: 20, borderRadius: 12 }}>
            <p>Pending Payments</p>
            <h2>{pendingPayments.length}</h2>
          </div>
          <div style={{ background: "white", padding: 20, borderRadius: 12 }}>
            <p>Active Subscriptions</p>
            <h2>{activeSubscriptions.length}</h2>
          </div>
          <div style={{ background: "white", padding: 20, borderRadius: 12 }}>
            <p>Total Payments</p>
            <h2>{payments.length}</h2>
          </div>
        </section>

        <section
          style={{
            background: "white",
            padding: 20,
            borderRadius: 14,
            marginTop: 20,
            overflowX: "auto",
          }}
        >
          <h2>Payment Submissions</h2>

          {payments.length === 0 ? (
            <p>No payment submissions yet.</p>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                style={{
                  borderTop: "1px solid #e5e7eb",
                  padding: "16px 0",
                  overflowWrap: "anywhere",
                }}
              >
                <p>
                  <strong>Seller ID:</strong> {payment.seller_id}
                </p>
                <p>
                  <strong>Method:</strong> {payment.payment_method}
                </p>
                <p>
                  <strong>Amount:</strong> ₱{payment.amount}
                </p>
                <p>
                  <strong>Status:</strong> {payment.status}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(payment.created_at).toLocaleString()}
                </p>

                {payment.proof_url && (
                  <p>
                    <a
                      href={payment.proof_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Payment Proof
                    </a>
                  </p>
                )}

                {payment.status === "pending" && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={() => approvePayment(payment)}
                      disabled={!enabled || busy === payment.id}
                      style={{
                        padding: "10px 16px",
                        background: "#16834a",
                        color: "white",
                        border: 0,
                        borderRadius: 7,
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectPayment(payment)}
                      disabled={busy === payment.id}
                      style={{
                        padding: "10px 16px",
                        background: "#dc2626",
                        color: "white",
                        border: 0,
                        borderRadius: 7,
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        <section
          style={{
            background: "white",
            padding: 20,
            borderRadius: 14,
            marginTop: 20,
            overflowX: "auto",
          }}
        >
          <h2>Seller Subscriptions</h2>

          {subscriptions.length === 0 ? (
            <p>No subscriptions yet.</p>
          ) : (
            subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                style={{
                  borderTop: "1px solid #e5e7eb",
                  padding: "14px 0",
                  overflowWrap: "anywhere",
                }}
              >
                <p><strong>Seller ID:</strong> {subscription.seller_id}</p>
                <p><strong>Status:</strong> {subscription.status}</p>
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
      </div>
    </main>
  );
}

