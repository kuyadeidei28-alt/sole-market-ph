"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string; title: string; brand: string | null; category: string | null;
  size: string | null; price: number; description: string | null;
  image_url: string | null; messenger_url: string; seller_name: string | null; created_at?: string;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");

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
  }).sort((a, b) => {
    if (sort === "price-low") return Number(a.price) - Number(b.price);
    if (sort === "price-high") return Number(b.price) - Number(a.price);
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  }), [products, query, category, sort]);

  return <>
    <header className="top">
      <Link className="brand" href="/">SOLE MARKET PH</Link>
      <nav><Link href="/">Marketplace</Link><Link href="/sellers">Seller Directory</Link><Link href="/community">Community</Link><Link href="/chat">Chat</Link><Link href="/login">Seller Login</Link><Link className="btn" href="/seller">Post a Product</Link></nav>
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
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><h2 id="listings">Latest shoe listings</h2><Link className="btn secondary" href="/sellers">Find Sellers</Link></div>
      <div className="toolbar">
        <span className="muted">Category</span>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option>All</option><option>Sneakers</option><option>Running</option><option>Casual</option><option>Formal</option><option>Sandals</option><option>Others</option>
        </select>
        <label className="muted" htmlFor="sort-listings">Sort</label><select id="sort-listings" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option></select><span className="muted">{filtered.length} listings</span>
      </div>
      {!supabase && <div className="notice">Connect your Supabase project by creating a .env.local file. See README.md for setup instructions.</div>}
      {loading ? <p>Loading listings...</p> : filtered.length === 0 ? <div className="panel"><h3>No approved listings yet</h3><p className="muted">When sellers submit products and an administrator approves them, they will appear here.</p></div> :
        <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "20px",
    marginTop: "20px"
  }}
>
  {filtered.map((p) => (
    <article
      key={p.id}
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "16px",
        padding: "14px",
        boxShadow: "0 4px 14px rgba(0,0,0,0.06)"
      }}
    >
      {p.image_url && (
        <img
          src={p.image_url}
          alt={p.title}
          style={{
            width: "100%",
            height: "220px",
            objectFit: "contain",
            background: "#F8FAFC",
            borderRadius: "12px"
          }}
        />
      )}

      <div style={{
        marginTop: "12px",
        color: "#15803D",
        fontWeight: "bold",
        fontSize: "12px"
      }}>
        ✓ APPROVED LISTING
      </div>

      <h3 style={{ fontSize: "18px", fontWeight: "bold" }}>
        {p.title}
      </h3>

      <p style={{ color: "#64748B" }}>
        {p.brand || "Brand not specified"}
      </p>

      <h2 style={{ color: "#075CE5", fontWeight: "bold" }}>
        ₱{Number(p.price).toLocaleString("en-PH")}
      </h2>

      <p style={{ color: "#2563EB", fontWeight: "bold" }}>
        Seller: {p.seller_name || "Marketplace seller"}
      </p>

      {p.description && <p>{p.description}</p>}

      {p.messenger_url && (
        <a
          href={p.messenger_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            textAlign: "center",
            background: "#075CE5",
            color: "white",
            padding: "12px",
            borderRadius: "10px",
            fontWeight: "bold",
            textDecoration: "none"
          }}
        >
          Message Seller
        </a>
      )}
    </article>
  ))}
</div>
      }


    </main>
    <footer>SOLE MARKET PH · A marketplace connecting shoe buyers and sellers</footer>
  </>;
}
