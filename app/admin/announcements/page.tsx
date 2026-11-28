"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Announcement = { id:string; title:string; body:string; url:string; sent_count:number; failed_count:number; created_at:string };

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [loading,setLoading] = useState(true);
  const [sending,setSending] = useState(false);
  const [title,setTitle] = useState("");
  const [body,setBody] = useState("");
  const [url,setUrl] = useState("/announcements");
  const [history,setHistory] = useState<Announcement[]>([]);
  const [status,setStatus] = useState("");
  const [error,setError] = useState("");

  async function load() {
    if (!supabase) { setError("Supabase is not configured."); setLoading(false); return; }
    const {data:sessionData} = await supabase.auth.getSession();
    if (!sessionData.session?.user) { router.replace("/login"); return; }
    const {data:admin,error:adminError} = await supabase.rpc("is_sole_market_admin");
    if (adminError || admin !== true) { setError("Admin access required."); setLoading(false); return; }
    const {data,error:listError} = await supabase.from("announcements")
      .select("id,title,body,url,sent_count,failed_count,created_at")
      .order("created_at",{ascending:false}).limit(30);
    if (listError) setError(listError.message);
    else setHistory((data || []) as Announcement[]);
    setLoading(false);
  }
  useEffect(()=>{ void load(); },[]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    if (!window.confirm("Publish this announcement and send a push notification to all subscribed devices?")) return;
    setSending(true); setError(""); setStatus("");
    try {
      const {data} = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session expired. Please log in again.");
      const response = await fetch("/api/push/send",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
        body:JSON.stringify({title,body,url}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send announcement.");
      setStatus("Published! Sent: "+result.sent+" · Failed: "+result.failed+" · Subscribed devices: "+result.total+".");
      setTitle(""); setBody(""); setUrl("/announcements");
      await load();
    } catch(e) { setError(e instanceof Error ? e.message : "Unable to send announcement."); }
    finally { setSending(false); }
  }

  if (loading) return <main style={s.page}>Loading announcement tools…</main>;
  return (
    <main style={s.page}>
      <div style={s.container}>
        <header style={s.header}>
          <div><p style={s.kicker}>SOLE MARKET PH ADMIN</p><h1 style={s.heading}>Announcements</h1><p style={s.muted}>Publish an update and notify every subscribed device.</p></div>
          <Link href="/admin" style={s.back}>← Admin Dashboard</Link>
        </header>
        {error && <p role="alert" style={s.error}>{error}</p>}
        {status && <p role="status" style={s.success}>{status}</p>}
        <form onSubmit={send} style={s.card}>
          <h2 style={s.subheading}>New announcement</h2>
          <label style={s.label}>Title <span>{title.length}/80</span></label>
          <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} required placeholder="e.g. New marketplace update!" style={s.input}/>
          <label style={s.label}>Message <span>{body.length}/240</span></label>
          <textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={240} required rows={4} placeholder="Write your announcement…" style={s.textarea}/>
          <label style={s.label}>Open this page when tapped</label>
          <select value={url} onChange={e=>setUrl(e.target.value)} style={s.input}>
            <option value="/announcements">Announcement page</option><option value="/">Marketplace home</option><option value="/community">Community</option><option value="/sellers">Seller Directory</option>
          </select>
          <button disabled={sending || !title.trim() || !body.trim()} style={s.send}>{sending ? "Sending notifications…" : "📣 Publish & Send to All Subscribers"}</button>
          <p style={s.note}>Only users who enabled notifications on their device receive a push. The announcement is also saved on the website.</p>
        </form>
        <section style={s.card}>
          <h2 style={s.subheading}>Recent announcements</h2>
          {history.length===0 ? <p style={s.muted}>No announcements yet.</p> : history.map(item=>(
            <article key={item.id} style={s.history}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><strong>{item.title}</strong><small>{new Date(item.created_at).toLocaleString()}</small></div>
              <p style={s.muted}>{item.body}</p><small>Sent: {item.sent_count} · Failed: {item.failed_count}</small>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
const s:Record<string,React.CSSProperties>={
 page:{minHeight:"100vh",background:"#f4f7fb",padding:"28px 16px 70px",color:"#111827"},
 container:{maxWidth:820,margin:"0 auto"},
 header:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",marginBottom:22},
 kicker:{fontSize:11,fontWeight:900,letterSpacing:2,color:"#075ce5",margin:0},
 heading:{fontSize:30,fontWeight:900,margin:"6px 0"},
 muted:{color:"#64748b",lineHeight:1.6,fontSize:13},
 back:{color:"#075ce5",fontWeight:800,fontSize:13},
 card:{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:22,marginTop:18,boxShadow:"0 5px 20px rgba(15,23,42,.04)"},
 subheading:{fontSize:19,fontWeight:900,margin:"0 0 18px"},
 label:{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:800,margin:"15px 0 7px"},
 input:{display:"block",width:"100%",border:"1px solid #cbd5e1",borderRadius:10,padding:"12px 13px",background:"#fff",color:"#111827"},
 textarea:{display:"block",width:"100%",resize:"vertical",border:"1px solid #cbd5e1",borderRadius:10,padding:"12px 13px",background:"#fff",color:"#111827",lineHeight:1.5},
 send:{width:"100%",marginTop:18,padding:14,border:0,borderRadius:11,background:"#075ce5",color:"#fff",fontWeight:900,fontSize:14},
 note:{fontSize:11,color:"#64748b",lineHeight:1.5},
 error:{padding:12,borderRadius:10,background:"#fee2e2",color:"#991b1b"},
 success:{padding:12,borderRadius:10,background:"#dcfce7",color:"#166534"},
 history:{borderTop:"1px solid #e2e8f0",padding:"15px 0"},
};
