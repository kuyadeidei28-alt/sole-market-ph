

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Partner = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  referral_code: string | null;
  commission_rate: number;
  direct_referrals: number;
  approved_commission: number;
  paid_net_commission: number;
  referral_rate_reviewed_at: string | null;
};

export default function AdminReferralsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [rates, setRates] = useState<Record<string, string>>({});
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [references, setReferences] = useState<Record<string, string>>({});
  const [initialInviteUrl, setInitialInviteUrl] = useState("");

  const loadData = useCallback(async () => {
    const client = supabase;

    if (!client) {
      setError("Supabase connection is unavailable.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

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
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const { data, error: partnersError } =
      await client.rpc("admin_list_referral_partners");

    if (partnersError) {
      setError(partnersError.message);
    } else {
      const rows = (data || []) as Partner[];
      setPartners(rows);

      const initialRates: Record<string, string> = {};
      rows.forEach((partner) => {
        initialRates[partner.user_id] =
          String(partner.commission_rate);
      });

      setRates(initialRates);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function makeInviteUrl(token: string) {
    return `${window.location.origin}/login?invite=${encodeURIComponent(token)}`;
  }

  async function copyInviteUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Invitation link copied. You can now share it.");
      setError("");
    } catch {
      setError("Unable to copy automatically. Please select and copy the invitation link.");
    }
  }

  async function createInitialInvite() {
    const client = supabase;
    if (!client) return;

    if (!window.confirm("Create the initial invitation link for your first referral partner?")) {
      return;
    }

    setBusy("initial-invite");
    setError("");
    setMessage("");

    const { data, error: rpcError } = await client.rpc("admin_create_referral_invite");

    if (rpcError) {
      setError(rpcError.message);
    } else if (typeof data !== "string" || !data) {
      setError("The invitation was created, but no token was returned. Refresh and check before creating another.");
    } else {
      const url = makeInviteUrl(data);
      setInitialInviteUrl(url);
      setMessage("Initial invitation link created successfully.");
    }

    setBusy("");
  }

  async function issuePartnerInvite(partner: Partner) {
    const client = supabase;
    if (!client) return;

    const partnerName = partner.display_name || partner.email || "this seller";
    if (!window.confirm(`Enable referral privileges and create an invitation link for ${partnerName}?`)) {
      return;
    }

    setBusy(partner.user_id);
    setError("");
    setMessage("");

    const { data, error: rpcError } = await client.rpc(
      "admin_issue_partner_invite",
      { p_referrer_id: partner.user_id }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else if (typeof data !== "string" || !data) {
      setError("The invitation was created, but no token was returned. Refresh and check before creating another.");
    } else {
      const url = makeInviteUrl(data);
      setMessage(`Invitation link created for ${partnerName}.`);
      await copyInviteUrl(url);
      await loadData();
    }

    setBusy("");
  }

  async function updateRate(partner: Partner) {
    const client = supabase;
    if (!client) return;

    const rate = Number(rates[partner.user_id]);

    if (!Number.isFinite(rate) || rate < 0 || rate > 20) {
      setError("Commission rate must be between 0% and 20%.");
      return;
    }

    if (
      !window.confirm(
        `Set ${partner.display_name || partner.email}'s commission rate to ${rate}%?`
      )
    ) return;

    setBusy(partner.user_id);
    setError("");
    setMessage("");

    const { error: rpcError } = await client.rpc(
      "admin_set_referral_rate",
      {
        p_referrer_id: partner.user_id,
        p_rate: rate,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setMessage("Referral commission rate updated successfully.");
      await loadData();
    }

    setBusy("");
  }

  async function markPaid(partner: Partner) {
    const client = supabase;
    if (!client) return;

    if (!periodStart || !periodEnd) {
      setError("Please select the payout period.");
      return;
    }

    if (periodEnd < periodStart) {
      setError("Payout end date cannot be earlier than start date.");
      return;
    }

    const reference = (references[partner.user_id] || "").trim();

    if (!reference) {
      setError("Please enter the GCash reference number.");
      return;
    }

    if (Number(partner.approved_commission) <= 0) {
      setError("This partner has no approved commission to pay.");
      return;
    }

    if (
      !window.confirm(
        `Process payout for ${partner.display_name || partner.email}?\n\nThe system will calculate the 10% platform fee from eligible commissions in the selected period.`
      )
    ) return;

    setBusy(partner.user_id);
    setError("");
    setMessage("");

    const { error: rpcError } = await client.rpc(
      "admin_mark_referral_period_paid",
      {
        p_referrer_id: partner.user_id,
        p_period_start: periodStart,
        p_period_end: periodEnd,
        p_gcash_reference: reference,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setMessage("Referral payout successfully recorded.");
      setReferences((prev) => ({
        ...prev,
        [partner.user_id]: "",
      }));
      await loadData();
    }

    setBusy("");
  }

  if (loading) {
    return (
      <main style={styles.page}>
        Loading referral management...
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <h1>Access Denied</h1>
          <p>This page is for SOLE MARKET PH admin only.</p>
          <Link href="/admin">Back to Admin Dashboard</Link>
        </div>
      </main>
    );
  }

  const totalPartners = partners.length;

  const totalReferrals = partners.reduce(
    (sum, p) => sum + Number(p.direct_referrals || 0),
    0
  );

  const totalApproved = partners.reduce(
    (sum, p) => sum + Number(p.approved_commission || 0),
    0
  );

  const totalPaid = partners.reduce(
    (sum, p) => sum + Number(p.paid_net_commission || 0),
    0
  );

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>SOLE MARKET PH</h1>
            <p style={styles.muted}>
              Admin Referral Management
            </p>
          </div>

          <div style={styles.actions}>
            <button
              style={styles.secondaryButton}
              onClick={() => void loadData()}
              disabled={busy !== ""}
            >
              Refresh
            </button>

            <Link href="/admin">Admin Dashboard</Link>
          </div>
        </header>

        {error && (
          <div style={styles.error}>{error}</div>
        )}

        {message && (
          <div style={styles.success}>{message}</div>
        )}

        <section style={styles.stats}>
          <div style={styles.stat}>
            <p>Total Partners</p>
            <h2>{totalPartners}</h2>
          </div>

          <div style={styles.stat}>
            <p>Direct Referrals</p>
            <h2>{totalReferrals}</h2>
          </div>

          <div style={styles.stat}>
            <p>Approved Commissions</p>
            <h2>₱{totalApproved.toFixed(2)}</h2>
          </div>

          <div style={styles.stat}>
            <p>Net Paid Commissions</p>
            <h2>₱{totalPaid.toFixed(2)}</h2>
          </div>
        </section>

        <section style={styles.card}>
          <h2>Referral Program Rules</h2>
          <p>Maximum commission rate: <strong>20%</strong></p>
          <p>Rate review: <strong>Every 6 months</strong></p>
          <p>Platform service fee: <strong>10% of referral commissions</strong></p>
          <p>Commission: <strong>First approved subscription payment only</strong></p>
          <p>Referral type: <strong>Direct referrals only</strong></p>
          <p>Registration: <strong>Free; referral code is optional</strong></p>
          <p style={styles.muted}>
            Rate changes apply prospectively. Previously earned
            commissions are not recalculated.
          </p>
        </section>

        <section style={styles.card}>
          <h2>Referral Partners</h2>

          <div style={styles.invitePanel}>
            <p>
              <strong>Initial Partner Invitation</strong>
            </p>
            <p style={styles.muted}>
              Create this link for your first invited partner. The person who signs up
              through it becomes eligible to invite their own direct referrals.
            </p>
            <button
              style={styles.button}
              disabled={busy !== ""}
              onClick={() => void createInitialInvite()}
            >
              {busy === "initial-invite" ? "Creating..." : "Create Initial Invitation Link"}
            </button>
            {initialInviteUrl && (
              <div style={styles.inviteLinkBox}>
                <input
                  type="text"
                  readOnly
                  value={initialInviteUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  style={styles.input}
                />
                <button
                  style={styles.secondaryButton}
                  onClick={() => void copyInviteUrl(initialInviteUrl)}
                >
                  Copy Link
                </button>
              </div>
            )}
          </div>

          {partners.length === 0 ? (
            <p>No referral partners found.</p>
          ) : (
            partners.map((partner) => (
              <article
                key={partner.user_id}
                style={styles.partner}
              >
                <h3>
                  {partner.display_name || "Unnamed Partner"}
                </h3>

                <p>{partner.email || "No email"}</p>

                <p>
                  <strong>Invitation Link:</strong>{" "}
                  {partner.referral_code
                    ? `${typeof window !== "undefined" ? window.location.origin : ""}/login?invite=${encodeURIComponent(partner.referral_code)}`
                    : "Not assigned"}
                </p>
                {partner.referral_code && (
                  <button
                    style={styles.secondaryButton}
                    onClick={() =>
                      void copyInviteUrl(makeInviteUrl(partner.referral_code!))
                    }
                  >
                    Copy Invitation Link
                  </button>
                )}
                <button
                  style={{ ...styles.button, marginTop: 10 }}
                  disabled={busy !== ""}
                  onClick={() => void issuePartnerInvite(partner)}
                >
                  {busy === partner.user_id
                    ? "Creating..."
                    : "Issue / Renew Invitation Link"}
                </button>

                <p>
                  <strong>Direct Referrals:</strong>{" "}
                  {partner.direct_referrals}
                </p>

                <p>
                  <strong>Approved Commission:</strong>{" "}
                  ₱{Number(partner.approved_commission).toFixed(2)}
                </p>

                <p>
                  <strong>Net Paid Commission:</strong>{" "}
                  ₱{Number(partner.paid_net_commission).toFixed(2)}
                </p>

                <p>
                  <strong>Last Rate Review:</strong>{" "}
                  {partner.referral_rate_reviewed_at
                    ? new Date(
                        partner.referral_rate_reviewed_at
                      ).toLocaleDateString()
                    : "Not yet reviewed"}
                </p>

                <div style={styles.rateRow}>
                  <label>
                    Commission Rate (%)
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={rates[partner.user_id] ?? ""}
                      onChange={(e) =>
                        setRates((prev) => ({
                          ...prev,
                          [partner.user_id]: e.target.value,
                        }))
                      }
                      style={styles.input}
                    />
                  </label>

                  <button
                    style={styles.button}
                    disabled={busy !== ""}
                    onClick={() => void updateRate(partner)}
                  >
                    {busy === partner.user_id
                      ? "Saving..."
                      : "Update Rate"}
                  </button>
                </div>

                <div style={styles.payout}>
                  <h4>Record GCash Payout</h4>

                  <p>
                    Select the period covered by this payout.
                  </p>

                  <div style={styles.rateRow}>
                    <label>
                      Period Start
                      <input
                        type="date"
                        value={periodStart}
                        onChange={(e) =>
                          setPeriodStart(e.target.value)
                        }
                        style={styles.input}
                      />
                    </label>

                    <label>
                      Period End
                      <input
                        type="date"
                        value={periodEnd}
                        onChange={(e) =>
                          setPeriodEnd(e.target.value)
                        }
                        style={styles.input}
                      />
                    </label>
                  </div>

                  <label>
                    GCash Reference Number
                    <input
                      type="text"
                      placeholder="Enter GCash reference"
                      value={references[partner.user_id] || ""}
                      onChange={(e) =>
                        setReferences((prev) => ({
                          ...prev,
                          [partner.user_id]: e.target.value,
                        }))
                      }
                      style={styles.input}
                    />
                  </label>

                  <button
                    style={styles.payButton}
                    disabled={busy !== ""}
                    onClick={() => void markPaid(partner)}
                  >
                    {busy === partner.user_id
                      ? "Processing..."
                      : "Mark Selected Period as Paid"}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>

        <footer style={styles.footer}>
          SOLE MARKET PH · Referral Administration
        </footer>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4f6fb",
    padding: 24,
    color: "#172033",
  },
  container: {
    maxWidth: 1100,
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
    fontSize: 13,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
    gap: 14,
    marginTop: 20,
  },
  stat: {
    background: "white",
    padding: 18,
    borderRadius: 12,
    boxShadow: "0 2px 10px #0000000a",
  },
  card: {
    background: "white",
    padding: 20,
    borderRadius: 14,
    marginTop: 20,
    boxShadow: "0 2px 10px #0000000a",
  },
  partner: {
    borderTop: "1px solid #e5e7eb",
    padding: "20px 0",
    overflowWrap: "anywhere",
  },
  invitePanel: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 10,
    padding: 16,
    marginTop: 14,
    marginBottom: 18,
  },
  inviteLinkBox: {
    display: "flex",
    alignItems: "end",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  rateRow: {
    display: "flex",
    alignItems: "end",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  input: {
    display: "block",
    width: "100%",
    maxWidth: 300,
    padding: 10,
    marginTop: 6,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 14,
  },
  button: {
    background: "#1677e8",
    color: "white",
    border: 0,
    borderRadius: 8,
    padding: "11px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    background: "#e2e8f0",
    color: "#172033",
    border: 0,
    borderRadius: 8,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  payout: {
    background: "#f8fafc",
    padding: 16,
    borderRadius: 10,
    marginTop: 20,
  },
  payButton: {
    background: "#16834a",
    color: "white",
    border: 0,
    borderRadius: 8,
    padding: "11px 16px",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 14,
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
  footer: {
    textAlign: "center",
    color: "#64748b",
    padding: 30,
    fontSize: 13,
  },
};
