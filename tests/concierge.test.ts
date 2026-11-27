import test from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {respond,MENU} from "../src/concierge";
import {validSignature,MetaSendError} from "../src/whatsapp";
import {processInbound,classifySendFailure,shouldSilence,type ConciergeDeps} from "../src/processor";
import {publishedEntry,type Conversation,type Staged,type Claimed} from "../src/db";

test("menu and options",()=>{
 assert.match(MENU,/Explore Artworks/);
 for(const [n,s] of [["1","artwork"],["2","artist"],["3","viewing"],["4","events"],["5","human"]])
  assert.equal(respond(n).state,s);
});
test("viewing stays pending, never a confirmed booking",()=>{
 const r=respond("Friday 5pm","viewing");
 assert.equal(r.request,"private_viewing");
 assert.match(r.reply,/not a confirmed booking/);
});
test("human handoff, unsubscribe and explicit opt in",()=>{
 assert.equal(respond("MENU","human").state,"menu");
 assert.equal(respond("STOP","menu").state,"opted_out");
 assert.equal(respond("START","opted_out").state,"menu");
 assert.equal(respond("hello","opted_out").reply,"");
 assert.equal(shouldSilence("human",true,"1"),true);
 assert.equal(shouldSilence("human",true,"MENU"),false);
 assert.equal(shouldSilence("opted_out",false,"MENU"),true);
});
test("signature rejects a changed payload or missing secret",()=>{
 const s="test-secret",raw='{"entry":[]}';
 const sig="sha256="+createHmac("sha256",s).update(raw).digest("hex");
 assert.equal(validSignature(raw,sig,s),true);
 assert.equal(validSignature(raw+"x",sig,s),false);
 assert.equal(validSignature(raw,sig,""),false);
});
test("only public, unsold, nonarchived artworks qualify",()=>{
 assert.equal(publishedEntry({status:"Available",archived:false}),true);
 assert.equal(publishedEntry({status:"Sold",archived:false}),false);
 assert.equal(publishedEntry({status:"Sold Out",archived:false}),false);
 assert.equal(publishedEntry({status:"Available",archived:"true"}),false);
});
test("ambiguous send failures must not be resent automatically",()=>{
 assert.equal(classifySendFailure(new Error("ECONNRESET"),1),"needs_review");
 assert.equal(classifySendFailure(new MetaSendError(500),1),"needs_review");
 assert.equal(classifySendFailure(new MetaSendError(429),1),"retry");
 assert.equal(classifySendFailure(new MetaSendError(429),3),"needs_review");
 assert.equal(classifySendFailure(new MetaSendError(400),1),"failed");
});

function fixture(send:(phone:string,body:string,attempt:number)=>Promise<string|null>){
 const c:Conversation={id:"c",phone:"923001234567",state:"menu",human_handoff:false};
 const inbox=new Map<string,{id:string;status:Staged["status"];body:string;attempts:number}>();
 const requests:string[]=[];let sends=0;
 const deps:ConciergeDeps={
  getConversation:async()=>({...c}),
  stageInbound:async args=>{
   const saved=inbox.get(args.p_provider_message_id);
   if(saved)return{outbound_id:saved.id||null,status:saved.status};
   if(args.p_expected_state!==c.state||args.p_expected_handoff!==c.human_handoff)
    return{outbound_id:null,status:"stale_state"};
   c.state=args.p_state;c.human_handoff=args.p_handoff;
   if(args.p_request_type)requests.push(args.p_request_type);
   const id=args.p_reply?"out-"+args.p_provider_message_id:"";
   inbox.set(args.p_provider_message_id,{id,status:id?"pending":"suppressed",body:args.p_reply,attempts:0});
   return{outbound_id:id||null,status:id?"pending":"suppressed"};
  },
  claimOutbound:async id=>{
   const saved=[...inbox.values()].find(x=>x.id===id);
   if(!saved||!["pending","retry"].includes(saved.status))return null;
   saved.status="sending";saved.attempts++;
   return{outbound_id:id,recipient:c.phone,reply_body:saved.body,attempts:saved.attempts} satisfies Claimed;
  },
  finishOutbound:async(id,status)=>{
   const saved=[...inbox.values()].find(x=>x.id===id);
   if(!saved||saved.status!=="sending")throw Error("Not claimed");
   saved.status=status;
  },
  sendText:async(phone,body)=>{sends++;return send(phone,body,sends);},
  search:async()=> "Published sample artwork. Reply MENU."
 };
 return{deps,c,inbox,requests,get sends(){return sends;}};
}
test("viewing request recorded once and duplicate inbound does not resend",async()=>{
 const f=fixture(async()=>null);
 assert.equal(await processInbound(f.c.phone,"m1","3",f.deps),"sent");
 assert.equal(await processInbound(f.c.phone,"m2","Saturday, 3 guests",f.deps),"sent");
 assert.deepEqual(f.requests,["private_viewing"]);
 assert.equal(await processInbound(f.c.phone,"m2","Saturday, 3 guests",f.deps),"duplicate");
 assert.equal(f.sends,2);
 assert.equal(f.inbox.get("m2")?.status,"sent");
});
test("rate-limit retries same outbound job, not a second request",async()=>{
 const f=fixture(async(_p,_b,attempt)=>{if(attempt===1)throw new MetaSendError(429);return "wamid.123";});
 assert.equal(await processInbound(f.c.phone,"m1","5",f.deps),"queued_for_retry");
 assert.equal(await processInbound(f.c.phone,"m1","5",f.deps),"sent");
 assert.deepEqual(f.requests,["human_handoff"]);
 assert.equal(f.sends,2);
 assert.equal(f.inbox.get("m1")?.status,"sent");
});
test("ambiguous delivery moves to review instead of double-send",async()=>{
 const f=fixture(async()=>{throw Error("connection terminated after send");});
 assert.equal(await processInbound(f.c.phone,"m1","Hello",f.deps),"needs_review");
 assert.equal(await processInbound(f.c.phone,"m1","Hello",f.deps),"duplicate");
 assert.equal(f.sends,1);
 assert.equal(f.inbox.get("m1")?.status,"needs_review");
});
test("human handoff suppresses new automatic responses; STOP persists",async()=>{
 const f=fixture(async()=>null);
 assert.equal(await processInbound(f.c.phone,"m1","5",f.deps),"sent");
 assert.equal(f.c.human_handoff,true);
 assert.equal(await processInbound(f.c.phone,"m2","Need advice",f.deps),"suppressed");
 assert.equal(f.sends,1);
 assert.equal(await processInbound(f.c.phone,"m3","STOP",f.deps),"sent");
 assert.equal(f.c.state,"opted_out");
 assert.equal(await processInbound(f.c.phone,"m4","MENU",f.deps),"suppressed");
 assert.equal(await processInbound(f.c.phone,"m5","START",f.deps),"sent");
 assert.equal(f.c.state,"menu");
 assert.equal(f.sends,3);
});
