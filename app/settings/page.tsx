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

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) { setError("Supabase connection unavailable."); setLoading(false); return; }
      const { data: auth, error: authError } = await supabase.auth.getSession();
      if (authError || !auth.session?.user) { router.replace("/login"); return; }
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("display_name,location,bio,messenger_url")
        .eq("id", auth.user.id)
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
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.replace("/login"); return; }
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
      id: auth.user.id,
      display_name: displayName.trim() || null,
      location: location.trim() || null,
      bio: bio.trim() || null,
      messenger_url: messengerUrl.trim() || null
    }, { onConflict: "id" });
    if (saveError) setError(saveError.message);
    else setMessage("Seller profile saved successfully.");
    setSaving(false);
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
      </section>
    </main>
  </>;
}
