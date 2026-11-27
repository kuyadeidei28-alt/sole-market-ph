"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Message = { id: string; sender_id: string; body: string; created_at: string };
type Room = "general" | "legit-check" | "wts-wtb";

export default function ChatPage() {
  const [mode, setMode] = useState<"group" | "direct">("group");
  const [room, setRoom] = useState<Room>("general");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationIds, setConversationIds] = useState<string[]>([]);
  const [activeConversation, setActiveConversation] = useState("");
  const [otherUserId, setOtherUserId] = useState("");
  const [draft, setDraft] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState("Checking account…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) { setStatus("Supabase connection is not configured."); return; }
    let alive = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!alive) return;
      if (error) setStatus(error.message);
      setUserId(data.user?.id || null);
      setStatus(data.user ? "Connected" : "Please log in to use chat.");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id || null);
      setStatus(session?.user ? "Connected" : "Please log in to use chat.");
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  const loadConversations = async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase.from("direct_conversation_members")
      .select("conversation_id").eq("user_id", userId);
    if (error) { setStatus("Unable to load private conversations: " + error.message); return; }
    const ids = [...new Set((data || []).map(row => row.conversation_id))];
    setConversationIds(ids);
    if (!activeConversation && ids.length) setActiveConversation(ids[0]);
  };

  useEffect(() => { void loadConversations(); }, [userId]);

  useEffect(() => {
    const client = supabase;
    if (!client || !userId) return;
    let alive = true;
    async function load() {
      if (mode === "direct" && !activeConversation) { setMessages([]); return; }
      const query = mode === "group"
        ? client!.from("community_messages").select("id,sender_id,body,created_at").eq("room", room)
        : client!.from("direct_messages").select("id,sender_id,body,created_at").eq("conversation_id", activeConversation);
      const { data, error } = await query.order("created_at", { ascending: true }).limit(100);
      if (!alive) return;
      if (error) { setStatus("Chat setup needed: " + error.message); setMessages([]); return; }
      setMessages((data || []) as Message[]);
    }
    void load();
    const table = mode === "group" ? "community_messages" : "direct_messages";
    const channel = client!.channel("sole-chat-" + mode + "-" + (mode === "group" ? room : activeConversation))
      .on("postgres_changes", { event: "INSERT", schema: "public", table }, payload => {
        const row = payload.new as Message & { room?: string; conversation_id?: string };
        if (mode === "group" ? row.room === room : row.conversation_id === activeConversation) {
          setMessages(prev => prev.some(m => m.id === row.id) ? prev : [...prev, row]);
        }
      }).subscribe();
    return () => { alive = false; void client!.removeChannel(channel); };
  }, [mode, room, activeConversation, userId]);

  const startConversation = async () => {
    if (!supabase || !userId || busy) return;
    const target = otherUserId.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target)) {
      setStatus("Enter a valid seller/buyer account UUID.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("start_direct_conversation", { p_other_user_id: target });
    if (error) setStatus(error.message);
    else {
      const id = data as string;
      setMode("direct");
      setActiveConversation(id);
      setOtherUserId("");
      setStatus("Private conversation ready.");
      await loadConversations();
    }
    setBusy(false);
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || !supabase || !userId || busy) return;
    if (mode === "direct" && !activeConversation) { setStatus("Start a private conversation first."); return; }
    setBusy(true);
    const client = supabase;
    if (!client) { setStatus("Supabase connection is not configured."); setBusy(false); return; }
    const result = mode === "group"
      ? await client.from("community_messages").insert({ sender_id: userId, room, body })
      : await client.from("direct_messages").insert({ sender_id: userId, conversation_id: activeConversation, body });
    if (result.error) setStatus(result.error.message);
    else setDraft("");
    setBusy(false);
  };

  const rooms = useMemo(() => [
    { id: "general" as Room, label: "General" },
    { id: "legit-check" as Room, label: "Legit Check" },
    { id: "wts-wtb" as Room, label: "Want to Sell / Buy" }
  ], []);

  return <>
    <header className="top">
      <Link className="brand" href="/">SOLE MARKET PH</Link>
      <nav><Link href="/">Marketplace</Link><Link href="/sellers">Sellers</Link><Link href="/community">Community</Link><Link href="/login">Login</Link></nav>
    </header>
    <main style={{maxWidth:1100}}>
      <section className="hero"><h1>SOLE MARKET CHAT</h1><p>Connect with sneaker buyers, sellers, and collectors. Join public rooms or message another member privately.</p></section>
      {!userId ? <section className="panel"><h2>Login required</h2><p className="muted">Mag-login muna para makabasa at makapagpadala ng messages.</p><Link className="btn" href="/login">Login to Chat</Link></section> :
      <div style={{display:"grid",gridTemplateColumns:"minmax(220px,280px) minmax(0,1fr)",gap:18}}>
        <aside className="panel" style={{margin:0,padding:16,minWidth:0}}>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <button onClick={()=>setMode("group")} className={mode==="group"?"":"secondary"}>Group Chat</button>
            <button onClick={()=>setMode("direct")} className={mode==="direct"?"":"secondary"}>Private</button>
          </div>
          {mode === "group" ? <>
            <strong>COMMUNITY ROOMS</strong>
            {rooms.map(item=><button key={item.id} className="secondary" style={{display:"block",width:"100%",marginTop:9,textAlign:"left",background:room===item.id?"#dbe7ff":"#e8edf7"}} onClick={()=>setRoom(item.id)}># {item.label}</button>)}
          </> : <>
            <strong>PRIVATE MESSAGES</strong>
            <p className="muted">Start a private chat using the other member's account UUID.</p>
            <input value={otherUserId} onChange={e=>setOtherUserId(e.target.value)} placeholder="Seller / buyer account UUID" style={{marginTop:8}} />
            <button onClick={()=>void startConversation()} disabled={busy||!otherUserId.trim()} style={{width:"100%",marginTop:8}}>{busy?"Please wait…":"Start Chat"}</button>
            <div style={{marginTop:18}}><strong>Your conversations</strong>
              {conversationIds.length===0 ? <p className="muted">No private conversations yet.</p> : conversationIds.map(id=><button key={id} className="secondary" onClick={()=>setActiveConversation(id)} style={{display:"block",width:"100%",marginTop:8,textAlign:"left",background:activeConversation===id?"#dbe7ff":"#e8edf7"}}>Chat · {id.slice(0,8)}…</button>)}
            </div>
          </>}
        </aside>
        <section className="panel" style={{margin:0,padding:16,minHeight:500,display:"flex",flexDirection:"column",minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,borderBottom:"1px solid #e3e8f2",paddingBottom:12}}>
            <div><h2 style={{margin:"0 0 4px"}}>{mode==="group" ? "# "+rooms.find(r=>r.id===room)?.label : "Private conversation"}</h2><span className="muted">{status}</span></div>
            <span style={{fontSize:12,color:"#64718a"}}>LIVE CHAT</span>
          </div>
          <div style={{flex:1,minHeight:300,maxHeight:440,overflowY:"auto",padding:"16px 2px"}}>
            {mode==="direct"&&!activeConversation ? <p className="muted" style={{textAlign:"center",padding:40}}>Pumili ng existing chat o magsimula ng bago.</p> :
              messages.length===0 ? <p className="muted" style={{textAlign:"center",padding:40}}>Wala pang messages dito. Ikaw ang maunang bumati!</p> :
              messages.map(m=><div key={m.id} style={{display:"flex",justifyContent:m.sender_id===userId?"flex-end":"flex-start",marginBottom:10}}><div style={{background:m.sender_id===userId?"#e7efff":"#f1f4f9",padding:"10px 13px",borderRadius:14,maxWidth:"82%"}}><p style={{margin:0,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{m.body}</p><small className="muted">{m.sender_id===userId?"You":"Member"} · {new Date(m.created_at).toLocaleTimeString()}</small></div></div>)}
          </div>
          <div style={{display:"flex",gap:8,borderTop:"1px solid #e3e8f2",paddingTop:12}}>
            <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void send();}} placeholder="Write a message…" disabled={!userId||(mode==="direct"&&!activeConversation)} />
            <button onClick={()=>void send()} disabled={!userId||busy||!draft.trim()||(mode==="direct"&&!activeConversation)}>{busy?"Sending…":"Send"}</button>
          </div>
        </section>
      </div>}
      <p className="muted" style={{marginTop:14}}>Be respectful. Never share passwords, OTPs, or payment PINs in chat.</p>
    </main>
    <style jsx>{`@media(max-width:700px){main>div{grid-template-columns:1fr!important}.top nav{gap:10px;flex-wrap:wrap}}`}</style>
  </>;
}
