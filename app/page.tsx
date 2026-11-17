"use client";
import {useState} from "react";
import {MENU,respond,type FlowState} from "../src/concierge";
export default function Page(){
 const [state,setState]=useState<FlowState>("menu");
 const [messages,setMessages]=useState<{who:string;text:string}[]>([{who:"bot",text:MENU}]);
 const [draft,setDraft]=useState("");
 function send(s:string){if(!s.trim())return;const r=respond(s,state);setState(r.state);setMessages(m=>[...m,{who:"you",text:s},{who:"bot",text:r.lookup?"Demo mode: "+r.reply+" Live search requires server credentials.":r.reply}]);setDraft("");}
 return <main style={{maxWidth:650,margin:"auto",padding:24}}><header style={{textAlign:"center"}}><p style={{letterSpacing:5}}>STUDIO SERAAI</p><h1>Art Concierge</h1><p>A Gallery Where Walls Breathe Art.</p><p style={{fontSize:12,color:"#865f3c"}}>Interactive demo — not connected to WhatsApp</p></header><section style={{background:"white",border:"1px solid #ddd0c0",borderRadius:16,padding:16}}><div style={{height:400,overflowY:"auto",display:"flex",flexDirection:"column",gap:12}}>{messages.map((m,i)=><div key={i} style={{whiteSpace:"pre-wrap",alignSelf:m.who==="you"?"flex-end":"flex-start",background:m.who==="you"?"#e5d7c3":"#f4efe8",borderRadius:12,padding:14,maxWidth:"85%",font:"14px/1.5 Arial"}}>{m.text}</div>)}</div><div style={{display:"flex",gap:8,marginTop:16}}><input aria-label="Message" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send(draft)} placeholder="Type 1–5 or MENU" style={{flex:1,padding:12,minWidth:0}}/><button onClick={()=>send(draft)}>Send</button></div><div style={{display:"flex",gap:8,marginTop:12}}>{["1","2","3","4","5","MENU"].map(v=><button key={v} onClick={()=>send(v)}>{v}</button>)}</div></section></main>;
}