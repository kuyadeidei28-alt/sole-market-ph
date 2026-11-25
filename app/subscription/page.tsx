
"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type QRImage = {
  name: string;
  url: string;
};

const QR_BUCKET = "subscription-qr.";
const QR_FILES = ["1000057693.jpg", "1000057695.png"];

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [price, setPrice] = useState(99);
  const [qrImages, setQrImages] = useState<QRImage[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSubscription() {
      const client = supabase;

      if (!client) {
        setError("Supabase connection unavailable.");
        setLoading(false);
        return;
      }

      try {
        const { data: userData, error: userError } =
          await client.auth.getUser();

        if (userError || !userData.user) {
          window.location.href = "/login";
          return;
        }

        const { data: settings, error: settingsError } =
          await client
            .from("subscription_settings")
            .select("is_enabled, monthly_price")
            .eq("id", 1)
            .single();

        if (settingsError) throw settingsError;

        if (!active) return;

        setEnabled(Boolean(settings.is_enabled));
        setPrice(Number(settings.monthly_price ?? 99));

        if (settings.is_enabled) {
          const images = QR_FILES.map((name) => {
            const { data } = client.storage
              .from(QR_BUCKET)
              .getPublicUrl(name);

            return {
              name,
              url: data.publicUrl,
            };
          });

          if (active) setQrImages(images);
        }
      } catch (err) {
        console.error("SUBSCRIPTION ERROR:", err);
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load subscription."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSubscription();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <main style={styles.page}>
        <p>Loading subscription...</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <a href="/dashboard" style={styles.back}>
          ← Back to Dashboard
        </a>

        <h1 style={styles.title}>SOLE MARKET PH</h1>
        <p style={styles.subtitle}>Seller Subscription</p>

        {error && <div style={styles.error}>{error}</div>}

        <section style={styles.card}>
          <span style={styles.tag}>MONTHLY PLAN</span>
          <h2 style={styles.price}>₱{price.toFixed(2)}</h2>
          <p style={styles.muted}>per month</p>

          <div style={styles.status}>
            Subscription Status:{" "}
            <strong style={{ color: enabled ? "#15803d" : "#dc2626" }}>
              {enabled ? "ON" : "OFF"}
            </strong>
          </div>

          {!enabled ? (
            <div style={styles.notice}>
              <h3>Subscription is currently disabled.</h3>
              <p>
                Sellers can continue using SOLE MARKET PH for free.
                No payment is required while subscription is OFF.
              </p>
            </div>
          ) : (
            <div style={styles.notice}>
              <h3>Subscription is now available.</h3>
              <p>
                Please wait for the payment submission feature
                before sending money.
              </p>
            </div>
          )}
        </section>

        {enabled && (
          <section style={styles.card}>
            <h2>Payment QR Codes</h2>
            <p style={styles.muted}>
              Scan the available QR code using your payment app.
            </p>

            {qrImages.map((image) => (
              <div key={image.name} style={styles.qrBox}>
                <img
                  src={image.url}
                  alt={`Payment QR ${image.name}`}
                  style={styles.qr}
                />
                <p style={styles.muted}>{image.name}</p>
              </div>
            ))}
          </section>
        )}

        <p style={styles.footer}>
          SOLE MARKET PH · Your Shoe Marketplace
        </p>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "32px 16px",
    color: "#172033",
  },
  container: {
    maxWidth: "760px",
    margin: "0 auto",
  },
  back: {
    display: "inline-block",
    marginBottom: "24px",
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 600,
  },
  title: {
    fontSize: "30px",
    fontWeight: 800,
    margin: 0,
  },
  subtitle: {
    color: "#64748b",
    marginTop: "8px",
    marginBottom: "28px",
  },
  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "28px",
    marginBottom: "22px",
    boxShadow: "0 5px 24px rgba(15,23,42,0.06)",
  },
  tag: {
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "1px",
  },
  price: {
    fontSize: "38px",
    margin: "14px 0 0",
  },
  muted: {
    color: "#64748b",
  },
  status: {
    marginTop: "24px",
    fontSize: "17px",
  },
  notice: {
    background: "#eff6ff",
    borderRadius: "12px",
    padding: "18px",
    marginTop: "22px",
    lineHeight: 1.6,
  },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "20px",
  },
  qrBox: {
    display: "inline-block",
    verticalAlign: "top",
    width: "min(100%, 280px)",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "14px",
    margin: "12px 12px 0 0",
    textAlign: "center",
  },
  qr: {
    width: "100%",
    height: "auto",
    objectFit: "contain",
  },
  footer: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "13px",
    marginTop: "30px",
  },
};
