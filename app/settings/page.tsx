"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SellerSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [messengerUrl, setMessengerUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deletionMessage, setDeletionMessage] = useState("");
  const [deletionBusy, setDeletionBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) { setError("Supabase connection unavailable."); setLoading(false); return; }
      const { data: auth, error: authError } = await supabase.auth.getSession();
      if (authError || !auth.session?.user) { router.replace("/login"); return; }
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("display_name,location,bio,messenger_url")
        .eq("id", auth.session?.user.id)
        .maybeSingle();
      if (!alive) return;
      if (profileError) setError(profileError.message);
      if (data) {
        setDisplayName(data.display_name || "");
        setLocation(data.location || "");
        setBio(data.bio || "");
        setMessengerUrl(data.messenger_url || "");
      }
      setLoading(false);
    }
    void load();
    return () => { alive = false; };
  }, [router]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session?.user) { router.replace("/login"); return; }
    if (messengerUrl.trim()) {
      try {
        const url = new URL(messengerUrl.trim());
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        setError("Enter a valid Messenger URL beginning with https://");
        return;
      }
    }
    setSaving(true); setError(""); setMessage("");
    const { error: saveError } = await supabase.from("profiles").upsert({
      id: auth.session?.user.id,
      display_name: displayName.trim() || null,
      location: location.trim() || null,
      bio: bio.trim() || null,
      messenger_url: messengerUrl.trim() || null
    }, { onConflict: "id" });
    if (saveError) setError(saveError.message);
    else setMessage("Seller profile saved successfully.");
    setSaving(false);
  }

  async function requestAccountDeletion() {
    if (!supabase || deletionBusy) return;
    const confirmed = window.confirm("Submit an account deletion request? Our team will review it and delete your account and eligible associated data. Some records may be retained where legally required.");
    if (!confirmed) return;
    setDeletionBusy(true); setDeletionMessage(""); setError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.replace("/login"); setDeletionBusy(false); return; }
    const { error: requestError } = await supabase.from("account_deletion_requests").insert({
      user_id: auth.user.id,
      user_email: auth.user.email || null,
      reason: "User requested account deletion from Account Settings",
      status: "pending"
    });
    if (requestError) {
      setError(requestError.code === "23505" ? "You already have an open account deletion request." : "Unable to submit the request. Please contact Support.");
    } else {
      setDeletionMessage("Your account deletion request has been submitted. Our team will review it and process deletion of your account and eligible associated data. You may continue using your account until the request is completed.");
    }
    setDeletionBusy(false);
  }

  if (loading) return <main className="panel">Loading seller profile...</main>;

  return <>
    <header className="top">
      <Link className="brand" href="/">SOLE MARKET PH</Link>
      <nav><Link href="/dashboard">Dashboard</Link><Link href="/sellers">Seller Directory</Link></nav>
    </header>
    <main>
      <section className="panel">
        <h1>Seller Profile Settings</h1>
        <p className="muted">These details appear in the public seller directory. Do not include private information.</p>
        {error && <p className="notice" role="alert">{error}</p>}
        {message && <p className="notice" role="status">{message}</p>}
        <form onSubmit={save}>
          <div className="field"><label htmlFor="display-name">Store / Seller Name</label><input id="display-name" maxLength={80} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your store name" /></div>
          <div className="field"><label htmlFor="location">Location</label><input id="location" maxLength={120} value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Malolos, Bulacan" /></div>
          <div className="field"><label htmlFor="messenger">Messenger Link</label><input id="messenger" type="url" maxLength={500} value={messengerUrl} onChange={e=>setMessengerUrl(e.target.value)} placeholder="https://m.me/yourpage" /></div>
          <div className="field"><label htmlFor="bio">About Your Store</label><textarea id="bio" rows={5} maxLength={500} value={bio} onChange={e=>setBio(e.target.value)} placeholder="Tell buyers about your store..." /></div>
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button>
        </form>
        <section style={{ marginTop: 28, paddingTop: 22, borderTop: "1px solid #e7ebf2" }} aria-labelledby="delete-account-heading">
          <h2 id="delete-account-heading">Account Deletion</h2>
          <p className="muted">You can request deletion of your SOLE MARKET PH account and associated personal information here. Requests are reviewed by management. Information required for legal, accounting, security or dispute-resolution purposes may be retained.</p>
          {deletionMessage && <p className="notice" role="status">{deletionMessage}</p>}
          <button type="button" disabled={deletionBusy} onClick={requestAccountDeletion} style={{ background: "#b42318", borderColor: "#b42318" }}>{deletionBusy ? "Submitting..." : "Request Account Deletion"}</button>
          <p className="muted" style={{ marginTop: 10 }}>For questions about this request, visit <Link href="/support">Support</Link> or review our <Link href="/privacy">Privacy Policy</Link>.</p>
        </section>
      </section>
    </main>
  </>;
}
