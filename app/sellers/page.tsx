"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Seller = {
  seller_id: string;
  display_name: string | null;
  location: string | null;
  bio: string | null;
  messenger_url: string | null;
  product_count: number;
  latest_listing: string | null;
};

export default function SellerDirectoryPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) { setError("Supabase connection unavailable."); setLoading(false); return; }
      const { data, error: rpcError } = await supabase.rpc("public_seller_directory");
      if (!alive) return;
      if (rpcError) setError(rpcError.message);
      else setSellers((data || []) as Seller[]);
      setLoading(false);
    }
    void load();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => sellers.filter(s =>
    `${s.display_name || ""} ${s.location || ""} ${s.bio || ""}`.toLowerCase().includes(query.toLowerCase())
  ), [sellers, query]);

  return <>
    <header className="top">
      <Link className="brand" href="/">SOLE MARKET PH</Link>
      <nav><Link href="/">Marketplace</Link><Link href="/login">Seller Login</Link><Link className="btn" href="/seller">Post a Product</Link></nav>
    </header>
    <main>
      <section className="hero">
        <h1>Find trusted marketplace sellers.</h1>
        <p>Browse sellers with approved shoe listings and contact them directly through Messenger.</p>
        <input aria-label="Search sellers" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search seller name, location, or store..." />
      </section>
      <h2>Seller Directory</h2>
      {error && <p className="notice" role="alert">{error}</p>}
      {loading ? <p>Loading sellers...</p> : filtered.length === 0 ? <section className="panel"><h3>No sellers found</h3><p className="muted">Sellers appear here after they have approved listings and complete their public profile.</p></section> :
        <div className="grid">
          {filtered.map(s => <article className="card" key={s.seller_id} style={{padding:20}}>
            <h2 style={{color:"#075CE5",marginTop:0}}>{s.display_name || "Marketplace Seller"}</h2>
            <p className="muted">📍 {s.location || "Location not provided"}</p>
            <p>{s.bio || "Seller on SOLE MARKET PH."}</p>
            <p><strong>{Number(s.product_count)} approved listings</strong></p>
            {s.latest_listing && <p className="muted">Latest listing: {new Date(s.latest_listing).toLocaleDateString()}</p>}
            {s.messenger_url ? <a className="btn" href={s.messenger_url} target="_blank" rel="noopener noreferrer">Message Seller</a> : <p className="muted">Messenger contact not provided.</p>}
          </article>)}
        </div>
      }
    </main>
  </>;
}
