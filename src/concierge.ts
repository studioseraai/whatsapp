export type FlowState="menu"|"artwork"|"artist"|"viewing"|"events"|"human";
export const MENU="Welcome to Studio Seraai — A Gallery Where Walls Breathe Art.\n\n1. Explore Artworks\n2. Meet Our Artists\n3. Book a Private Viewing\n4. Exhibitions & Events\n5. Speak to Our Team\n\nReply 1–5 or MENU.";
export type Result={reply:string;state:FlowState;request?:"private_viewing"|"human_handoff";details?:string;lookup?:"artwork"|"artist";handoff?:boolean};
export function respond(text:string,state:FlowState="menu"):Result{
 const x=text.trim().toLowerCase().slice(0,1000);
 if(["menu","hi","hello","start","0","cancel"].includes(x))return{reply:MENU,state:"menu",handoff:false};
 if(x==="1")return{reply:"Please share an artwork title, ID, style, or artist.",state:"artwork"};
 if(x==="2")return{reply:"Which artist would you like to explore?",state:"artist"};
 if(x==="3")return{reply:"Please share your preferred date, time and number of visitors. Our team will confirm availability.",state:"viewing"};
 if(x==="4")return{reply:"Tell us which exhibition interests you. See https://studioseraai.com for more.",state:"events"};
 if(x==="5"||x==="human"||x==="agent")return{reply:"Your request has been flagged for the Studio Seraai team. A team member will respond when available.",state:"human",request:"human_handoff",handoff:true};
 if(state==="human")return{reply:"Your message is noted for the team. Reply MENU to return.",state:"human",handoff:true};
 if(state==="viewing")return{reply:"Your viewing request has been recorded. This is not a confirmed booking. Reply MENU for options.",state:"menu",request:"private_viewing",details:text.slice(0,1000)};
 if(state==="artwork"||state==="artist")return{reply:"Searching the Studio Seraai catalogue...",state,lookup:state};
 if(state==="events")return{reply:"Our team can help with that exhibition. Reply MENU for options.",state:"menu"};
 return{reply:MENU,state:"menu"};
}