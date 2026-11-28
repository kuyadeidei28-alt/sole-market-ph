"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SupportPage() {
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [subject,setSubject]=useState("General support");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!supabase){setError("Support is temporarily unavailable. Please try again later.");return;}
    setBusy(true);setError("");setNotice("");
    const {data:auth}=await supabase.auth.getUser();
    const {error:submitError}=await supabase.from("support_requests").insert({
      user_id:auth.user?.id||null,
      name:name.trim(),email:email.trim(),subject,message:message.trim()
    });
    if(submitError) setError("We could not send your message. Please try again later.");
    else {setNotice("Your support request has been submitted. Keep your email available in case our team needs to follow up.");setName("");setEmail("");setSubject("General support");setMessage("");}
    setBusy(false);
  }

  return <>
    <header className="top"><Link className="brand" href="/">SOLE MARKET PH</Link><nav><Link href="/">Marketplace</Link><Link href="/privacy">Privacy</Link></nav></header>
    <main><section className="panel" style={{maxWidth:720}}>
      <h1>SOLE MARKET PH Support</h1>
      <p className="muted">Contact the marketplace management team about listings, accounts, seller verification, subscriptions, privacy or safety concerns.</p>
      {notice&&<p className="notice" role="status">{notice}</p>}
      {error&&<p className="notice" role="alert">{error}</p>}
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="support-name">Name</label><input id="support-name" required maxLength={100} value={name} onChange={e=>setName(e.target.value)} /></div>
        <div className="field"><label htmlFor="support-email">Email for reply</label><input id="support-email" type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="support-subject">Topic</label><select id="support-subject" value={subject} onChange={e=>setSubject(e.target.value)}><option>General support</option><option>Report or safety concern</option><option>Privacy or personal data request</option><option>Account deletion</option><option>Seller verification</option><option>Subscription or payment</option><option>Listing issue</option></select></div>
        <div className="field"><label htmlFor="support-message">Message</label><textarea id="support-message" required minLength={10} maxLength={3000} rows={6} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell us how we can help..." /></div>
        <button type="submit" disabled={busy}>{busy?"Sending...":"Send Support Request"}</button>
      </form>
      <p className="muted" style={{marginTop:18}}>Do not include passwords, one-time codes, full card numbers or unnecessary identity documents in a support message. See our <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Use</Link>.</p>
    </section></main>
  </>;
}
