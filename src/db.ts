const url=()=>process.env.SUPABASE_URL?.replace(/\/$/,"");
const key=()=>process.env.SUPABASE_SECRET_KEY;
export const dbReady=()=>Boolean(url()&&key());
async function db<T>(table:string,method:string,query="",body?:unknown,prefer="return=representation"):Promise<T>{
 if(!dbReady())throw Error("Supabase not configured");
 const r=await fetch(url()+"/rest/v1/"+table+query,{method,headers:{apikey:key()!,Authorization:"Bearer "+key()!,"Content-Type":"application/json",Prefer:prefer},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});
 if(!r.ok)throw Error("Database request failed: "+table+" "+r.status);
 const s=await r.text();return(s?JSON.parse(s):null) as T;
}
type Conversation={id:string;phone:string;state:string;human_handoff:boolean};
export async function getConversation(phone:string){
 const rows=await db<Conversation[]>("seraai_whatsapp_conversations","GET","?phone=eq."+encodeURIComponent(phone)+"&select=id,phone,state,human_handoff");
 if(rows.length)return rows[0];
 const created=await db<Conversation[]>("seraai_whatsapp_conversations","POST","",{phone,state:"menu"},"resolution=merge-duplicates,return=representation");
 return created[0];
}
export async function seen(id:string){const rows=await db<{id:string}[]>("seraai_whatsapp_messages","GET","?provider_message_id=eq."+encodeURIComponent(id)+"&select=id&limit=1");return rows.length>0;}
export async function message(conversation_id:string,direction:"inbound"|"outbound",body:string,provider_message_id?:string){await db("seraai_whatsapp_messages","POST","",{conversation_id,direction,body,provider_message_id:provider_message_id||null},"return=minimal");}
export async function update(id:string,state:string,human_handoff:boolean){await db("seraai_whatsapp_conversations","PATCH","?id=eq."+id,{state,human_handoff,updated_at:new Date().toISOString(),last_inbound_at:new Date().toISOString()},"return=minimal");}
export async function request(conversation_id:string,request_type:string,details:string){await db("seraai_whatsapp_requests","POST","",{conversation_id,request_type,details},"return=minimal");}
export async function search(query:string,type:"artwork"|"artist"){
 const needle=query.toLowerCase().trim().slice(0,100);
 if(needle.length<2)return"Please provide at least two letters.";
 const rows=await db<{id:number;data:Record<string,unknown>}[]>("seraai_records","GET","?kind=eq.artwork&select=id,data&limit=1000");
 const found=rows.filter(r=>{const d=r.data;if(d.archived===true||String(d.status||"").toLowerCase()==="sold")return false;const str=type==="artist"?String(d.artist||""):[d.title,d.artist,d.style,d.webId,d.medium].join(" ");return str.toLowerCase().includes(needle);}).slice(0,5);
 if(!found.length)return"No matching catalogue entries found. Our team can assist. Reply MENU.";
 return found.map(r=>type==="artist"?String(r.data.artist||"Unknown"):String(r.data.title||"Untitled")+" — "+String(r.data.artist||"Unknown")+" (ID "+String(r.data.webId||r.id)+")").filter((v,i,a)=>a.indexOf(v)===i).join("\n")+"\n\nAvailability must be confirmed. Reply MENU.";
}