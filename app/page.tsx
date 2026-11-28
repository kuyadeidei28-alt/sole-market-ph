"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  seller_id: string;
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
  const [heroSlide, setHeroSlide] = useState(0);
  const heroImages = [
    "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1600&q=85"
  ];

  useEffect(() => {
    const timer = window.setInterval(() => setHeroSlide(value => (value + 1) % heroImages.length), 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data } = await supabase.from("products").select("*").eq("status", "approved").order("created_at", { ascending: false });
      setProducts((data || []) as Product[]);
      setLoading(false);
    }
    load();
  }, []);


  async function reportProduct(product: Product) {
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getSession();
    const user = auth.session?.user;
    if (!user) {
      window.alert("Please log in first to report a listing.");
      window.location.href = "/login";
      return;
    }
    if (user.id === product.seller_id) {
      window.alert("You cannot report your own listing.");
      return;
    }
    const choice = window.prompt("Report reason: 1 Counterfeit/Fake, 2 Scam Seller, 3 Misleading Listing, 4 Fake Photos, 5 Wrong Details, 6 Suspicious Activity, 7 Harassment, 8 Other. Enter 1-8:");
    if (!choice) return;
    const reasons: Record<string,string> = { "1":"counterfeit","2":"scam","3":"misleading_listing","4":"fake_photos","5":"wrong_details","6":"suspicious_activity","7":"harassment","8":"other" };
    if (!reasons[choice]) { window.alert("Please choose a number from 1 to 8."); return; }
    const details = window.prompt("Please explain the issue (at least 10 characters):");
    if (!details || details.trim().length < 10) { window.alert("Please provide more details (at least 10 characters)."); return; }
    const { error } = await supabase.from("marketplace_reports").insert({
      reporter_id:user.id, product_id:product.id, seller_id:product.seller_id,
      reason:reasons[choice], details:details.trim(), status:"pending"
    });
    if (error) window.alert("Unable to submit report: " + error.message);
    else window.alert("Thank you. Your report has been submitted for admin review.");
  }

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
            <img className="brand-mark-image" src="/sole-market-logo.svg" alt="Sole Market PH logo" />
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
        <section className="hero hero-modern hero-slideshow">
          <div className="hero-slides" aria-hidden="true">
            {heroImages.map((image, index) => (
              <div key={image} className={"hero-slide " + (heroSlide === index ? "hero-slide-active" : "")} style={{ backgroundImage: "url(" + image + ")" }} />
            ))}
          </div>
          <div className="hero-shade" aria-hidden="true" />
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> THE PHILIPPINES’ SNEAKER MARKETPLACE</span>
            <h1>Find your next<br /><span>favorite pair.</span></h1>
            <p>Discover shoes from sellers around the Philippines. Browse listings and connect directly with sellers.</p>
            <div className="hero-searchbar">
              <span className="hero-search-icon" aria-hidden="true">⌕</span>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" }); }}
                placeholder="Search shoes, brands, or keywords..."
                aria-label="Search shoes, brands, or keywords"
              />
              <a href="#listings" className="hero-search-submit" aria-label="View search results">Search <span aria-hidden="true">→</span></a>
            </div>
          </div>
          <div className="hero-slide-dots" aria-label="Hero slideshow controls">
            {heroImages.map((image, index) => (
              <button key={image} type="button" className={"hero-slide-dot " + (heroSlide === index ? "active" : "")} onClick={() => setHeroSlide(index)} aria-label={"Show hero image " + (index + 1)} />
            ))}
          </div>
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

          <div className="listing-type-switch" aria-label="Listing availability">
            <div className="listing-type-active" aria-current="page">
              <span className="listing-type-dot" />
              ON-HAND
              <span className="listing-type-subtitle">Available now</span>
            </div>
            <div className="listing-type-coming" aria-disabled="true">
              <svg className="listing-lock-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 18, height: 18, minWidth: 18, maxWidth: 18, flex: "0 0 18px", display: "block" }}><rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 1 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="15" r="1.2" fill="#fff"/></svg>
              <span>PRE-ORDER</span>
              <span className="coming-soon-tag">COMING SOON</span>
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
                  <div className="product-info product-info-compact">
                    <p className="product-brand">{p.brand || p.category || "SHOES"}</p>
                    <h3>{p.title}</h3>
                    {p.size && <p className="product-size product-size-pill">Size Available: {p.size}</p>}
                    <div className="product-bottom product-bottom-compact">
                      <div><span className="price-label">PRICE</span><p className="product-price">₱{Number(p.price).toLocaleString("en-PH")}</p></div>
                      <span className="seller-label">{p.seller_name || "Marketplace seller"}</span>
                    </div>
                    {p.messenger_url && (
                      <>
                        <a className="messenger-url" href={p.messenger_url} target="_blank" rel="noopener noreferrer" title={p.messenger_url}>
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a4 4 0 0 0 5.7 0l3.1-3.1a4 4 0 0 0-5.7-5.7l-1.8 1.8M13.4 10.6a4 4 0 0 0-5.7 0l-3.1 3.1a4 4 0 0 0 5.7 5.7l1.8-1.8" /></svg>
                          <span>{p.messenger_url}</span>
                        </a>
                        <a className="message-seller-btn message-seller-btn-messenger" href={p.messenger_url} target="_blank" rel="noopener noreferrer">
                          <svg className="messenger-logo" viewBox="0 0 32 32" aria-hidden="true">
                            <path fill="currentColor" d="M16 2.5C8.1 2.5 2 8.2 2 15.5c0 4 1.8 7.4 4.8 9.7v4.3l4.4-2.4c1.5.4 3.1.7 4.8.7 7.9 0 14-5.7 14-13S23.9 2.5 16 2.5Z"/>
                            <path fill="#075CE5" d="m8.2 19.2 6.2-6.6 3.7 3 5.7-3-6.2 6.6-3.7-3z"/>
                          </svg>
                          <span>Message Seller</span><span className="message-arrow">↗</span>
                        </a>
                      </>
                    )}
                    {!p.messenger_url && <Link className="message-seller-btn" href="/sellers">Find Seller <span>→</span></Link>}
                    <button type="button" className="report-listing-btn" onClick={() => void reportProduct(p)}>Report Listing</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>


<style jsx>{`
  .brand-mark-image { display:block; flex:0 0 auto; width:34px; height:34px; object-fit:contain; border-radius:8px; }
  .footer-brand .brand-mark-image { width:27px; height:27px; }
  .report-listing-btn { display:block; margin:9px auto 0; padding:5px 8px; border:0; background:transparent; color:#64748b; font-size:11px; text-decoration:underline; cursor:pointer; }
  .hero-searchbar { display: flex; align-items: center; gap: 12px; width: min(100%, 590px); min-height: 64px; margin-top: 27px; padding: 8px 9px 8px 20px; border: 1px solid rgba(255,255,255,.2); border-radius: 16px; background: #075CE5; box-shadow: 0 12px 30px rgba(7,92,229,.24); }
  .hero-search-icon { flex: 0 0 auto; color: #fff; font-size: 31px; line-height: 1; }
  .hero-searchbar input { flex: 1 1 auto; width: 0; min-width: 0; border: 0; outline: 0; background: transparent; color: #fff; font: inherit; font-size: 15px; font-weight: 600; }
  .hero-searchbar input::placeholder { color: rgba(255,255,255,.82); opacity: 1; }
  .hero-search-submit { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; gap: 9px; min-height: 46px; padding: 0 18px; border-radius: 11px; background: #fff; color: #075CE5; font-size: 14px; font-weight: 800; text-decoration: none; }
  .hero-search-submit span { font-size: 18px; }
  @media (max-width: 640px) {
    .hero-searchbar { gap: 8px; min-height: 56px; margin-top: 20px; padding: 6px 7px 6px 13px; border-radius: 13px; }
    .hero-search-icon { font-size: 26px; }
    .hero-searchbar input { font-size: 12px; }
    .hero-search-submit { min-height: 42px; padding: 0 12px; font-size: 12px; }
  }
  .listing-type-switch { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:0 0 20px; }
  .listing-type-active, .listing-type-coming { min-width:0; min-height:58px; display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap; padding:11px 12px; border:1px solid #DCE4F0; border-radius:12px; font-size:13px; font-weight:900; letter-spacing:.35px; text-align:center; }
  .listing-type-active { background:#075CE5; border-color:#075CE5; color:#fff; box-shadow:0 5px 14px rgba(7,92,229,.16); }
  .listing-type-dot { width:8px; height:8px; flex:0 0 8px; border-radius:50%; background:#FFD900; }
  .listing-type-subtitle { width:100%; margin-top:-5px; color:#E4EDFF; font-size:10px; font-weight:600; letter-spacing:0; }
  .listing-type-coming { background:#F7F2FF; border:1.5px solid #8B5CF6; color:#24124B; cursor:not-allowed; box-shadow:0 5px 14px rgba(124,58,237,.12); display:grid; grid-template-columns:18px auto; grid-template-rows:auto auto; align-content:center; justify-content:center; column-gap:7px; row-gap:4px; min-height:58px; }\n  .listing-lock-icon { width:18px !important; height:18px !important; min-width:18px !important; max-width:18px !important; flex:0 0 18px !important; color:#6D28D9; grid-column:1; grid-row:1; }\n  .listing-type-coming > span:nth-of-type(1) { grid-column:2; grid-row:1; white-space:nowrap; }
  .coming-soon-tag { display:inline-flex; align-items:center; justify-content:center; grid-column:1 / -1; grid-row:2; justify-self:center; padding:3px 9px; border-radius:20px; background:#6D28D9; color:#fff; font-size:9px; font-weight:900; letter-spacing:.3px; white-space:nowrap; }
  @media (max-width:640px) {
    .listing-type-switch { gap:8px; margin-bottom:15px; }
    .listing-type-active, .listing-type-coming { min-height:54px; gap:5px; padding:9px 6px; font-size:11px; }
    .listing-type-subtitle { font-size:9px; }
    .coming-soon-tag { font-size:8px; }
  }
  .product-info-compact { padding: 13px 14px 14px; }
  .product-info-compact .product-brand { margin-bottom: 3px; font-size: 10px; }
  .product-info-compact h3 { min-height: 0; margin: 0 0 8px; font-size: 17px; line-height: 1.2; letter-spacing: -.25px; }
  .product-size-pill { display: inline-flex; align-items: center; margin: 0 0 9px; padding: 7px 11px; border-radius: 10px; background: #FFD900; color: #111827; font-size: 12px; font-weight: 800; }
  .product-bottom-compact { align-items: center; padding-top: 9px; margin-top: 2px; border-top: 1px solid #E8EBF0; }
  .product-bottom-compact .price-label { font-size: 9px; }
  .product-bottom-compact .product-price { margin-top: 1px; font-size: 23px; line-height: 1.1; white-space: nowrap; }
  .product-bottom-compact .seller-label { max-width: 46%; color: #263044; font-size: 11px; font-weight: 900; text-transform: uppercase; }
  .messenger-url { display: flex; align-items: center; gap: 8px; min-width: 0; margin-top: 10px; padding: 9px 10px; border-radius: 10px; background: #F0F1F3; color: #202633; font-size: 11px; line-height: 1.2; }
  .messenger-url svg { flex: 0 0 19px; width: 19px; height: 19px; fill: none; stroke: #075CE5; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .messenger-url span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .message-seller-btn-messenger { min-height: 43px; margin-top: 9px; padding: 9px 10px; border-radius: 10px; font-size: 13px; gap: 8px; }
  .messenger-logo { flex: 0 0 23px; width: 23px; height: 23px; }
  .message-arrow { font-size: 17px; line-height: 1; }
  .approved-pill { padding: 7px 11px; font-size: 10px; text-transform: uppercase; }
  @media (max-width: 640px) {
    .product-info-compact { padding: 10px; }
    .product-info-compact h3 { font-size: 14px; }
    .product-bottom-compact .product-price { font-size: 19px; }
    .product-bottom-compact .seller-label { font-size: 9px; }
    .messenger-url { gap: 6px; padding: 8px; font-size: 9px; }
    .message-seller-btn-messenger { min-height: 39px; font-size: 11px; }
    .messenger-logo { flex-basis: 20px; width: 20px; height: 20px; }
  }
`}</style>

      <footer className="site-footer"><div className="footer-inner"><Link className="brand footer-brand" href="/"><img className="brand-mark-image" src="/sole-market-logo.svg" alt="Sole Market PH logo" /><span>SOLE MARKET <b>PH</b></span></Link><span>Connecting shoe buyers and sellers across the Philippines.</span><span>© {new Date().getFullYear()} SOLE MARKET PH</span></div></footer>
    </>
  );
}
