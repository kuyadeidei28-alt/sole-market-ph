

"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
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

const navigation = [
  ["⌂", "Dashboard", "/dashboard"],
  ["◇", "My Products", "/my-products"],
  ["＋", "Post a Product", "/seller"],
  ["⚙", "Profile Settings", "/settings"],
  ["⌕", "Seller Directory", "/sellers"]
];

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

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

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

  async function saveProduct(e: FormEvent<HTMLFormElement>) {
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
        messenger_url: editing.messenger_url,
        // Every seller edit must be reviewed again by an administrator.
        status: "pending"
      })
      .eq("id", editing.id)
      .eq("seller_id", sellerId);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Product updated and sent for admin review. It will appear in the marketplace again after approval."
      );
      setEditing(null);
      loadProducts();
    }
  }

  const pending = products.filter(p => p.status === "pending").length;
  const approved = products.filter(p => p.status === "approved").length;
  const rejected = products.filter(p => p.status === "rejected").length;

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      `${p.title} ${p.brand || ""} ${p.category || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <main className="loading-page">
        <p>Loading your products...</p>
      </main>
    );
  }

  return (
    <div className="seller-layout">
      <style jsx>{`
        .seller-layout {
          display: flex;
          min-height: 100vh;
          background: #f4f7fc;
          color: #111827;
          font-family: Arial, sans-serif;
        }

        .seller-sidebar {
          width: 260px;
          min-width: 260px;
          background: white;
          border-right: 1px solid #e2e8f0;
          padding: 25px 18px;
          flex-shrink: 0;
        }

        .seller-main {
          flex: 1;
          min-width: 0;
          padding: 30px;
        }

        .mobile-menu-button {
          display: none;
        }

        .mobile-overlay {
          display: none;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .product-card {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 15px;
          padding: 18px;
        }

        .product-image {
          width: 200px;
          height: 155px;
          flex-shrink: 0;
          object-fit: contain;
          background: #f1f5f9;
          border-radius: 10px;
        }

        .product-info {
          flex: 1;
          min-width: 180px;
        }

        .product-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .action-button {
          padding: 12px;
          border-radius: 9px;
          background: white;
          font-weight: bold;
          cursor: pointer;
        }

        .seller-name {
          color: #075ce5;
          font-weight: 800;
          margin: 8px 0;
        }

        .search-row {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }

        .search-input {
          flex: 1;
          min-width: 200px;
          padding: 14px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 15px;
        }

        .status-select {
          padding: 14px;
          min-width: 180px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: white;
          font-weight: bold;
        }

        .marketplace-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 15px;
          padding: 20px;
        }

        .marketplace-card {
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          padding: 12px;
          background: white;
          min-width: 0;
        }

        @media (max-width: 768px) {
          .seller-layout {
            display: block;
            width: 100%;
            overflow-x: hidden;
          }

          .seller-sidebar {
            display: none;
          }

          .seller-sidebar.mobile-open {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            height: 100dvh;
            width: 270px;
            max-width: 85vw;
            overflow-y: auto;
            z-index: 1002;
            box-shadow: 3px 0 20px rgba(0, 0, 0, 0.2);
          }

          .mobile-overlay {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 1001;
            background: rgba(15, 23, 42, 0.5);
            border: 0;
            padding: 0;
          }

          .seller-main {
            width: 100%;
            padding: 16px;
            box-sizing: border-box;
          }

          .mobile-menu-button {
            display: inline-flex;
            align-items: center;
            gap: 9px;
            padding: 11px 16px;
            background: #075ce5;
            color: white;
            border: 0;
            border-radius: 9px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            margin-bottom: 18px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .product-card {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
            padding: 14px;
          }

          .product-image {
            width: 100%;
            height: 190px;
          }

          .product-info {
            min-width: 0;
          }

          .product-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .action-button {
            width: 100%;
            padding: 12px 6px;
          }

          .search-row {
            flex-direction: column;
            gap: 10px;
          }

          .search-input,
          .status-select {
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
          }

          .marketplace-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            padding: 12px;
          }

          .marketplace-card img {
            width: 100%;
            height: 120px;
            object-fit: contain;
          }

          .page-heading {
            font-size: 25px !important;
          }

          .post-button {
            display: inline-block;
            padding: 12px 15px !important;
          }
        }

        @media (max-width: 380px) {
          .seller-main {
            padding: 12px;
          }

          .stats-grid {
            gap: 8px;
          }

          .stat-card {
            padding: 14px !important;
          }

          .stat-number {
            font-size: 27px !important;
          }

          .marketplace-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {mobileMenuOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={
          mobileMenuOpen
            ? "seller-sidebar mobile-open"
            : "seller-sidebar"
        }
      >
        <div style={{ marginBottom: "35px" }}>
          <h2 style={{ color: "#075CE5" }}>🏪 Seller Account</h2>
          <span
            style={{
              background: "#075CE5",
              color: "white",
              padding: "6px 15px",
              borderRadius: "20px",
              fontWeight: "bold"
            }}
          >
            Seller
          </span>
        </div>

        <button
          className="mobile-close-button"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            display: "none",
            width: "100%",
            padding: "10px",
            marginBottom: "15px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "white",
            fontWeight: "bold"
          }}
        >
          ✕ Close Menu
        </button>

        {navigation.map(([icon, name, url]) => (
          <Link
            key={name}
            href={url}
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: "block",
              padding: "15px",
              marginBottom: "8px",
              borderRadius: "10px",
              background: name === "My Products" ? "#075CE5" : "white",
              color: name === "My Products" ? "white" : "#17243A",
              textDecoration: "none",
              fontWeight: "bold"
            }}
          >
            {icon}　{name}
          </Link>
        ))}

        <hr
          style={{
            border: 0,
            borderTop: "1px solid #e2e8f0",
            margin: "25px 0"
          }}
        />

        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            display: "block",
            padding: "13px",
            border: "1px solid #075CE5",
            borderRadius: "10px",
            color: "#075CE5",
            textDecoration: "none",
            textAlign: "center",
            fontWeight: "bold"
          }}
        >
          🏪 Back to Marketplace
        </Link>
      </aside>

      <main className="seller-main">
        <button
          className="mobile-menu-button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
        >
          ☰ Menu
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "15px",
            marginBottom: "25px"
          }}
        >
          <div>
            <h1 className="page-heading" style={{ fontSize: "32px", margin: 0 }}>
              ◇ My Products
            </h1>
            <p style={{ color: "#64748B" }}>
              Manage your shoe listings here.
            </p>
          </div>

          <Link
            className="post-button"
            href="/seller"
            style={{
              background: "#075CE5",
              color: "white",
              padding: "15px 22px",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: "bold"
            }}
          >
            ＋ Post a Product
          </Link>
        </div>

        <div className="stats-grid">
          {[
            { number: products.length, label: "Total Listings", bg: "#E5F1FF", color: "#075CE5" },
            { number: approved, label: "Approved", bg: "#DCFCE7", color: "#15803D" },
            { number: pending, label: "Pending", bg: "#FEF3C7", color: "#B45309" },
            { number: rejected, label: "Rejected", bg: "#FEE2E2", color: "#B91C1C" }
          ].map(item => (
            <div
              className="stat-card"
              key={item.label}
              style={{
                background: item.bg,
                border: "1px solid #E2E8F0",
                borderRadius: "15px",
                padding: "22px"
              }}
            >
              <h2
                className="stat-number"
                style={{
                  fontSize: "34px",
                  color: item.color,
                  margin: "0 0 8px"
                }}
              >
                {item.number}
              </h2>
              <strong style={{ color: item.color }}>{item.label}</strong>
            </div>
          ))}
        </div>

        <div className="search-row">
          <input
            className="search-input"
            placeholder="⌕ Search your products..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <select
            className="status-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {message && (
          <p
            style={{
              padding: "12px",
              background: "#E5F1FF",
              borderRadius: "8px",
              color: "#075CE5"
            }}
          >
            {message}
          </p>
        )}

        {editing && (
          <section
            style={{
              background: "white",
              padding: "22px",
              borderRadius: "15px",
              marginBottom: "25px",
              border: "1px solid #CBD5E1"
            }}
          >
            <h2>Edit Product</h2>

            <form onSubmit={saveProduct}>
              {[
                ["Product Title", "title"],
                ["Brand", "brand"],
                ["Category", "category"],
                ["Size", "size"],
                ["Messenger URL", "messenger_url"]
              ].map(([label, field]) => (
                <label
                  key={field}
                  style={{
                    display: "block",
                    marginBottom: "13px",
                    fontWeight: "bold"
                  }}
                >
                  {label}
                  <input
                    required={field === "title"}
                    value={
                      (editing[field as keyof Product] as string) || ""
                    }
                    onChange={e =>
                      setEditing({
                        ...editing,
                        [field]: e.target.value
                      })
                    }
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

              <label style={{ display: "block", fontWeight: "bold" }}>
                Price (PHP)
                <input
                  type="number"
                  min="1"
                  required
                  value={editing.price}
                  onChange={e =>
                    setEditing({
                      ...editing,
                      price: Number(e.target.value)
                    })
                  }
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

              <label style={{ display: "block", fontWeight: "bold" }}>
                Description
                <textarea
                  value={editing.description || ""}
                  onChange={e =>
                    setEditing({
                      ...editing,
                      description: e.target.value
                    })
                  }
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

              <button
                type="submit"
                style={{
                  background: "#075CE5",
                  color: "white",
                  border: 0,
                  padding: "13px 20px",
                  borderRadius: "8px",
                  fontWeight: "bold"
                }}
              >
                Save Changes
              </button>

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
              >
                Cancel
              </button>
            </form>
          </section>
        )}

        <h2>Your Listings</h2>

        {filteredProducts.length === 0 ? (
          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "15px"
            }}
          >
            No matching products found.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "15px" }}>
            {filteredProducts.map(product => (
              <article className="product-card" key={product.id}>
                <div
                  style={{
                    width: "200px",
                    height: "155px",
                    flexShrink: 0,
                    background: "#F1F5F9",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden"
                  }}
                >
                  {product.image_url ? (
                    <img
                      className="product-image"
                      src={product.image_url}
                      alt={product.title}
                    />
                  ) : (
                    <span style={{ fontSize: "42px" }}>👟</span>
                  )}
                </div>

                <div className="product-info">
                  <span
                    style={{
                      background:
                        product.status === "approved"
                          ? "#DCFCE7"
                          : product.status === "rejected"
                          ? "#FEE2E2"
                          : "#FEF3C7",
                      color:
                        product.status === "approved"
                          ? "#15803D"
                          : product.status === "rejected"
                          ? "#B91C1C"
                          : "#B45309",
                      padding: "5px 12px",
                      borderRadius: "20px",
                      fontWeight: "bold",
                      fontSize: "12px"
                    }}
                  >
                    {product.status?.toUpperCase()}
                  </span>

                  <h3>{product.title}</h3>
                  <p style={{ color: "#64748B" }}>{product.brand}</p>

                  <p className="seller-name">
                    Seller: {product.seller_name || "Seller"}
                  </p>

                  <h2 style={{ color: "#075CE5" }}>
                    ₱{Number(product.price).toLocaleString("en-PH")}
                  </h2>

                  <p>Size: {product.size || "Not specified"}</p>
                </div>

                <div className="product-actions">
                  <button
                    className="action-button"
                    onClick={() => setEditing(product)}
                    style={{
                      color: "#075CE5",
                      border: "1px solid #075CE5"
                    }}
                  >
                    ✎ Edit Product
                  </button>

                  <button
                    className="action-button"
                    onClick={() => deleteProduct(product.id)}
                    style={{
                      color: "#B91C1C",
                      border: "1px solid #B91C1C"
                    }}
                  >
                    ▤ Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <section
          style={{
            marginTop: "35px",
            background: "white",
            border: "1px solid #075CE5",
            borderRadius: "16px",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              background: "#E5F1FF",
              padding: "22px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px"
            }}
          >
            <div>
              <h2 style={{ margin: 0, color: "#075CE5" }}>
                🏪 Marketplace
                <span style={{ color: "#64748B", fontSize: "16px" }}>
                  {" "}(Public View)
                </span>
              </h2>
              <p style={{ marginBottom: 0 }}>
                This is how your approved products appear to buyers.
              </p>
            </div>

            <Link
              href="/"
              style={{
                background: "white",
                color: "#075CE5",
                border: "1px solid #075CE5",
                borderRadius: "9px",
                padding: "12px 18px",
                textDecoration: "none",
                fontWeight: "bold"
              }}
            >
              ↗ View Marketplace
            </Link>
          </div>

          <div className="marketplace-grid">
            {products
              .filter(p => p.status === "approved")
              .map(product => (
                <article className="marketplace-card" key={product.id}>
                  {product.image_url ? (
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
                  ) : (
                    <div
                      style={{
                        height: "145px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#F1F5F9",
                        borderRadius: "9px",
                        fontSize: "40px"
                      }}
                    >
                      👟
                    </div>
                  )}

                  <p
                    style={{
                      background: "#075CE5",
                      color: "white",
                      display: "inline-block",
                      padding: "5px 9px",
                      borderRadius: "15px",
                      fontSize: "11px",
                      fontWeight: "bold"
                    }}
                  >
                    ✓ Approved Listing
                  </p>

                  <h3 style={{ fontSize: "16px" }}>{product.title}</h3>

                  <p style={{ color: "#64748B" }}>{product.brand}</p>

                  <p className="seller-name">
                    Seller: {product.seller_name || "Seller"}
                  </p>

                  <h2 style={{ color: "#075CE5" }}>
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
