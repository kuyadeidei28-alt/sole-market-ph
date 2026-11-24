"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [message,setMessage]=useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setMessage("Supabase is not configured. Follow the README setup steps."); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
  setMessage(error.message);
} else {
  router.push("/dashboard");
}
  }
  async function signup() {
    if (!supabase) { setMessage("Supabase is not configured. Follow the README setup steps."); return; }
    const { error } = await supabase.auth.signUp({ email, password });
    setMessage(error ? error.message : "Account created. Check your email if confirmation is enabled, then log in.");
  }
  return <><header className="top"><Link className="brand" href="/">SOLE MARKET PH</Link><nav><Link href="/">Marketplace</Link></nav></header>
    <main><section className="panel"><h1>Seller account</h1><p className="muted">Create an account or log in to submit shoe listings.</p>
      <form onSubmit={submit}><div className="field"><label>Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div className="field"><label>Password</label><input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} /></div>
      <button type="submit">Log in</button> <button type="button" className="secondary" onClick={signup}>Create account</button></form>
      {message && <p className="notice">{message}</p>}
    </section></main></>;
}
