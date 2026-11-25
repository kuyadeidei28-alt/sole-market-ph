
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
  const [qrError, setQrError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSubscription() {
      try {
        if (!supabase) {
          throw new Error("Supabase connection unavailable.");
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          window.location.href = "/login";
          return;
        }

        const { data: settings, error: settingsError } = await supabase
          .from("subscription_settings")
          .select("is_enabled, monthly_price")
          .eq("id", 1)
          .single();

        if (settingsError) {
          throw new Error(
            "Unable to load subscription settings. Please check the database access policies."
          );
        }

        if (!active) return;

        setEnabled(Boolean(settings.is_enabled));
        setPrice(Number(settings.monthly_price ?? 99));

        if (settings.is_enabled) {
          const results = await Promise.all(
            QR_FILES.map(async (name) => {
              const { data, error: imageError } = await supabase.storage
                .from(QR_BUCKET)
                .createSignedUrl(name, 3600);

              if (imageError || !data?.signedUrl) {
                console.error("QR IMAGE ERROR:", name, imageError);
                return {
                  name,
                  url: "",
                  error: imageError?.message || "Unable to create image URL.",
                };
              }

              return {
                name,
                url: data.signedUrl,
                error: "",
              };
            })
          );

          if (!active) return;

          const availableImages = results
            .filter((image) => image.url)
            .map(({ name, url }) => ({ name, url }));

          setQrImages(availableImages);

          const failedImages = results.filter((image) => image.error);

          if (failedImages.length > 0) {
            setQrError(
              `Unable to load: ${failedImages
                .map((image) => image.name)
                .join(", ")}. Please check the Storage bucket name and access policy.`
            );
          }
        }
      } catch (err) {
        console.error("SUBSCRIPTION ERROR:", err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong while loading the subscription page."
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
            <strong
              style={{
                color: enabled ? "#15803d" : "#dc2626",
              }}
            >
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
                Payment instructions are shown below. Please wait for
                the payment submission feature before sending money.
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

            {qrError && <div style={styles.warning}>{qrError}</div>}

            {qrImages.length === 0 ? (
              <p>
                QR images are currently unavailable. Please contact
                the administrator.
              </p>
            ) : (
              <div style={styles.qrGrid}>
                {qrImages.map((image) => (
                  <div key={image.name} style={styles.qrBox}>
                    <img
                      src={image.url}
                      alt={`Payment QR code ${image.name}`}
                      style={styles.qr}
                    />
                    <p style={styles.muted}>
                      {image.name.replace(/\.(jpg|png)$/i, "")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <p style={styles.footer}>
          SOLE MARKET PH · Your Shoe Marketplace
        </p>
      </div>
    </main>
  );
}

const styles: { [key: string]: CSSProperties } = {
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
  warning: {
    background: "#fff7ed",
    color: "#9a3412",
    padding: "12px",
    borderRadius: "10px",
    marginTop: "16px",
  },
  qrGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
    marginTop: "20px",
  },
  qrBox: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "14px",
    textAlign: "center",
  },
  qr: {
    width: "100%",
    maxWidth: "260px",
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
