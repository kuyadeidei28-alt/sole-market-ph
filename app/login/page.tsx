
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite");

    if (code) {
      setInviteCode(code.trim().toUpperCase());
    }
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
    } else {
      router.push("/dashboard");
    }
  }

  async function signup() {
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    if (!email.trim() || password.length < 6) {
      setMessage(
        "Enter a valid email and a password with at least 6 characters."
      );
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: inviteCode.trim()
          ? { referral_code: inviteCode.trim().toUpperCase() }
          : {},
      },
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Account created successfully! Check your email if confirmation is enabled, then log in."
      );
    }
  }

  return (
    <>
      <header className="top">
        <Link className="brand" href="/">
          SOLE MARKET PH
        </Link>

        <nav>
          <Link href="/">Marketplace</Link>
        </nav>
      </header>

      <main>
        <section className="panel">
          <h1>Seller account</h1>

          <p className="muted">
            Create an account or log in to submit shoe listings.
          </p>

          {inviteCode && (
            <p className="notice" role="status">
              Invitation code detected. Your referral code is pre-filled.
            </p>
          )}

          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="referralCode">
                Referral code (optional)
              </label>
              <input
                id="referralCode"
                type="text"
                autoComplete="off"
                placeholder="Enter a referral code if you have one"
                value={inviteCode}
                onChange={(e) =>
                  setInviteCode(e.target.value.toUpperCase())
                }
              />
              <small>
                You can register without a referral code.
              </small>
            </div>

            <button type="submit" disabled={busy}>
              {busy ? "Please wait..." : "Log in"}
            </button>{" "}

            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={signup}
            >
              {busy ? "Please wait..." : "Create account"}
            </button>
          </form>

          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
        </section>
      </main>
    </>
  );
}
