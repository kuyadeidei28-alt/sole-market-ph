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
  listing_type?: string | null;
  estimated_arrival?: string | null;
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
      // Prefer the explicit listing type filter. If the additive migration has
      // not been applied yet, safely fall back to the current approved catalog;
      // existing listings are all On-Hand until the new listing type is enabled.
      let { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "approved")
        .eq("listing_type", "on_hand")
        .order("created_at", { ascending: false });

      if (error && /listing_type|column/i.test(error.message)) {
        const fallback = await supabase
          .from("products")
          .select("*")
          .eq("status", "approved")
          .order("created_at", { ascending: false });
        data = fallback.data;
      }

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

      <div className="trust-ticker" role="region" aria-label="Marketplace notice">
        <div className="trust-ticker-track">
          <span>WELCOME TO SOLE MARKET PH!</span><span>SHOP WITH CONFIDENCE.</span><span>WE ENCOURAGE AUTHENTIC PRODUCTS AND RESPONSIBLE SELLING.</span><span>SELLERS AND MARKETPLACE ACTIVITIES ARE SUBJECT TO MONITORING AND REVIEW.</span><span>SUSPICIOUS LISTINGS AND REPORTED SCAM ACTIVITIES MAY BE INVESTIGATED AND APPROPRIATE ACTION MAY BE TAKEN.</span><span>ALL TRADEMARKS, LOGOS, BRAND NAMES, AND COPYRIGHTED MATERIALS BELONG TO THEIR RESPECTIVE OWNERS.</span><span>SOLE MARKET PH IS AN INDEPENDENT MARKETPLACE AND IS NOT AFFILIATED WITH OR ENDORSED BY ANY BRAND UNLESS EXPRESSLY STATED.</span>
          <span aria-hidden="true">WELCOME TO SOLE MARKET PH!</span><span aria-hidden="true">SHOP WITH CONFIDENCE.</span><span aria-hidden="true">WE ENCOURAGE AUTHENTIC PRODUCTS AND RESPONSIBLE SELLING.</span><span aria-hidden="true">SELLERS AND MARKETPLACE ACTIVITIES ARE SUBJECT TO MONITORING AND REVIEW.</span><span aria-hidden="true">SUSPICIOUS LISTINGS AND REPORTED SCAM ACTIVITIES MAY BE INVESTIGATED AND APPROPRIATE ACTION MAY BE TAKEN.</span><span aria-hidden="true">ALL TRADEMARKS, LOGOS, BRAND NAMES, AND COPYRIGHTED MATERIALS BELONG TO THEIR RESPECTIVE OWNERS.</span><span aria-hidden="true">SOLE MARKET PH IS AN INDEPENDENT MARKETPLACE AND IS NOT AFFILIATED WITH OR ENDORSED BY ANY BRAND UNLESS EXPRESSLY STATED.</span>
        </div>
      </div>

      <main className="home-main">
        <section className="hero hero-modern">
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
                placeholder="Search on-hand shoes (e.g., Nike, Jordan, Adidas)..."
                aria-label="Search shoes, brands, or keywords"
              />
              <a href="#listings" className="hero-search-submit" aria-label="View search results">Search <span aria-hidden="true">→</span></a>
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

        <section className="listings-section" id="listings">
          <div className="section-heading">
            <div>
              <span className="section-kicker">SOLE MARKET PH</span>
              <h2>Marketplace</h2>
              <p>Browse ready-stock shoes and connect directly with sellers.</p>
            </div>
            <Link className="text-link" href="/sellers">View Seller Directory <span>→</span></Link>
          </div>

          <div className="listing-type-tabs" aria-label="Listing type">
            <div className="listing-type-tab listing-type-tab-active" aria-current="page">
              <span className="listing-tab-icon" aria-hidden="true">👟</span>
              <span className="listing-tab-copy"><strong>On-Hand Shoes</strong><small>Ready stocks · Available now</small></span>
            </div>
            <div className="listing-type-tab listing-type-tab-disabled" aria-disabled="true">
              <span className="listing-tab-icon" aria-hidden="true">▣</span>
              <span className="listing-tab-copy"><strong>Pre-Order Shoes <em>COMING SOON</em></strong><small>For advance order · With ETA</small></span>
              <span className="listing-tab-lock" aria-hidden="true">🔒</span>
            </div>
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
            <div className="empty-state"><div className="empty-icon">👟</div><h3>{query ? "No shoes found" : "No on-hand listings yet"}</h3><p>{query ? "Try another shoe name, brand, or keyword." : "When sellers submit products and an administrator approves them, they will appear here."}</p>{query && <button className="btn" onClick={() => setQuery("")}>Clear Search</button>}</div>
          ) : (
            <div className="product-grid">
              {filtered.map(p => (
                <article className="product-card" key={p.id}>
                  <div className="product-photo-wrap">
                    {p.image_url ? <img className="product-photo" src={p.image_url} alt={p.title} /> : <div className="product-photo-placeholder">👟</div>}
                    <span className="approved-pill on-hand-pill">ON-HAND</span>
                  </div>
                  <div className="product-info product-info-compact">
                    <p className="product-brand">{p.brand || p.category || "SHOES"}</p>
                    <h3>{p.title}</h3>
                    {p.size && <p className="product-size product-size-pill">Size: {p.size}</p>}
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
  .trust-ticker { width:100%; overflow:hidden; background:#075CE5; color:#fff; border-top:1px solid rgba(255,255,255,.16); border-bottom:1px solid #064fc5; }
  .trust-ticker-track { display:flex; align-items:center; gap:34px; width:max-content; min-height:42px; padding-left:100%; white-space:nowrap; animation:soleTicker 85s linear infinite; }
  .trust-ticker-track span { flex:0 0 auto; font-size:11px; font-weight:800; letter-spacing:.055em; }
  .trust-ticker-track span::after { content:"•"; margin-left:34px; color:#bfdbfe; }
  .trust-ticker:hover .trust-ticker-track { animation-play-state:paused; }
  @keyframes soleTicker { from { transform:translateX(0); } to { transform:translateX(-50%); } }
  @media (prefers-reduced-motion: reduce) { .trust-ticker-track { animation:none; padding:13px 16px; width:auto; white-space:normal; flex-wrap:wrap; justify-content:center; } .trust-ticker-track span[aria-hidden="true"] { display:none; } }
  .listing-type-tabs { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin:0 0 22px; }
  .listing-type-tab { min-height:96px; display:flex; align-items:center; gap:16px; padding:16px 20px; border-radius:16px; border:1px solid #e2e8f0; }
  .listing-type-tab-active { position:relative; color:#fff; background:#075CE5; border-color:#075CE5; box-shadow:0 8px 20px rgba(7,92,229,.15); }
  .listing-type-tab-active:after { content:""; position:absolute; bottom:-9px; left:48%; width:18px; height:18px; background:#075CE5; transform:rotate(45deg); border-radius:2px; }
  .listing-type-tab-disabled { color:#263244; background:#e9eef6; cursor:not-allowed; opacity:.9; }
  .listing-tab-icon { flex:0 0 auto; font-size:32px; line-height:1; }
  .listing-tab-copy { display:flex; flex-direction:column; gap:6px; min-width:0; }
  .listing-tab-copy strong { font-size:20px; line-height:1.15; }
  .listing-tab-copy small { font-size:13px; opacity:.88; }
  .listing-tab-copy em { display:inline-block; margin-left:6px; padding:4px 8px; border-radius:99px; background:#facc15; color:#111827; font-size:10px; font-style:normal; font-weight:900; white-space:nowrap; vertical-align:middle; }
  .listing-tab-lock { margin-left:auto; font-size:20px; }
  .on-hand-pill { background:#07983d; color:#fff; border-radius:99px; font-weight:800; letter-spacing:.2px; }
  @media (max-width:640px) {
    .listing-type-tabs { gap:10px; margin-bottom:18px; }
    .listing-type-tab { min-height:112px; gap:9px; padding:12px 10px; border-radius:15px; align-items:center; }
    .listing-tab-icon { font-size:26px; }
    .listing-tab-copy { gap:7px; }
    .listing-tab-copy strong { font-size:15px; line-height:1.15; }
    .listing-tab-copy small { font-size:11px; line-height:1.25; }
    .listing-tab-copy em { display:table; margin:4px 0 0; font-size:9px; }
    .listing-tab-lock { font-size:15px; align-self:flex-start; }
  }
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
  .product-info-compact { padding: 13px 14px 14px; }
  .product-info-compact .product-brand { margin-bottom: 3px; font-size: 10px; }
  .product-info-compact h3 { min-height: 0; margin: 0 0 8px; font-size: 17px; line-height: 1.2; letter-spacing: -.25px; }
  .product-size-pill { display: inline-flex; align-items: center; margin: 0 0 9px; padding: 6px 10px; border-radius: 9px; background: #F0F1F3; color: #202633; font-size: 12px; font-weight: 700; }
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

      <footer className="site-footer"><div className="footer-inner"><Link className="brand footer-brand" href="/"><span className="brand-mark">S</span><span>SOLE MARKET <b>PH</b></span></Link><span>Connecting shoe buyers and sellers across the Philippines.</span><span>© {new Date().getFullYear()} SOLE MARKET PH</span></div><div className="footer-inner" style={{display:"block",paddingTop:"12px",paddingBottom:"20px",fontSize:"12px",lineHeight:1.6,color:"#64748b"}}><strong>Disclaimer:</strong> SOLE MARKET PH is an independent marketplace and is not affiliated with or endorsed by third-party brands unless expressly stated. All trademarks, logos, brand names, product names, images, and copyrighted materials belong to their respective owners. Listings and product claims are provided by independent sellers. Buyers should verify product authenticity and transaction details before purchasing. Marketplace activity may be monitored; suspicious listings and reported scam activity may be reviewed and appropriate action may be taken under platform policies.</div></footer>
    </>
  );
}
