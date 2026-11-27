
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Seller() {
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Sneakers");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [messenger, setMessenger] = useState("");
  const [seller, setSeller] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      return;
    }

    let alive = true;

    async function loadSellerProfile(userId: string) {
      const { data } = await supabase!
        .from("profiles")
        .select("display_name,messenger_url")
        .eq("id", userId)
        .maybeSingle();
      if (!alive || !data) return;
      setSeller(current => current || data.display_name || "");
      setMessenger(current => current || data.messenger_url || "");
    }

    // Read the existing session when this page opens, then keep the page's
    // signed-in indicator synchronized with Supabase auth changes.
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const user = data.session?.user;
      setSignedInEmail(user?.email || null);
      setAuthChecked(true);
      if (user) void loadSellerProfile(user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      const user = session?.user;
      setSignedInEmail(user?.email || null);
      if (user) void loadSellerProfile(user.id);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Database is not configured. Please check the setup.");
      return;
    }

    if (submitting) return;

    if (photo) {
      if (!photo.type.startsWith("image/")) {
        setMessage("Please select a valid image file.");
        return;
      }

      if (photo.size > 5 * 1024 * 1024) {
        setMessage("Photo must not exceed 5 MB.");
        return;
      }
    }

    setSubmitting(true);

    try {
      const { data: auth, error: authError } = await supabase.auth.getSession();
      const user = auth.session?.user;

      if (authError || !user) {
        setMessage("Please log in first at the Seller Login page.");
        return;
      }

      let imageUrl: string | null = null;
      let uploadedPath: string | null = null;

      if (photo) {
        const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg";
        uploadedPath = `${user.id}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(uploadedPath, photo, { upsert: false });

        if (uploadError) {
          setMessage(`Photo upload failed: ${uploadError.message}`);
          return;
        }

        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(uploadedPath);

        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from("products").insert({
        seller_id: user.id,
        title: title.trim(),
        brand: brand.trim() || null,
        category,
        size: size.trim() || null,
        price: Number(price),
        description: description.trim() || null,
        messenger_url: messenger.trim(),
        seller_name: seller.trim() || null,
        image_url: imageUrl,
        status: "pending"
      });

      if (error) {
        if (uploadedPath) {
          await supabase.storage
            .from("product-images")
            .remove([uploadedPath]);
        }

        if (
          error.code === "42501" ||
          error.message.toLowerCase().includes("row-level security")
        ) {
          setMessage(
            "You currently do not have permission to post. Please check your seller subscription or the free posting promo."
          );
        } else {
          setMessage(`Listing submission failed: ${error.message}`);
        }

        return;
      }

      setMessage(
        "Listing submitted successfully! It is now pending admin review and will appear publicly after approval."
      );

      setTitle("");
      setBrand("");
      setCategory("Sneakers");
      setSize("");
      setPrice("");
      setDescription("");
      setMessenger("");
      setSeller("");
      setPhoto(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="top">
        <Link className="brand" href="/">
          SOLE MARKET PH
        </Link>

        <nav>
          <Link href="/">Marketplace</Link>
          <Link href={signedInEmail ? "/dashboard" : "/login"}>{signedInEmail ? "Seller Dashboard" : "Seller Login"}</Link>
        </nav>
      </header>

      <main>
        <section className="panel">
          <h1>Post a shoe listing</h1>

          <p className="muted">
            {authChecked
              ? signedInEmail
                ? `You're signed in as ${signedInEmail}. You can post your shoe listing below.`
                : "Please log in to your seller account before submitting a listing."
              : "Checking your seller login..."}
            {" "}New listings are pending until approved by an administrator.
          </p>
          {authChecked && !signedInEmail && (
            <p><Link className="btn" href="/login">Seller Login</Link></p>
          )}

          <form onSubmit={submit}>
            <div className="field">
              <label>Product title *</label>
              <input
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Running shoes size 9"
              />
            </div>

            <div className="field">
              <label>Brand</label>
              <input
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="e.g. Nike"
              />
            </div>

            <div className="field">
              <label>Category *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option>Sneakers</option>
                <option>Running</option>
                <option>Casual</option>
                <option>Formal</option>
                <option>Sandals</option>
                <option>Others</option>
              </select>
            </div>

            <div className="field">
              <label>Size</label>
              <input
                value={size}
                onChange={e => setSize(e.target.value)}
                placeholder="e.g. US 9"
              />
            </div>

            <div className="field">
              <label>Price in PHP *</label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Seller/display name</label>
              <input
                value={seller}
                onChange={e => setSeller(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Messenger link *</label>
              <input
                required
                type="url"
                value={messenger}
                onChange={e => setMessenger(e.target.value)}
                placeholder="https://m.me/yourpage"
              />
            </div>

            <div className="field">
              <label>Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Product photo (optional, maximum 5 MB)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={e =>
                  setPhoto(e.target.files?.[0] || null)
                }
              />
            </div>

            <button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit listing"}
            </button>
          </form>

          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
        </section>
      </main>
    </>
  );
}
