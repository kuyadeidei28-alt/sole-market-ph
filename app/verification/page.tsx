"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type SellerType = "personal" | "business";

export default function SellerVerificationPage() {
  const [sellerType, setSellerType] = useState<SellerType>("personal");
  const [legalName, setLegalName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [registrationType, setRegistrationType] = useState("DTI");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [businessFile, setBusinessFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { setMessage("Database connection is unavailable."); setLoading(false); return; }
      const { data: auth } = await supabase.auth.getSession();
      const user = auth.session?.user;
      if (!user) { setMessage("Please log in first."); setLoading(false); return; }
      setEmail(user.email || "");
      const { data } = await supabase.from("seller_verifications").select("*").eq("seller_id", user.id).maybeSingle();
      if (!active) return;
      if (data) {
        setStatus(data.status);
        setReason(data.rejection_reason || "");
        setSellerType(data.seller_type);
        setLegalName(data.legal_name || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setFacebookUrl(data.facebook_url || "");
        setBusinessName(data.business_name || "");
        setRegistrationType(data.registration_type || "DTI");
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || submitting) return;
    if (!idFile) { setMessage("Please upload your valid government ID."); return; }
    if (sellerType === "business" && !businessFile) { setMessage("Please upload your business registration document."); return; }
    const allowed = ["image/jpeg","image/png","image/webp","application/pdf"];
    for (const file of [idFile, ...(sellerType === "business" && businessFile ? [businessFile] : [])]) {
      if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
        setMessage("Documents must be JPG, PNG, WEBP, or PDF and maximum 5 MB each."); return;
      }
    }
    setSubmitting(true); setMessage("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getSession();
      const user = auth.session?.user;
      if (authError || !user) throw new Error("Please log in first.");
      const upload = async (file: File, label: string) => {
        const ext = file.name.split(".").pop()?.toLowerCase() || "file";
        const path = user.id + "/" + crypto.randomUUID() + "-" + label + "." + ext;
        const { error } = await supabase!.storage.from("seller-verification-docs").upload(path,file,{upsert:false,contentType:file.type});
        if (error) throw error;
        return path;
      };
      const idPath = await upload(idFile,"id");
      let businessPath: string | null = null;
      try {
        if (sellerType === "business" && businessFile) businessPath = await upload(businessFile,"business");
        const payload = {
          seller_id:user.id, seller_type:sellerType, legal_name:legalName.trim(),
          phone:phone.trim(), email:user.email || email, address:address.trim(),
          facebook_url:facebookUrl.trim() || null,
          business_name:sellerType === "business" ? businessName.trim() : null,
          registration_type:sellerType === "business" ? registrationType : null,
          id_document_path:idPath, business_document_path:businessPath,
          status:"pending", rejection_reason:null
        };
        const { error } = await supabase.from("seller_verifications").upsert(payload,{onConflict:"seller_id"});
        if (error) throw error;
      } catch (error) {
        await supabase.storage.from("seller-verification-docs").remove([idPath,...(businessPath?[businessPath]:[])]);
        throw error;
      }
      setStatus("pending"); setReason(""); setMessage("Verification submitted. Please wait for admin review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit verification.");
    } finally { setSubmitting(false); }
  }

  if (loading) return <main className="panel">Loading verification...</main>;

  return (
    <>
      <header className="top"><Link className="brand" href="/">SOLE MARKET PH</Link><nav><Link href="/dashboard">Dashboard</Link><Link href="/">Marketplace</Link></nav></header>
      <main><section className="panel" style={{maxWidth:720,margin:"32px auto"}}>
        <h1>Seller Verification</h1>
        <p className="muted">Choose how you will operate on SOLE MARKET PH. Your documents are private and can only be reviewed by authorized administrators.</p>
        {status === "verified" ? <div className="notice"><strong>Verified Seller</strong><p>Your seller account is verified. You can now post products.</p></div> :
         status === "pending" ? <div className="notice"><strong>Pending Verification</strong><p>Your documents are being reviewed. Posting is locked until approval.</p></div> :
         <form onSubmit={submit}>
          {status === "rejected" && <div className="notice"><strong>Verification needs changes:</strong> {reason || "Please review and resubmit your documents."}</div>}
          <div className="field"><label>Seller type *</label><select value={sellerType} onChange={e=>setSellerType(e.target.value as SellerType)}><option value="personal">Personal Seller – personal Facebook / Messenger</option><option value="business">Business/Page Seller – Facebook Business Page</option></select></div>
          <div className="field"><label>Full legal name (as shown on ID) *</label><input required value={legalName} onChange={e=>setLegalName(e.target.value)} /></div>
          <div className="field"><label>Mobile number *</label><input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
          <div className="field"><label>Email address</label><input readOnly value={email} /></div>
          <div className="field"><label>Complete address *</label><textarea required rows={3} value={address} onChange={e=>setAddress(e.target.value)} /></div>
          <div className="field"><label>Facebook / Messenger / Page link (optional)</label><input type="url" value={facebookUrl} onChange={e=>setFacebookUrl(e.target.value)} placeholder="https://facebook.com/... or https://m.me/..." /></div>
          <div className="field"><label>Valid government ID * (JPG, PNG, WEBP, PDF; max 5 MB)</label><input required type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={e=>setIdFile(e.target.files?.[0] || null)} /></div>
          {sellerType === "business" && <>
            <h2>Business registration</h2>
            <div className="field"><label>Registered business name *</label><input required value={businessName} onChange={e=>setBusinessName(e.target.value)} /></div>
            <div className="field"><label>Registration type *</label><select value={registrationType} onChange={e=>setRegistrationType(e.target.value)}><option value="DTI">DTI</option><option value="SEC">SEC</option><option value="CDA">CDA</option><option value="OTHER">Other applicable registration</option></select></div>
            <div className="field"><label>Business registration document * (max 5 MB)</label><input required type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={e=>setBusinessFile(e.target.files?.[0] || null)} /></div>
          </>}
          <button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit for verification"}</button>
         </form>}
        {message && <p className="notice" role="status">{message}</p>}
        <p className="muted" style={{fontSize:12,marginTop:20}}>Documents are collected only for seller verification. Do not upload unrelated personal information.</p>
      </section></main>
    </>
  );
}
