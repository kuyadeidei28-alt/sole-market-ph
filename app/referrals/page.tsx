
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Payout = {
  period_start: string;
  period_end: string;
  gross_commission: number;
  platform_fee_amount: number;
  net_amount: number;
  paid_at: string;
  gcash_reference: string;
};

type Summary = {
  referral_code: string;
  commission_rate: number;
  direct_referrals: number;
  approved_commission: number;
  paid_net_commission: number;
  payouts: Payout[];
};

const peso = (n: number) =>
  `₱${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function ReferralsPage() {
  const router = useRouter();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) {
      setError("Supabase connection unavailable.");
      setLoading(false);
      return;
    }

    const { data: auth, error: authError } =
      await supabase.auth.getUser();

    if (authError || !auth.user) {
      router.replace("/login");
      return;
    }

    const { data, error: rpcError } = await supabase.rpc(
      "get_my_referral_summary"
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSummary(data as Summary);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyLink() {
    if (!summary?.referral_code) return;

    const link =
      `${window.location.origin}/login?invite=${encodeURIComponent(
        summary.referral_code
      )}`;

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setError("");
    } catch {
      setError("Unable to copy automatically. Copy this link: " + link);
    }
  }

  if (loading) {
    return <main className="panel">Loading referral dashboard...</main>;
  }

  return (
    <>
      <header className="top">
        <Link className="brand" href="/">
          SOLE MARKET PH
        </Link>

        <nav>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/">Marketplace</Link>
        </nav>
      </header>

      <main>
        <section className="panel">
          <h1>My Referral Dashboard</h1>

          <p className="muted">
            Invite sellers if you want. There is no referral quota or obligation.
          </p>

          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}

          {summary && (
            <>
              <div className="card">
                <p className="muted">Your invitation code</p>

                <h2>{summary.referral_code}</h2>

                <button type="button" onClick={copyLink}>
                  {copied ? "Link copied!" : "Copy invitation link"}
                </button>

                <p className="muted">
                  Your current commission rate:{" "}
                  <strong>
                    {Number(summary.commission_rate).toFixed(2)}%
                  </strong>{" "}
                  (maximum 20%)
                </p>
              </div>

              <div className="grid">
                <div className="card">
                  <h3>Direct Referrals</h3>
                  <h2>{summary.direct_referrals}</h2>
                </div>

                <div className="card">
                  <h3>Approved Commission</h3>
                  <h2>{peso(summary.approved_commission)}</h2>
                </div>

                <div className="card">
                  <h3>Net Payouts Received</h3>
                  <h2>{peso(summary.paid_net_commission)}</h2>
                </div>
              </div>

              <div className="card">
                <h2>Referral Terms</h2>

                <p>
                  Commission is earned only on the first approved subscription
                  payment of a directly referred seller. The rate may be
                  reviewed every six months and adjusted prospectively,
                  up to a maximum of 20%.
                </p>

                <p>
                  A 10% platform service fee is deducted from accumulated
                  monthly referral commissions before payout. This is not
                  a deduction from product sales or subscription payments.
                </p>

                <p>
                  There is no minimum referral quota. Previously earned
                  commissions are not reduced by later rate changes.
                </p>
              </div>

              <div className="card">
                <h2>Payout History</h2>

                {summary.payouts?.length ? (
                  summary.payouts.map((p, i) => (
                    <div
                      key={`${p.period_start}-${i}`}
                      className="item"
                    >
                      <strong>
                        {p.period_start} to {p.period_end}
                      </strong>

                      <p>
                        Gross commission: {peso(p.gross_commission)}
                      </p>

                      <p>
                        10% service fee: −
                        {peso(p.platform_fee_amount)}
                      </p>

                      <p>
                        Net paid: <strong>{peso(p.net_amount)}</strong>
                      </p>

                      <p>GCash reference: {p.gcash_reference}</p>

                      <small className="muted">
                        Paid: {new Date(p.paid_at).toLocaleString()}
                      </small>
                    </div>
                  ))
                ) : (
                  <p className="muted">No payouts recorded yet.</p>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
