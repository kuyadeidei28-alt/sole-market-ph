"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Announcement = { id:string; title:string; body:string; url:string; created_at:string };

export default function AnnouncementsPage() {
  const [items,setItems] = useState<Announcement[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  useEffect(() => {
    async function load() {
      if (!supabase) { setError("Announcements are temporarily unavailable."); setLoading(false); return; }
      const {data,error} = await supabase.from("announcements")
        .select("id,title,body,url,created_at").eq("published",true)
        .order("created_at",{ascending:false}).limit(50);
      if(error) setError(error.message);
      else setItems((data || []) as Announcement[]);
      setLoading(false);
    }
    void load();
  },[]);
  return (
    <main style={{minHeight:"100vh",background:"#f7f9fc",padding:"30px 16px 70px"}}>
      <div style={{maxWidth:780,margin:"0 auto"}}>
        <Link href="/" style={{color:"#075ce5",fontWeight:800,fontSize:13}}>← Marketplace</Link>
        <p style={{color:"#075ce5",fontSize:11,fontWeight:900,letterSpacing:2,margin:"26px 0 5px"}}>STAY IN THE LOOP</p>
        <h1 style={{fontSize:32,fontWeight:900,margin:"0 0 8px",color:"#111827"}}>SOLE MARKET PH Updates</h1>
        <p style={{color:"#64748b",fontSize:14,lineHeight:1.6}}>Official announcements, marketplace updates, and important notices.</p>
        {loading ? <p>Loading announcements…</p> : error ? <p style={{color:"#b91c1c"}}>{error}</p> : items.length===0 ? <section style={{marginTop:24,padding:24,background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,color:"#64748b"}}>No announcements yet. Check back soon!</section> : items.map(item => (
          <article key={item.id} style={{marginTop:15,padding:20,background:"#fff",border:"1px solid #e2e8f0",borderRadius:15}}>
            <small style={{color:"#64748b"}}>{new Date(item.created_at).toLocaleString()}</small>
            <h2 style={{fontSize:20,fontWeight:900,color:"#111827",margin:"8px 0"}}>{item.title}</h2>
            <p style={{color:"#475569",fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{item.body}</p>
            <Link href={item.url || "/"} style={{display:"inline-block",marginTop:8,color:"#075ce5",fontWeight:800,fontSize:13}}>Open related page →</Link>
          </article>
        ))}
      </div>
    </main>
  );
}
