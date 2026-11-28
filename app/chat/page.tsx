import Link from "next/link";

export default function ChatPage() {
  return (
    <>
      <header className="top">
        <Link className="brand" href="/">SOLE MARKET PH</Link>
        <nav>
          <Link href="/">Marketplace</Link>
          <Link href="/sellers">Sellers</Link>
          <Link href="/community">Community</Link>
        </nav>
      </header>
      <main style={{maxWidth:900,margin:"0 auto",padding:"32px 18px 70px"}}>
        <section style={{
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          minHeight:300,padding:"28px 20px",textAlign:"center",
          background:"#fff",border:"1.5px solid #8b5cf6",borderRadius:16,
          boxShadow:"0 5px 14px rgba(124,58,237,.10)"
        }}>
          <div aria-hidden="true" style={{
            width:48,height:48,display:"grid",placeItems:"center",
            borderRadius:14,background:"#f7f2ff",color:"#6d28d9",marginBottom:14
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24">
              <rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor"/>
              <path d="M8 10V7a4 4 0 1 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="12" cy="15" r="1.2" fill="#fff"/>
            </svg>
          </div>
          <p style={{margin:0,color:"#64748b",fontSize:11,fontWeight:900,letterSpacing:2}}>SOLE MARKET PH COMMUNITY</p>
          <h1 style={{margin:"8px 0 10px",color:"#111827",fontSize:"clamp(27px,5vw,38px)",fontWeight:900}}>Website Chat</h1>
          <span style={{
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            padding:"6px 12px",borderRadius:20,background:"#DC2626",
            color:"#fff",fontSize:10,fontWeight:900,letterSpacing:".3px"
          }}>COMING SOON</span>
          <p style={{maxWidth:460,margin:"16px 0 0",color:"#64748b",fontSize:14,lineHeight:1.7}}>
            Our community chat is being prepared. Soon, sneaker buyers, sellers, and collectors will be able to connect here.
          </p>
          <Link href="/community" style={{marginTop:20,color:"#075ce5",fontWeight:800,textDecoration:"none"}}>← Back to Community</Link>
        </section>
      </main>
    </>
  );
}
