"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  messenger_url: string;
  seller_name: string | null;
  image_url: string | null;
  status: string;
};

export default function MyProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);

  async function loadProducts() {
    if (!supabase) {
      setMessage("Database is not configured.");
      setLoading(false);
      return;
    }

    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return;
    }

    setSellerId(user.id);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setProducts((data || []) as Product[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function deleteProduct(id: string) {
    if (!supabase || !confirm("Delete this product?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("seller_id", sellerId);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Product deleted successfully.");
      loadProducts();
    }
  }

  async function saveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !editing) return;

    const { error } = await supabase
      .from("products")
      .update({
        title: editing.title,
        brand: editing.brand,
        category: editing.category,
        size: editing.size,
        price: editing.price,
        description: editing.description,
        messenger_url: editing.messenger_url
      })
      .eq("id", editing.id)
      .eq("seller_id", sellerId);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Product updated successfully.");
      setEditing(null);
      loadProducts();
    }
  }

  const pending = products.filter(p => p.status === "pending").length;
  const approved = products.filter(p => p.status === "approved").length;
  const rejected = products.filter(p => p.status === "rejected").length;

  if (loading) return <main className="panel"><p>Loading your products...</p></main>;

  return (
    <>
      <header className="top">
        <Link className="brand" href="/">SOLE MARKET PH</Link>
        <nav>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/seller">Post a Product</Link>
        </nav>
      </header>

      <main className="panel">
        <h1>My Products</h1>
        <p className="muted">Manage your shoe listings here.</p>

        <div className="grid">
         <div className="card" style={{background:"#E5F1FF", border:"1px solid #BFDBFE", borderRadius:"14px", padding:"20px"}}>
  <h2 style={{color:"#2563EB", fontSize:"30px"}}>{products.length}</h2>
  <p style={{color:"#1D4ED8", fontWeight:"bold"}}>Total Listings</p>
</div>

<div className="card" style={{background:"#DCFCE7", border:"1px solid #BBF7D0", borderRadius:"14px", padding:"20px"}}>
  <h2 style={{color:"#16A34A", fontSize:"30px"}}>{approved}</h2>
  <p style={{color:"#15803D", fontWeight:"bold"}}>Approved</p>
</div>

<div className="card" style={{background:"#FEF3C7", border:"1px solid #FDE68A", borderRadius:"14px", padding:"20px"}}>
  <h2 style={{color:"#D97706", fontSize:"30px"}}>{pending}</h2>
  <p style={{color:"#B45309", fontWeight:"bold"}}>Pending</p>
</div>

<div className="card" style={{background:"#FEE2E2", border:"1px solid #FECACA", borderRadius:"14px", padding:"20px"}}>
  <h2 style={{color:"#DC2626", fontSize:"30px"}}>{rejected}</h2>
  <p style={{color:"#B91C1C", fontWeight:"bold"}}>Rejected</p>
</div>
        </div>

        {message && <p className="notice">{message}</p>}

        {editing && (
          <section className="card">
            <h2>Edit Product</h2>
            <form onSubmit={saveProduct}>
              <div className="field">
                <label>Product Title</label>
                <input required value={editing.title}
                  onChange={e => setEditing({...editing, title:e.target.value})} />
              </div>
              <div className="field">
                <label>Brand</label>
                <input value={editing.brand || ""}
                  onChange={e => setEditing({...editing, brand:e.target.value})} />
              </div>
              <div className="field">
                <label>Category</label>
                <input value={editing.category || ""}
                  onChange={e => setEditing({...editing, category:e.target.value})} />
              </div>
              <div className="field">
                <label>Size</label>
                <input value={editing.size || ""}
                  onChange={e => setEditing({...editing, size:e.target.value})} />
              </div>
              <div className="field">
                <label>Price (PHP)</label>
                <input type="number" min="1" required
                  value={editing.price}
                  onChange={e => setEditing({...editing, price:Number(e.target.value)})} />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea value={editing.description || ""}
                  onChange={e => setEditing({...editing, description:e.target.value})} />
              </div>
              <div className="field">
                <label>Messenger URL</label>
                <input value={editing.messenger_url || ""}
                  onChange={e => setEditing({...editing, messenger_url:e.target.value})} />
              </div>
              <button className="btn" type="submit">Save Changes</button>
              <button className="secondary" type="button"
                onClick={() => setEditing(null)}>Cancel</button>
            </form>
          </section>
        )}

        <h2>Your Listings</h2>

        {products.length === 0 ? (
          <div className="card">
            <p>You have no products yet.</p>
            <Link className="btn" href="/seller">Post Your First Product</Link>
          </div>
        ) : (
          <div className="grid">
            {products.map(product => (
              <article className="card" key={product.id}>
                {product.image_url && (
                  <img src={product.image_url} alt={product.title}
                    className="product-image" />
                )}
                <h3>{product.title}</h3>
                <p>{product.brand}</p>
                <h3>₱{Number(product.price).toLocaleString("en-PH")}</h3>
                <p className="muted">{product.description}</p>
                <p>Status: <strong>{product.status?.toUpperCase()}</strong></p>
                <button className="btn" onClick={() => setEditing(product)}>
                  Edit Product
                </button>
                <button className="secondary"
                  onClick={() => deleteProduct(product.id)}>
                  Delete Product
                </button>
              </article>
            ))}
          </div>
        )}

        <p><Link href="/dashboard">← Back to Dashboard</Link></p>
      </main>
    </>
  );
}

