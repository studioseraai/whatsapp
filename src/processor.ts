import {respond,type FlowState} from "./concierge";
import {MetaSendError} from "./whatsapp";
import type {Conversation,StageArgs,Staged,Claimed} from "./db";

export type ConciergeDeps={
 getConversation:(phone:string)=>Promise<Conversation>;
 stageInbound:(args:StageArgs)=>Promise<Staged>;
 claimOutbound:(id:string)=>Promise<Claimed|null>;
 finishOutbound:(id:string,status:"sent"|"retry"|"needs_review"|"failed",error?:string,providerId?:string|null)=>Promise<void>;
 search:(query:string,type:"artwork"|"artist")=>Promise<string>;
 sendText:(phone:string,text:string)=>Promise<string|null>;
};
export type ProcessingResult="sent"|"suppressed"|"duplicate"|"queued_for_retry"|"needs_review";
export function classifySendFailure(error:unknown,attempts:number):"retry"|"needs_review"|"failed"{
 if(error instanceof MetaSendError){
  if(error.status===429)return attempts>=3?"needs_review":"retry";
  if(error.status===400||error.status===404||error.status===422)return"failed";
 }
 // Timeouts, 5xx and connection failures can have an ambiguous send result.
 // Do not automatically send a duplicate; request staff reconciliation.
 return"needs_review";
}
export function shouldSilence(state:string,handoff:boolean,input:string){
 const x=input.trim().toLowerCase();
 const stopping=["stop","unsubscribe","opt out"].includes(x);
 if(state==="opted_out"&&x!=="start")return true;
 if(handoff&&!stopping&&!["menu","start","0","cancel"].includes(x))return true;
 return false;
}
export async function processInbound(phone:string,providerId:string,input:string,deps:ConciergeDeps):Promise<ProcessingResult>{
 let staged:Staged|null=null;
 for(let i=0;i<3;i++){
  const c=await deps.getConversation(phone);
  const silent=shouldSilence(c.state,c.human_handoff,input);
  const r=silent
   ?{reply:"",state:(c.state==="opted_out"?"opted_out":"human") as FlowState,handoff:c.human_handoff}
   :respond(input,c.state as FlowState);
  const reply=!silent&&"lookup" in r&&r.lookup?await deps.search(input,r.lookup):r.reply;
  staged=await deps.stageInbound({
   p_phone:phone,p_provider_message_id:providerId,p_body:input,p_reply:reply,
   p_expected_state:c.state,p_expected_handoff:c.human_handoff,
   p_state:r.state,p_handoff:"handoff" in r&&typeof r.handoff==="boolean"?r.handoff:c.human_handoff,
   p_request_type:"request" in r?r.request||null:null,
   p_request_details:"details" in r?r.details||input:null
  });
  if(staged.status!=="stale_state")break;
  if(i===2)throw Error("Conversation state changed concurrently");
 }
 if(!staged?.outbound_id)return staged?.status==="suppressed"?"suppressed":"duplicate";
 if(staged.status!=="pending"&&staged.status!=="retry")return"duplicate";
 const claimed=await deps.claimOutbound(staged.outbound_id);
 if(!claimed)return"duplicate";
 try{
  const metaId=await deps.sendText(claimed.recipient,claimed.reply_body);
  await deps.finishOutbound(claimed.outbound_id,"sent",undefined,metaId);
  return"sent";
 }catch(error){
  const decision=classifySendFailure(error,claimed.attempts);
  await deps.finishOutbound(claimed.outbound_id,decision,error instanceof Error?error.message:"Send error");
  if(decision==="retry")return"queued_for_retry";
  return"needs_review";
 }
}
