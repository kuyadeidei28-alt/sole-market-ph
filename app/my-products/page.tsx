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
const [searchTerm, setSearchTerm] = useState("");
const [statusFilter, setStatusFilter] = useState("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
const filteredProducts = products.filter((p) => {
  const matchesSearch =
    `${p.title} ${p.brand || ""} ${p.category || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

  const matchesStatus =
    statusFilter === "all" || p.status === statusFilter;

  return matchesSearch && matchesStatus;
});
  if (loading) return <main className="panel"><p>Loading your products...</p></main>;

  return (
  <div style={{
    display: "flex",
    minHeight: "100vh",
    background: "#F4F7FC",
    color: "#111827",
    fontFamily: "Arial, sans-serif"
  }}>
    <aside
  className={mobileMenuOpen ? "seller-sidebar mobile-open" : "seller-sidebar"}
  style={{
      width: "260px",
      background: "white",
      borderRight: "1px solid #E2E8F0",
      padding: "25px 18px",
      flexShrink: 0
    }}>
      <div style={{marginBottom: "40px"}}>
        <h2 style={{color: "#075CE5"}}>🏪 Seller Account</h2>
        <span style={{
          background: "#075CE5",
          color: "white",
          padding: "6px 15px",
          borderRadius: "20px",
          fontWeight: "bold"
        }}>Seller</span>
      </div>

      {[
        ["⌂", "Dashboard", "/dashboard"],
        ["◇", "My Products", "/my-products"],
        ["＋", "Post a Product", "/seller"],
        ["▤", "Orders", "/orders"],
        ["✉", "Messages", "/messages"],
        ["⚙", "Settings", "/settings"]
      ].map(([icon, name, url]) => (
        <Link key={name} href={url} style={{
          display: "block",
          padding: "15px",
          marginBottom: "8px",
          borderRadius: "10px",
          background: name === "My Products" ? "#075CE5" : "white",
          color: name === "My Products" ? "white" : "#17243A",
          textDecoration: "none",
          fontWeight: "bold"
        }}>
          {icon}　{name}
        </Link>
      ))}

      <hr style={{border: "0", borderTop: "1px solid #E2E8F0", margin: "25px 0"}}/>

      <Link href="/" style={{
        display: "block",
        padding: "13px",
        border: "1px solid #075CE5",
        borderRadius: "10px",
        color: "#075CE5",
        textDecoration: "none",
        textAlign: "center",
        fontWeight: "bold"
      }}>
        🏪 Back to Marketplace
      </Link>
    </aside>

    <main className="seller-main" style={{
  flex: 1,
  minWidth: 0,
  padding: "30px"
}}>
<style jsx>{`

  .mobile-menu-button {
    display: none;
  }

  @media (max-width: 768px) {
  .seller-sidebar {
  display: none;
}

.seller-sidebar.mobile-open {
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 260px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 3px 0 15px rgba(0,0,0,0.15);
}

.seller-main {
  width: 100%;
  padding: 15px !important;
}
    .mobile-menu-button {
      display: block;
    }
  }
`}</style>

<button
  className="mobile-menu-button"
  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
  style={{
    padding: "10px 15px",
    background: "#075CE5",
    color: "white",
    border: 0,
    borderRadius: "8px",
    fontSize: "22px",
    marginBottom: "15px"
  }}
>
  ☰ Menu
</button>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "15px",
        marginBottom: "25px"
      }}>
        <div>
          <h1 style={{fontSize: "32px", margin: 0}}>◇ My Products</h1>
          <p style={{color: "#64748B"}}>Manage your shoe listings here.</p>
        </div>

        <Link href="/seller" style={{
          background: "#075CE5",
          color: "white",
          padding: "15px 22px",
          borderRadius: "10px",
          textDecoration: "none",
          fontWeight: "bold"
        }}>
          ＋ Post a Product
        </Link>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
        gap: "16px",
        marginBottom: "22px"
      }}>
        {[
          {number: products.length, label: "Total Listings", bg: "#E5F1FF", color: "#075CE5"},
          {number: approved, label: "Approved", bg: "#DCFCE7", color: "#15803D"},
          {number: pending, label: "Pending", bg: "#FEF3C7", color: "#B45309"},
          {number: rejected, label: "Rejected", bg: "#FEE2E2", color: "#B91C1C"}
        ].map(item => (
          <div key={item.label} style={{
            background: item.bg,
            border: "1px solid #E2E8F0",
            borderRadius: "15px",
            padding: "22px"
          }}>
            <h2 style={{
              fontSize: "34px",
              color: item.color,
              margin: "0 0 8px"
            }}>{item.number}</h2>
            <strong style={{color: item.color}}>{item.label}</strong>
          </div>
        ))}
      </div>

      <div style={{
        display: "flex",
        gap: "15px",
        flexWrap: "wrap",
        marginBottom: "22px"
      }}>
        <input
          placeholder="⌕ Search your products..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "14px",
            border: "1px solid #CBD5E1",
            borderRadius: "10px",
            fontSize: "15px"
          }}
        />

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: "14px",
            minWidth: "180px",
            border: "1px solid #CBD5E1",
            borderRadius: "10px",
            background: "white",
            fontWeight: "bold"
          }}
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {message && (
        <p style={{
          padding: "12px",
          background: "#E5F1FF",
          borderRadius: "8px",
          color: "#075CE5"
        }}>{message}</p>
      )}

      {editing && (
        <section style={{
          background: "white",
          padding: "22px",
          borderRadius: "15px",
          marginBottom: "25px",
          border: "1px solid #CBD5E1"
        }}>
          <h2>Edit Product</h2>

          <form onSubmit={saveProduct}>
            {[
              ["Product Title", "title"],
              ["Brand", "brand"],
              ["Category", "category"],
              ["Size", "size"],
              ["Messenger URL", "messenger_url"]
            ].map(([label, field]) => (
              <label key={field} style={{
                display: "block",
                marginBottom: "13px",
                fontWeight: "bold"
              }}>
                {label}
                <input
                  required={field === "title"}
                  value={editing[field as keyof Product] as string || ""}
                  onChange={e => setEditing({
                    ...editing,
                    [field]: e.target.value
                  })}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "12px",
                    marginTop: "6px",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    boxSizing: "border-box"
                  }}
                />
              </label>
            ))}

            <label style={{display: "block", fontWeight: "bold"}}>
              Price (PHP)
              <input
                type="number"
                min="1"
                required
                value={editing.price}
                onChange={e => setEditing({
                  ...editing,
                  price: Number(e.target.value)
                })}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px",
                  marginTop: "6px",
                  marginBottom: "13px",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  boxSizing: "border-box"
                }}
              />
            </label>

            <label style={{display: "block", fontWeight: "bold"}}>
              Description
              <textarea
                value={editing.description || ""}
                onChange={e => setEditing({
                  ...editing,
                  description: e.target.value
                })}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px",
                  marginTop: "6px",
                  marginBottom: "15px",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  boxSizing: "border-box"
                }}
              />
            </label>

            <button type="submit" style={{
              background: "#075CE5",
              color: "white",
              border: 0,
              padding: "13px 20px",
              borderRadius: "8px",
              fontWeight: "bold"
            }}>Save Changes</button>

            <button
              type="button"
              onClick={() => setEditing(null)}
              style={{
                marginLeft: "10px",
                padding: "13px 20px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                background: "white"
              }}
            >Cancel</button>
          </form>
        </section>
      )}

      <h2>Your Listings</h2>

      {filteredProducts.length === 0 ? (
        <div style={{
          background: "white",
          padding: "25px",
          borderRadius: "15px"
        }}>
          No matching products found.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gap: "15px"
        }}>
          {filteredProducts.map(product => (
            <article key={product.id} style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "20px",
              background: "white",
              border: "1px solid #E2E8F0",
              borderRadius: "15px",
              padding: "18px"
            }}>
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.title}
                  style={{
                    width: "200px",
                    height: "155px",
                    objectFit: "contain",
                    background: "#F1F5F9",
                    borderRadius: "10px"
                  }}
                />
              )}

              <div style={{flex: 1, minWidth: "180px"}}>
                <span style={{
                  background: product.status === "approved" ? "#DCFCE7" : product.status === "rejected" ? "#FEE2E2" : "#FEF3C7",
                  color: product.status === "approved" ? "#15803D" : product.status === "rejected" ? "#B91C1C" : "#B45309",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontWeight: "bold",
                  fontSize: "12px"
                }}>{product.status?.toUpperCase()}</span>

                <h3>{product.title}</h3>
                <p style={{color: "#64748B"}}>{product.brand}</p>
                <h2 style={{color: "#075CE5"}}>
                  ₱{Number(product.price).toLocaleString("en-PH")}
                </h2>
                <p>Size: {product.size || "Not specified"}</p>
                <p>Status: {product.status?.toUpperCase()}</p>
              </div>

              <div style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap"
              }}>
                <button
                  onClick={() => setEditing(product)}
                  style={{
                    background: "white",
                    color: "#075CE5",
                    border: "1px solid #075CE5",
                    padding: "12px",
                    borderRadius: "9px",
                    fontWeight: "bold"
                  }}
                >✎ Edit Product</button>

                <button
                  onClick={() => deleteProduct(product.id)}
                  style={{
                    background: "white",
                    color: "#B91C1C",
                    border: "1px solid #B91C1C",
                    padding: "12px",
                    borderRadius: "9px",
                    fontWeight: "bold"
                  }}
                >▤ Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}

      <section style={{
        marginTop: "35px",
        background: "white",
        border: "1px solid #075CE5",
        borderRadius: "16px",
        overflow: "hidden"
      }}>
        <div style={{
          background: "#E5F1FF",
          padding: "22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div>
            <h2 style={{margin: 0, color: "#075CE5"}}>
              🏪 Marketplace
              <span style={{color: "#64748B", fontSize: "16px"}}> (Public View)</span>
            </h2>
            <p style={{marginBottom: 0}}>
              This is how your approved products appear to buyers.
            </p>
          </div>

          <Link href="/" style={{
            background: "white",
            color: "#075CE5",
            border: "1px solid #075CE5",
            borderRadius: "9px",
            padding: "12px 18px",
            textDecoration: "none",
            fontWeight: "bold"
          }}>
            ↗ View Marketplace
          </Link>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
          gap: "15px",
          padding: "20px"
        }}>
          {products.filter(p => p.status === "approved").map(product => (
            <article key={product.id} style={{
              border: "1px solid #E2E8F0",
              borderRadius: "13px",
              padding: "12px",
              background: "white"
            }}>
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.title}
                  style={{
                    width: "100%",
                    height: "145px",
                    objectFit: "contain",
                    background: "#F1F5F9",
                    borderRadius: "9px"
                  }}
                />
              )}

              <p style={{
                background: "#075CE5",
                color: "white",
                display: "inline-block",
                padding: "5px 9px",
                borderRadius: "15px",
                fontSize: "11px",
                fontWeight: "bold"
              }}>✓ Verified Seller</p>

              <h3 style={{fontSize: "16px"}}>{product.title}</h3>
              <p style={{color: "#64748B"}}>{product.brand}</p>
              <h2 style={{color: "#075CE5"}}>
                ₱{Number(product.price).toLocaleString("en-PH")}
              </h2>
              <p>Size: {product.size || "Not specified"}</p>
            </article>
          ))}
        </div>
      </section>
  </main>
  </div>
  );
}       

