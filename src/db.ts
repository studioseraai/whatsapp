const url=()=>{const u=process.env.SUPABASE_URL;return u?.endsWith("/")?u.slice(0,-1):u;};
const key=()=>process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
export const dbReady=()=>Boolean(url()&&key());

async function db<T>(table:string,method:string,query="",body?:unknown,prefer="return=representation"):Promise<T>{
 if(!dbReady())throw Error("Supabase not configured");
 const headers:Record<string,string>={apikey:key()!,"Content-Type":"application/json",Prefer:prefer};
 if(!key()!.startsWith("sb_secret_"))headers.Authorization="Bearer "+key()!;
 const r=await fetch(url()+"/rest/v1/"+table+query,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});
 if(!r.ok)throw Error("Database request failed: "+table+" "+r.status);
 const s=await r.text();return(s?JSON.parse(s):null) as T;
}

export type Conversation={id:string;phone:string;state:string;human_handoff:boolean};
export async function getConversation(phone:string):Promise<Conversation>{
 const query="?phone=eq."+encodeURIComponent(phone)+"&select=id,phone,state,human_handoff";
 const rows=await db<Conversation[]>("seraai_whatsapp_conversations","GET",query);
 if(rows.length)return rows[0];
 await db("seraai_whatsapp_conversations","POST","?on_conflict=phone",{phone,state:"menu"},"resolution=ignore-duplicates,return=minimal");
 const created=await db<Conversation[]>("seraai_whatsapp_conversations","GET",query);
 if(!created.length)throw Error("Unable to initialize conversation");
 return created[0];
}

export type StageArgs={
 p_phone:string;p_provider_message_id:string;p_body:string;p_reply:string;
 p_expected_state:string;p_expected_handoff:boolean;p_state:string;p_handoff:boolean;
 p_request_type:string|null;p_request_details:string|null;
};
export type Staged={outbound_id:string|null;status:"pending"|"retry"|"sent"|"sending"|"needs_review"|"failed"|"stale_state"|"already_processed"|"suppressed"};
export async function stageInbound(args:StageArgs):Promise<Staged>{
 const rows=await db<Staged[]>("rpc/seraai_whatsapp_stage_inbound","POST","",args);
 if(!rows?.length)throw Error("Unable to stage inbound message");
 return rows[0];
}

export type Claimed={outbound_id:string;recipient:string;reply_body:string;attempts:number};
export async function claimOutbound(id:string):Promise<Claimed|null>{
 const rows=await db<Claimed[]>("rpc/seraai_whatsapp_claim_outbound","POST","",{p_id:id});
 return rows?.[0]||null;
}
export async function finishOutbound(id:string,status:"sent"|"retry"|"needs_review"|"failed",error?:string,providerId?:string|null){
 const change:Record<string,unknown>={delivery_status:status,delivery_error:error?.slice(0,150)||null};
 if(status==="sent"){change.delivered_at=new Date().toISOString();if(providerId)change.provider_message_id=providerId;}
 await db("seraai_whatsapp_messages","PATCH","?id=eq."+encodeURIComponent(id)+"&delivery_status=eq.sending",change,"return=minimal");
}

export function publishedEntry(d:Record<string,unknown>){
 const status=String(d.status||"").toLowerCase().replace(/[_-]/g," ").trim();
 return !(d.archived===true||String(d.archived).toLowerCase()==="true"||status==="sold"||status==="sold out");
}
export async function search(query:string,type:"artwork"|"artist"){
 const needle=query.toLowerCase().trim().slice(0,100);
 if(needle.length<2)return"Please provide at least two letters.";
 const published=await db<{artwork_id:number}[]>("seraai_publications","GET","?published=eq.true&select=artwork_id&limit=10000");
 const allowed=new Set(published.map(p=>Number(p.artwork_id)));
 const found:{id:number;data:Record<string,unknown>}[]=[];
 for(let offset=0;offset<10000&&found.length<5;offset+=500){
  const rows=await db<{id:number;data:Record<string,unknown>}[]>("seraai_records","GET","?kind=eq.artwork&select=id,data&order=id.asc&limit=500&offset="+offset);
  for(const r of rows){
   if(!allowed.has(Number(r.id))||!publishedEntry(r.data))continue;
   const d=r.data;
   const str=type==="artist"?String(d.artist||""):[d.title,d.artist,d.style,d.webId,d.medium].join(" ");
   if(str.toLowerCase().includes(needle))found.push(r);
   if(found.length===5)break;
  }
  if(rows.length<500)break;
 }
 if(!found.length)return"No matching published catalogue entries found. Our team can assist. Reply MENU.";
 const output=found.map(r=>type==="artist"?String(r.data.artist||"Unknown"):String(r.data.title||"Untitled")+" — "+String(r.data.artist||"Unknown")+" (ID "+String(r.data.webId||r.id)+")");
 return [...new Set(output)].join("\n")+"\n\nAvailability must be confirmed. Reply MENU.";
}
export async function checkDatabase(){
 await Promise.all(["seraai_whatsapp_conversations","seraai_whatsapp_messages","seraai_whatsapp_requests"].map(table=>db(table,"GET","?select=id&limit=0")));
 return true;
}
