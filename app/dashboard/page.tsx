"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      if (!supabase) {
        router.replace("/login");
        return;
      }

      const { data: { user }, error } =
        await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email || "");
      setLoading(false);
    }

    checkUser();
  }, [router]);

  async function logout() {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();

    if (!error) {
      router.replace("/");
    }
  }

  if (loading) {
    return <main className="panel">Loading dashboard...</main>;
  }

  return (
    <>
      <header className="top">
        <Link className="brand" href="/">
          SOLE MARKET PH
        </Link>

        <nav>
          <Link href="/">Marketplace</Link>
          <Link href="/dashboard">Dashboard</Link>
          <button className="btn" onClick={logout}>
            Logout
          </button>
        </nav>
      </header>

      <main>
        <section className="panel">
          <h1>Seller Dashboard</h1>
          <p className="muted">
            Welcome back, Seller!
          </p>
          <p>
            Logged in as: <strong>{email}</strong>
          </p>

          <div className="grid">
            <div className="card">
              <h2>My Products</h2>
              <p className="muted">
                Manage your shoe listings.
              </p>
              <Link className="btn" href="/my-products">
                Manage Products
              </Link>
            </div>

            <div className="card">
              <h2>Post a Product</h2>
              <p className="muted">
                Add a new product to the marketplace.
              </p>
              <Link className="btn" href="/seller">
                + Post a Product
              </Link>
            </div>

            

<div className="card">
  <h2>Subscription</h2>
  <p className="muted">
    Get full access to SOLE MARKET PH.
  </p>
  <h3>₱99 / month</h3>
  <Link className="btn" href="/subscription">
    SUBSCRIBE NOW
  </Link>
  <p>Yearly plan coming soon.</p>
</div>

<div className="card">
              <h2>Referral Dashboard</h2>
              <p className="muted">
                View your invitation link, direct referrals, and commissions.
              </p>
              <Link className="btn" href="/referrals">
                OPEN REFERRAL DASHBOARD
              </Link>
            </div>
</div>
</section>
</main>
</>
);
}

