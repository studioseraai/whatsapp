import {timingSafeEqual} from "node:crypto";
export function cronAuthorized(header:string|null,secret:string|undefined){
 if(!secret||!header?.startsWith("Bearer "))return false;
 const provided=Buffer.from(header.slice(7),"utf8"),expected=Buffer.from(secret,"utf8");
 return provided.length===expected.length&&timingSafeEqual(provided,expected);
}
