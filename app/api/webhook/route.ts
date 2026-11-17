import {NextRequest,NextResponse} from "next/server";
import {validSignature,sendText} from "../../../src/whatsapp";
import {respond,type FlowState} from "../../../src/concierge";
import {dbReady,getConversation,seen,message,update,request,search} from "../../../src/db";
export const runtime="nodejs";
export function GET(req:NextRequest){const p=req.nextUrl.searchParams;return p.get("hub.mode")==="subscribe"&&Boolean(process.env.WHATSAPP_WEBHOOK_VERIFICATION_TOKEN)&&p.get("hub.verify_token")===process.env.WHATSAPP_WEBHOOK_VERIFICATION_TOKEN?new Response(p.get("hub.challenge")||""):new Response("Forbidden",{status:403});}
type Incoming={id?:string;from?:string;text?:{body?:string};interactive?:{button_reply?:{id?:string};list_reply?:{id?:string}}};
export async function POST(req:NextRequest){
 const raw=await req.text();
 if(!validSignature(raw,req.headers.get("x-hub-signature-256"),process.env.WHATSAPP_APP_SECRET||""))return new Response("Unauthorized",{status:401});
 if(!dbReady())return new Response("Database not configured",{status:503});
 let payload:{entry?:Array<{changes?:Array<{value?:{messages?:Incoming[]}}>} >};
 try{payload=JSON.parse(raw);}catch{return new Response("Invalid JSON",{status:400});}
 const incoming=payload.entry?.flatMap(e=>e.changes?.flatMap(c=>c.value?.messages||[])||[])||[];
 for(const m of incoming){
  const input=m.text?.body||m.interactive?.button_reply?.id||m.interactive?.list_reply?.id;
  if(!m.id||!m.from||!input)continue;
  try{
   if(await seen(m.id))continue;
   const c=await getConversation(m.from);
   const r=respond(input,c.state as FlowState);
   const reply=r.lookup?await search(input,r.lookup):r.reply;
   await message(c.id,"inbound",input,m.id);
   if(r.request)await request(c.id,r.request,r.details||input);
   await update(c.id,r.state,r.handoff??c.human_handoff);
   if(c.human_handoff&&r.state==="human")continue;
   await sendText(m.from,reply);
   await message(c.id,"outbound",reply);
  }catch(e){console.error("Webhook processing error",e);return new Response("Retry later",{status:503});}
 }
 return NextResponse.json({received:true});
}