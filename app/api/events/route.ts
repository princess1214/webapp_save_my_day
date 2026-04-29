import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/server-db";
import { getSessionUser } from "@/lib/server-auth";

export async function GET() { await initDb(); const u:any=await getSessionUser(); if(!u) return NextResponse.json({message:"Unauthorized"},{status:401}); const r=await db.execute({sql:"SELECT id,data_json FROM events WHERE account_id=? OR family_id=?",args:[u.account_id,u.family_id]}); return NextResponse.json({items:r.rows.map((x:any)=>JSON.parse(String(x.data_json)))}); }
export async function POST(req:NextRequest){ await initDb(); const u:any=await getSessionUser(); if(!u) return NextResponse.json({message:"Unauthorized"},{status:401}); const body=await req.json(); const id=body.id||crypto.randomUUID(); const now=new Date().toISOString(); await db.execute({sql:"INSERT INTO events (id,account_id,family_id,data_json,created_at,updated_at) VALUES (?,?,?,?,?,?)",args:[id,u.account_id,body.visibility==="private"?null:u.family_id,JSON.stringify({...body,id}),now,now]}); return NextResponse.json({item:{...body,id}}); }
