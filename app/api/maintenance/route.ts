import {NextRequest,NextResponse} from "next/server";
import {dbReady,purgeExpired} from "../../../src/db";
import {cronAuthorized} from "../../../src/cron";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 if(!cronAuthorized(req.headers.get("authorization"),process.env.CRON_SECRET))
  return new Response("Forbidden",{status:403,headers:{"Cache-Control":"no-store"}});
 if(!dbReady())return new Response("Database unavailable",{status:503});
 try{
  const deleted=await purgeExpired();
  return NextResponse.json({ok:true,deleted},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("WhatsApp retention cleanup failed",error);
  return new Response("Maintenance failed",{status:503});
 }
}
