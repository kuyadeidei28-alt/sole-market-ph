"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string; title: string; brand: string | null; category: string | null;
  size: string | null; price: number; description: string | null;
  image_url: string | null; messenger_url: string; seller_name: string | null;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data } = await supabase.from("products").select("*").eq("status", "approved").order("created_at", { ascending: false });
      setProducts((data || []) as Product[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => products.filter(p => {
    const matchesText = `${p.title} ${p.brand || ""} ${p.description || ""}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "All" || p.category === category;
    return matchesText && matchesCategory;
  }), [products, query, category]);

  return <>
    <header className="top">
      <Link className="brand" href="/">SOLE MARKET PH</Link>
      <nav><Link href="/">Marketplace</Link><Link href="/login">Seller Login</Link><Link className="btn" href="/seller">Post a Product</Link></nav>
    </header>
    <main>
      <section className="hero">
        <h1>Find your next pair.</h1>
        <p>Discover shoes from sellers around the Philippines. Browse listings and contact sellers directly through Messenger.</p>
        <div className="searchrow">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search brand, shoe name, or keyword..." />
          <button
  className="btn"
  type="button"
  onClick={() =>
    document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" })
  }
>
  Search
</button>

        </div>
      </section>
    <h2 id="listings">Latest shoe listings</h2>
      <div className="toolbar">
        <span className="muted">Category</span>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option>All</option><option>Sneakers</option><option>Running</option><option>Casual</option><option>Formal</option><option>Sandals</option><option>Others</option>
        </select>
        <span className="muted">{filtered.length} listings</span>
      </div>
      {!supabase && <div className="notice">Connect your Supabase project by creating a .env.local file. See README.md for setup instructions.</div>}
      {loading ? <p>Loading listings...</p> : filtered.length === 0 ? <div className="panel"><h3>No approved listings yet</h3><p className="muted">When sellers submit products and an administrator approves them, they will appear here.</p></div> :
        <div className="grid">{filtered.map(p => <article className="card" key={p.id}>
          {p.image_url ? <img className="product-image" src={p.image_url} alt={p.title} /> : <div className="placeholder">👟</div>}
          <div className="cardbody"><h3>{p.title}</h3><div className="muted">{p.brand || "Brand not specified"} · {p.size ? `Size ${p.size}` : "Size not specified"}</div>
            <div className="price">₱{Number(p.price).toLocaleString("en-PH")}</div>
            <p className="muted">{p.description || ""}</p>
            <p className="muted">
  Seller: <strong style={{ color: "#2563eb" }}>
    {p.seller_name || "Marketplace seller"}
  </strong>
</p>
          </div>
        </article>)}</div>}
    </main>
    <footer>SOLE MARKET PH · A marketplace connecting shoe buyers and sellers</footer>
  </>;
}
