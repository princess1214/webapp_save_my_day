import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server-db";
import { getSessionUser } from "@/lib/server-auth";
export async function POST(req:NextRequest){const u:any=await getSessionUser();const b=await req.json();if(!b?.issueText)return NextResponse.json({message:"issueText required"},{status:400});const id=crypto.randomUUID();await db.execute({sql:"INSERT INTO issue_reports (id,account_id,family_id,email,issue_text,device_info,status,created_at) VALUES (?,?,?,?,?,?,?,?)",args:[id,u?.account_id||null,u?.family_id||null,u?.email||b?.email||null,b.issueText,JSON.stringify({ua:req.headers.get('user-agent')}),"open",new Date().toISOString()]});return NextResponse.json({success:true,id});}
