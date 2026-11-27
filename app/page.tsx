"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  title: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  price: number;
  description: string | null;
  image_url: string | null;
  messenger_url: string;
  seller_name: string | null;
  created_at?: string;
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
    const searchable = `${p.title} ${p.brand || ""} ${p.description || ""} ${p.category || ""}`.toLowerCase();
    const matchesText = searchable.includes(query.toLowerCase().trim());
    const matchesCategory = category === "All" || p.category === category;
    return matchesText && matchesCategory;
  }).sort((a, b) => {
    if (sort === "price-low") return Number(a.price) - Number(b.price);
    if (sort === "price-high") return Number(b.price) - Number(a.price);
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  }), [products, query, category, sort]);

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="Sole Market PH home">
            <span className="brand-mark">S</span>
            <span>SOLE MARKET <b>PH</b></span>
          </Link>
          <nav className="main-nav" aria-label="Main navigation">
            <Link className="nav-active" href="/">Marketplace</Link>
            <Link href="/sellers">Seller Directory</Link>
            <Link href="/community">Community</Link>
            <Link href="/chat">Chat</Link>
          </nav>
          <div className="header-actions">
            <Link className="login-link" href="/login">Seller Login</Link>
            <Link className="btn" href="/seller">+ Post a Product</Link>
          </div>
        </div>
      </header>

      <main className="home-main">
        <section className="hero hero-modern">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> THE PHILIPPINES’ SNEAKER MARKETPLACE</span>
            <h1>Find your next<br /><span>favorite pair.</span></h1>
            <p>Discover shoes from sellers around the Philippines. Browse listings and connect directly with sellers.</p>
            <div className="hero-ctas">
              <a className="btn hero-btn" href="#listings">Browse Listings <span aria-hidden="true">↓</span></a>
              <Link className="hero-secondary-link" href="/sellers">Explore Sellers <span aria-hidden="true">→</span></Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-circle circle-one" />
            <div className="hero-circle circle-two" />
            <svg className="hero-sneaker" viewBox="0 0 520 300" role="presentation">
              <defs><linearGradient id="shoeBody" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#f4f6fa"/><stop offset="1" stopColor="#7e8794"/></linearGradient></defs>
              <path d="M55 194 Q95 180 130 142 L178 62 Q195 34 225 52 L286 100 Q319 121 365 135 L447 166 Q475 180 484 218 L478 242 Q460 263 416 264 L100 264 Q55 259 40 232 Q32 211 55 194Z" fill="url(#shoeBody)" stroke="#d7deea" strokeWidth="8"/>
              <path d="M178 63 Q205 106 248 139 L330 173 L442 205 Q462 211 478 231 L477 245 Q460 262 416 264 L100 264 Q55 259 40 232 L44 214 Q100 220 137 191Z" fill="#151922"/>
              <path d="M82 230 Q206 246 469 237" stroke="#fff" strokeWidth="9" fill="none"/>
              <path d="M178 66 L228 104 L268 138 L310 161" stroke="#0a0d13" strokeWidth="12" fill="none"/>
              <path d="M195 89 L254 129 M214 73 L274 116 M237 63 L294 103" stroke="#f5f7fb" strokeWidth="8" strokeLinecap="round"/>
              <path d="M134 165 L180 190 L232 203" stroke="#0b0f18" strokeWidth="15" fill="none"/>
              <path d="M60 210 Q92 196 124 207 L153 227" stroke="#c6cedb" strokeWidth="9" fill="none"/>
              <path d="M270 178 Q333 202 415 220" stroke="#075CE5" strokeWidth="8" fill="none"/>
            </svg>
            <div className="hero-sticker">BUY · SELL · CONNECT</div>
          </div>
        </section>

        <section className="quick-links" aria-label="Marketplace features">
          <Link className="quick-card" href="/seller"><span className="quick-icon">＋</span><span><b>Start Selling</b><small>Post your shoe listings</small></span><span className="quick-arrow">→</span></Link>
          <Link className="quick-card" href="/community"><span className="quick-icon">◎</span><span><b>Join Community</b><small>Connect with shoe lovers</small></span><span className="quick-arrow">→</span></Link>
        </section>

        <section className="listings-section" id="listings">
          <div className="section-heading">
            <div>
              <span className="section-kicker">FIND YOUR NEXT PAIR</span>
              <h2>Browse Listings</h2>
              <p>Explore the latest shoes posted by marketplace sellers.</p>
            </div>
            <Link className="text-link" href="/sellers">View Seller Directory <span>→</span></Link>
          </div>

          <div className="search-panel">
            <div className="searchrow searchrow-modern">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search shoes, brands, or keywords..."
                aria-label="Search shoes, brands, or keywords"
              />
              {query && <button className="clear-search" type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
            </div>
            <div className="filter-row">
              <label className="filter-control"><span>Category</span><select value={category} onChange={e => setCategory(e.target.value)}><option>All</option><option>Sneakers</option><option>Running</option><option>Casual</option><option>Formal</option><option>Sandals</option><option>Others</option></select></label>
              <label className="filter-control"><span>Sort by</span><select id="sort-listings" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option></select></label>
              <span className="listing-count">{filtered.length} {filtered.length === 1 ? "listing" : "listings"}</span>
            </div>
          </div>

          {!supabase && <div className="notice">Connect your Supabase project by creating a .env.local file. See README.md for setup instructions.</div>}
          {loading ? <div className="empty-state"><div className="loading-dot" /><p>Loading listings...</p></div> : filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">👟</div><h3>{query ? "No shoes found" : "No approved listings yet"}</h3><p>{query ? "Try another shoe name, brand, or keyword." : "When sellers submit products and an administrator approves them, they will appear here."}</p>{query && <button className="btn" onClick={() => setQuery("")}>Clear Search</button>}</div>
          ) : (
            <div className="product-grid">
              {filtered.map(p => (
                <article className="product-card" key={p.id}>
                  <div className="product-photo-wrap">
                    {p.image_url ? <img className="product-photo" src={p.image_url} alt={p.title} /> : <div className="product-photo-placeholder">👟</div>}
                    <span className="approved-pill">✓ Approved</span>
                  </div>
                  <div className="product-info">
                    <p className="product-brand">{p.brand || p.category || "SHOES"}</p>
                    <h3>{p.title}</h3>
                    {p.size && <p className="product-size">Size: {p.size}</p>}
                    <div className="product-bottom">
                      <div><span className="price-label">PRICE</span><p className="product-price">₱{Number(p.price).toLocaleString("en-PH")}</p></div>
                      <span className="seller-label">{p.seller_name || "Marketplace seller"}</span>
                    </div>
                    {p.description && <p className="product-description">{p.description}</p>}
                    {p.messenger_url ? <a className="message-seller-btn" href={p.messenger_url} target="_blank" rel="noopener noreferrer">Message Seller <span>↗</span></a> : <Link className="message-seller-btn" href="/sellers">Find Seller <span>→</span></Link>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer"><div className="footer-inner"><Link className="brand footer-brand" href="/"><span className="brand-mark">S</span><span>SOLE MARKET <b>PH</b></span></Link><span>Connecting shoe buyers and sellers across the Philippines.</span><span>© {new Date().getFullYear()} SOLE MARKET PH</span></div></footer>
    </>
  );
}
