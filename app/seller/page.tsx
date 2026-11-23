"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Seller() {
  const [title,setTitle]=useState(""); const [brand,setBrand]=useState(""); const [category,setCategory]=useState("Sneakers");
  const [size,setSize]=useState(""); const [price,setPrice]=useState(""); const [description,setDescription]=useState("");
  const [messenger,setMessenger]=useState(""); const [seller,setSeller]=useState(""); const [photo,setPhoto]=useState<File|null>(null);
  const [message,setMessage]=useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setMessage("Supabase is not configured. Follow the README setup steps."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("Please log in first at the Seller Login page."); return; }
    let image_url: string | null = null;
    if (photo) {
      const ext = photo.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(path, photo, { upsert: false });
      if (uploadError) { setMessage(uploadError.message); return; }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      image_url = data.publicUrl;
    }
    const { error } = await supabase.from("products").insert({
      seller_id:user.id, title, brand:brand || null, category, size:size || null,
      price:Number(price), description:description || null, messenger_url:messenger,
      seller_name:seller || null, image_url, status:"pending"
    });
    setMessage(error ? error.message : "Listing submitted for review. It will appear publicly after admin approval.");
    if (!error) { setTitle(""); setBrand(""); setSize(""); setPrice(""); setDescription(""); setMessenger(""); setSeller(""); setPhoto(null); }
  }
  return <><header className="top"><Link className="brand" href="/">SOLE MARKET PH</Link><nav><Link href="/">Marketplace</Link><Link href="/login">Seller Login</Link></nav></header>
    <main><section className="panel"><h1>Post a shoe listing</h1><p className="muted">Log in first. New listings are pending until approved by an administrator.</p>
      <form onSubmit={submit}>
        <div className="field"><label>Product title *</label><input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Running shoes size 9" /></div>
        <div className="field"><label>Brand</label><input value={brand} onChange={e=>setBrand(e.target.value)} placeholder="e.g. Nike" /></div>
        <div className="field"><label>Category *</label><select value={category} onChange={e=>setCategory(e.target.value)}><option>Sneakers</option><option>Running</option><option>Casual</option><option>Formal</option><option>Sandals</option><option>Others</option></select></div>
        <div className="field"><label>Size</label><input value={size} onChange={e=>setSize(e.target.value)} placeholder="e.g. US 9" /></div>
        <div className="field"><label>Price in PHP *</label><input required type="number" min="1" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} /></div>
        <div className="field"><label>Seller/display name</label><input value={seller} onChange={e=>setSeller(e.target.value)} /></div>
        <div className="field"><label>Messenger link *</label><input required type="url" value={messenger} onChange={e=>setMessenger(e.target.value)} placeholder="https://m.me/yourpage" /></div>
        <div className="field"><label>Description</label><textarea rows={4} value={description} onChange={e=>setDescription(e.target.value)} /></div>
        <div className="field"><label>Product photo (optional)</label><input type="file" accept="image/*" onChange={e=>setPhoto(e.target.files?.[0] || null)} /></div>
        <button type="submit">Submit listing</button>
      </form>{message && <p className="notice">{message}</p>}
    </section></main></>;
}
