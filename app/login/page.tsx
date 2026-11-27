
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
        data: inviteCode
          ? { referral_code: inviteCode }
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
              You joined through an invitation link!
            </p>
          )}

          <form onSubmit={submit}>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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
