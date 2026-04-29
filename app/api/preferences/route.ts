import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server-db";
import { getSessionUser } from "@/lib/server-auth";
export async function GET(){const u:any=await getSessionUser();if(!u)return NextResponse.json({message:"Unauthorized"},{status:401});const r=await db.execute({sql:"SELECT data_json FROM preferences WHERE account_id=?",args:[u.account_id]});return NextResponse.json({preferences:r.rows[0]?JSON.parse(String((r.rows[0] as any).data_json)):null});}
export async function PUT(req:NextRequest){const u:any=await getSessionUser();if(!u)return NextResponse.json({message:"Unauthorized"},{status:401});const b=await req.json();await db.execute({sql:"INSERT OR REPLACE INTO preferences (account_id,family_id,data_json,updated_at) VALUES (?,?,?,?)",args:[u.account_id,u.family_id,JSON.stringify(b),new Date().toISOString()]});return NextResponse.json({success:true});}
