import {createHmac,timingSafeEqual} from "node:crypto";
export function validSignature(raw:string,signature:string|null,secret:string){
 if(!signature?.startsWith("sha256=")||!secret)return false;
 const h=signature.slice(7);if(!/^[a-f0-9]{64}$/i.test(h))return false;
 const expected=createHmac("sha256",secret).update(raw).digest();
 return timingSafeEqual(expected,Buffer.from(h,"hex"));
}
export async function sendText(to:string,body:string){
 const token=process.env.WHATSAPP_ACCESS_TOKEN,id=process.env.WHATSAPP_PHONE_NUMBER_ID;
 if(!token||!id)throw Error("Meta credentials missing");
 const v=process.env.WHATSAPP_GRAPH_API_VERSION||"v23.0";if(!/^v\d+\.\d+$/.test(v))throw Error("Invalid API version");
 const r=await fetch("https://graph.facebook.com/"+v+"/"+encodeURIComponent(id)+"/messages",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to,type:"text",text:{body,preview_url:false}})});
 if(!r.ok)throw Error("Meta send failed: "+r.status);
}