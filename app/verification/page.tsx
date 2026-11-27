"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type SellerType = "personal" | "business";

async function sha256(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, "0")).join("");
}

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
  const [readabilityConfirmed, setReadabilityConfirmed] = useState(false);
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [autoStatus, setAutoStatus] = useState("");
  const [autoNotes, setAutoNotes] = useState("");
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
        setAutoStatus(data.automatic_check_status || "");
        setAutoNotes(data.automatic_check_notes || "");
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
    const files = [idFile, ...(sellerType === "business" && businessFile ? [businessFile] : [])];
    for (const file of files) {
      if (!allowed.includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) {
        setMessage("Documents must be readable JPG, PNG, WEBP, or PDF files and maximum 5 MB each."); return;
      }
    }
    if (legalName.trim().length < 5 || phone.trim().length < 7 || address.trim().length < 8) {
      setMessage("Please enter a complete legal name, valid phone number, and full address."); return;
    }
    if (!readabilityConfirmed) { setMessage("Please confirm that the uploaded documents are clear, complete, and readable."); return; }
    if (sellerType === "business" && (!businessName.trim() || !registrationType)) {
      setMessage("Please complete the business registration details."); return;
    }

    setSubmitting(true); setMessage("");
    let idPath: string | null = null;
    let businessPath: string | null = null;
    try {
      const { data: auth, error: authError } = await supabase.auth.getSession();
      const user = auth.session?.user;
      if (authError || !user) throw new Error("Please log in first.");

      const [idHash, businessHash] = await Promise.all([
        sha256(idFile),
        sellerType === "business" && businessFile ? sha256(businessFile) : Promise.resolve(null)
      ]);
      const { data: duplicateRows, error: duplicateError } = await supabase.rpc("check_seller_verification_duplicates", {
        p_id_document_hash: idHash,
        p_business_document_hash: businessHash
      });
      if (duplicateError) throw new Error("Automatic duplicate checking is not installed yet. Please contact support before submitting.");

      const duplicate = Array.isArray(duplicateRows) ? duplicateRows[0] : duplicateRows;
      const duplicateId = Boolean(duplicate?.duplicate_id_document);
      const duplicateBusiness = Boolean(duplicate?.duplicate_business_document);
      const automaticStatus = duplicateId || duplicateBusiness ? "failed" : "passed";
      const automaticNotes = duplicateId
        ? "The uploaded government ID file matches a document already submitted by another account. Manual review required."
        : duplicateBusiness
          ? "The uploaded business document file matches a document already submitted by another account. Manual review required."
          : "Basic checks passed: required fields, allowed file types, file size, and duplicate-file fingerprint. Document authenticity and identity have not been independently verified.";

      const upload = async (file: File, label: string) => {
        const ext = file.name.split(".").pop()?.toLowerCase() || "file";
        const path = user.id + "/" + crypto.randomUUID() + "-" + label + "." + ext;
        const { error } = await supabase!.storage.from("seller-verification-docs").upload(path,file,{upsert:false,contentType:file.type});
        if (error) throw error;
        return path;
      };
      idPath = await upload(idFile,"id");
      if (sellerType === "business" && businessFile) businessPath = await upload(businessFile,"business");

      const payload = {
        seller_id:user.id, seller_type:sellerType, legal_name:legalName.trim(),
        phone:phone.trim(), email:user.email || email, address:address.trim(),
        facebook_url:facebookUrl.trim() || null,
        business_name:sellerType === "business" ? businessName.trim() : null,
        registration_type:sellerType === "business" ? registrationType : null,
        id_document_path:idPath, business_document_path:businessPath,
        id_document_hash:idHash, business_document_hash:businessHash,
        automatic_check_status:automaticStatus, automatic_check_notes:automaticNotes,
        status:"pending", rejection_reason:null
      };
      const { error } = await supabase.from("seller_verifications").upsert(payload,{onConflict:"seller_id"});
      if (error) throw error;
      setStatus("pending"); setReason(""); setAutoStatus(automaticStatus); setAutoNotes(automaticNotes);
      setMessage(duplicateId || duplicateBusiness
        ? "Submitted for manual review. The automatic checker detected a duplicate document file; posting remains locked."
        : "Automatic checks passed. Your documents are now awaiting final administrator review; posting remains locked.");
    } catch (error) {
      if (idPath || businessPath) {
        await supabase.storage.from("seller-verification-docs").remove([...(idPath ? [idPath] : []), ...(businessPath ? [businessPath] : [])]);
      }
      setMessage(error instanceof Error ? error.message : "Unable to submit verification.");
    } finally { setSubmitting(false); }
  }

  if (loading) return <main className="panel">Loading verification...</main>;

  return (
    <>
      <header className="top"><Link className="brand" href="/">SOLE MARKET PH</Link><nav><Link href="/dashboard">Dashboard</Link><Link href="/">Marketplace</Link></nav></header>
      <main><section className="panel" style={{maxWidth:720,margin:"32px auto"}}>
        <h1>Seller Verification</h1>
        <p className="muted">Free automatic checks validate required details, file type, file size, and duplicate-file fingerprints. They cannot confirm whether an ID is genuine or whether the uploader is its owner. Documents remain private and posting stays locked until final approval.</p>
        {status === "verified" ? <div className="notice"><strong>Verified Seller</strong><p>Your seller account is verified. You can now post products.</p></div> :
         status === "pending" ? <div className="notice"><strong>Pending Verification</strong><p>Your request is awaiting final administrator review.</p>{autoStatus && <p>Automatic check: <strong>{autoStatus.toUpperCase()}</strong></p>}{autoNotes && <p>{autoNotes}</p>}</div> :
         <form onSubmit={submit}>
          {status === "rejected" && <div className="notice"><strong>Verification needs changes:</strong> {reason || "Please review and resubmit your documents."}</div>}
          <div className="field"><label>Seller type *</label><select value={sellerType} onChange={e=>setSellerType(e.target.value as SellerType)}><option value="personal">Personal Seller – personal Facebook / Messenger</option><option value="business">Business/Page Seller – Facebook Business Page</option></select></div>
          <div className="field"><label>Full legal name (as shown on ID) *</label><input required minLength={5} value={legalName} onChange={e=>setLegalName(e.target.value)} /></div>
          <div className="field"><label>Mobile number *</label><input required minLength={7} type="tel" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
          <div className="field"><label>Email address</label><input readOnly value={email} /></div>
          <div className="field"><label>Complete address *</label><textarea required minLength={8} rows={3} value={address} onChange={e=>setAddress(e.target.value)} /></div>
          <div className="field"><label>Facebook / Messenger / Page link (optional)</label><input type="url" value={facebookUrl} onChange={e=>setFacebookUrl(e.target.value)} placeholder="https://facebook.com/... or https://m.me/..." /></div>
          <div className="field"><label>Valid government ID * (JPG, PNG, WEBP, PDF; max 5 MB)</label><input required type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={e=>setIdFile(e.target.files?.[0] || null)} /></div>
          {sellerType === "business" && <>
            <h2>Business registration</h2>
            <div className="field"><label>Registered business name *</label><input required value={businessName} onChange={e=>setBusinessName(e.target.value)} /></div>
            <div className="field"><label>Registration type *</label><select value={registrationType} onChange={e=>setRegistrationType(e.target.value)}><option value="DTI">DTI</option><option value="SEC">SEC</option><option value="CDA">CDA</option><option value="OTHER">Other applicable registration</option></select></div>
            <div className="field"><label>Business registration document * (JPG, PNG, WEBP, PDF; max 5 MB)</label><input required type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={e=>setBusinessFile(e.target.files?.[0] || null)} /></div>
          </>}
          <div className="field"><label><input type="checkbox" checked={readabilityConfirmed} onChange={e=>setReadabilityConfirmed(e.target.checked)} required /> I confirm that all uploaded documents are clear, complete, and readable.</label></div>
          <button type="submit" disabled={submitting}>{submitting ? "Running automatic checks..." : "Run checks & submit"}</button>
         </form>}
        {message && <p className="notice" role="status">{message}</p>}
        <p className="muted" style={{fontSize:12,marginTop:20}}>Documents are collected only for seller verification. Do not upload unrelated personal information.</p>
      </section></main>
    </>
  );
}
