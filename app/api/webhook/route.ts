import {NextRequest,NextResponse} from "next/server";
import {validSignature,sendText} from "../../../src/whatsapp";
import {processInbound} from "../../../src/processor";
import {dbReady,getConversation,stageInbound,claimOutbound,finishOutbound,search} from "../../../src/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export function GET(req:NextRequest){
 const p=req.nextUrl.searchParams;
 return p.get("hub.mode")==="subscribe"
  &&Boolean(process.env.WHATSAPP_WEBHOOK_VERIFICATION_TOKEN)
  &&p.get("hub.verify_token")===process.env.WHATSAPP_WEBHOOK_VERIFICATION_TOKEN
  ?new Response(p.get("hub.challenge")||"",{headers:{"Cache-Control":"no-store"}})
  :new Response("Forbidden",{status:403});
}
type Incoming={id?:string;from?:string;text?:{body?:string};interactive?:{button_reply?:{id?:string};list_reply?:{id?:string}}};
type Payload={entry?:Array<{changes?:Array<{value?:{messages?:Incoming[]}}>} >};
export async function POST(req:NextRequest){
 if(Number(req.headers.get("content-length")||0)>1024*1024)return new Response("Payload too large",{status:413});
 const raw=await req.text();
 if(raw.length>1024*1024)return new Response("Payload too large",{status:413});
 if(!validSignature(raw,req.headers.get("x-hub-signature-256"),process.env.WHATSAPP_APP_SECRET||""))
  return new Response("Unauthorized",{status:401});
 if(!dbReady())return new Response("Database not configured",{status:503});
 let payload:Payload;
 try{payload=JSON.parse(raw) as Payload;}catch{return new Response("Invalid JSON",{status:400});}
 if(!payload||!Array.isArray(payload.entry))return new Response("Invalid payload",{status:400});
 const incoming=payload.entry.flatMap(e=>e.changes?.flatMap(c=>c.value?.messages||[])||[]);
 if(incoming.length>50)return new Response("Too many messages",{status:413});
 let retry=false;let review=false;
 for(const m of incoming){
  const input=m.text?.body||m.interactive?.button_reply?.id||m.interactive?.list_reply?.id;
  if(!m.id||!m.from||!input||!/^\d{6,18}$/.test(m.from)||m.id.length>256)continue;
  try{
   const outcome=await processInbound(m.from,m.id,input.slice(0,1000),{
    getConversation,stageInbound,claimOutbound,finishOutbound,search,sendText
   });
   if(outcome==="queued_for_retry")retry=true;
   if(outcome==="needs_review")review=true;
  }catch(e){console.error("Webhook processing failed",e);return new Response("Retry later",{status:503});}
 }
 if(retry)return new Response("Retry after rate limit",{status:503});
 return NextResponse.json({received:true,review_required:review},{headers:{"Cache-Control":"no-store"}});
}
