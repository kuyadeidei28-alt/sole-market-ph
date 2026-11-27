"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Message = { id: string; sender_id: string; body: string; created_at: string };
type Conversation = { id: string; title: string; kind: "group" | "direct" };

export default function ChatPage() {
  const [mode, setMode] = useState<"group" | "direct">("group");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("general");
  const [draft, setDraft] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState("Checking account…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) { setStatus("Chat database is not connected yet."); return; }
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setUserId(data.user?.id || null);
      setStatus(data.user ? "Connected" : "Log in to send messages");
    });
    const channel = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id || null);
      setStatus(session?.user ? "Connected" : "Log in to send messages");
    });
    return () => { alive = false; channel.data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase || !userId) return;
    let alive = true;
    async function load() {
      if (mode === "group") {
        const { data, error } = await supabase.from("community_messages").select("id,sender_id,body,created_at").eq("room", activeId).order("created_at", { ascending: true }).limit(100);
        if (!alive) return;
        if (error) { setStatus("Chat tables are not installed yet. Apply the chat migration to enable messaging."); return; }
        setMessages((data || []) as Message[]);
      } else {
        const { data, error } = await supabase.from("direct_messages").select("id,sender_id,body,created_at").eq("conversation_id", activeId).order("created_at", { ascending: true }).limit(100);
        if (!alive) return;
        if (error) { setStatus("Private chat database setup is still pending."); return; }
        setMessages((data || []) as Message[]);
      }
    }
    void load();
    const table = mode === "group" ? "community_messages" : "direct_messages";
    const channel = supabase.channel("chat-" + mode + "-" + activeId).on("postgres_changes", { event: "INSERT", schema: "public", table }, (payload) => {
      const row = payload.new as Message;
      if (mode === "group" || (payload.new as any).conversation_id === activeId) setMessages(prev => prev.some(m => m.id === row.id) ? prev : [...prev, row]);
    }).subscribe();
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, [mode, activeId, userId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !supabase || !userId || busy) return;
    setBusy(true);
    const payload = mode === "group"
      ? { sender_id: userId, room: activeId, body }
      : { sender_id: userId, conversation_id: activeId, body };
    const { error } = await supabase.from(mode === "group" ? "community_messages" : "direct_messages").insert(payload);
    if (error) setStatus(error.message);
    else setDraft("");
    setBusy(false);
  };

  const rooms = useMemo(() => ["general", "legit-check", "wts-wtb"], []);
  return <>
    <header className="top"><Link className="brand" href="/">SOLE MARKET PH</Link><nav><Link href="/">Marketplace</Link><Link href="/sellers">Sellers</Link><Link href="/community">Community</Link><Link href="/login">Login</Link></nav></header>
    <main style={{maxWidth:1100}}>
      <section className="hero"><h1>SOLE MARKET CHAT</h1><p>Connect with sneaker buyers, sellers, and collectors. Public community rooms and private buyer-to-seller conversations in one place.</p></section>
      <div style={{display:"grid",gridTemplateColumns:"minmax(190px,260px) minmax(0,1fr)",gap:18}}>
        <aside className="panel" style={{margin:0,padding:16}}>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <button onClick={()=>{setMode("group");setActiveId("general");}}>Group</button>
            <button className="secondary" onClick={()=>setMode("direct")}>Private</button>
          </div>
          <strong>{mode === "group" ? "COMMUNITY ROOMS" : "PRIVATE MESSAGES"}</strong>
          {mode === "group" ? rooms.map(room=><button key={room} className="secondary" style={{display:"block",width:"100%",marginTop:9,textAlign:"left"}} onClick={()=>setActiveId(room)}># {room.replaceAll("-"," ")}</button>) :
            <div className="notice" style={{marginTop:12}}>Private conversations appear here when a buyer or seller starts a conversation from a listing. Conversation creation and participant controls are part of the database setup.</div>}
          {mode === "direct" && <input style={{marginTop:12}} value={activeId === "general" ? "" : activeId} onChange={e=>setActiveId(e.target.value)} placeholder="Conversation ID (test/setup)" />}
        </aside>
        <section className="panel" style={{margin:0,padding:16,minHeight:490,display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,borderBottom:"1px solid #e3e8f2",paddingBottom:12}}>
            <div><h2 style={{margin:"0 0 4px"}}>{mode === "group" ? "# " + activeId.replaceAll("-"," ") : "Private conversation"}</h2><span className="muted">{status}</span></div>
            <span style={{fontSize:12,color:"#64718a"}}>REAL-TIME CHAT</span>
          </div>
          <div style={{flex:1,minHeight:300,maxHeight:430,overflowY:"auto",padding:"16px 2px"}}>
            {!userId ? <div className="notice">Mag-login muna para makapasok at makapagpadala ng messages. <Link href="/login" style={{fontWeight:800,textDecoration:"underline"}}>Login here</Link></div> :
              messages.length === 0 ? <p className="muted" style={{textAlign:"center",padding:40}}>Wala pang messages dito. Ikaw ang maunang bumati!</p> :
              messages.map(m=><div key={m.id} style={{display:"flex",justifyContent:m.sender_id===userId?"flex-end":"flex-start",marginBottom:10}}><div style={{background:m.sender_id===userId?"#e7efff":"#f1f4f9",padding:"10px 13px",borderRadius:14,maxWidth:"82%"}}><p style={{margin:0,whiteSpace:"pre-wrap"}}>{m.body}</p><small className="muted">{m.sender_id===userId?"You":"Member"} · {new Date(m.created_at).toLocaleTimeString()}</small></div></div>)}
          </div>
          <div style={{display:"flex",gap:8,borderTop:"1px solid #e3e8f2",paddingTop:12}}>
            <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void send();}} placeholder="Write a message…" disabled={!userId}/>
            <button onClick={()=>void send()} disabled={!userId||busy||!draft.trim()}>{busy?"Sending…":"Send"}</button>
          </div>
        </section>
      </div>
      <p className="muted" style={{marginTop:14}}>Please keep conversations respectful. Report suspicious users and never share passwords or payment PINs.</p>
    </main>
  </>;
}
