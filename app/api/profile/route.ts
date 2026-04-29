import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server-db";
import { getSessionUser } from "@/lib/server-auth";

export async function GET(){const u:any=await getSessionUser();if(!u)return NextResponse.json({message:"Unauthorized"},{status:401});return NextResponse.json({profile:u});}
export async function PUT(req:NextRequest){const u:any=await getSessionUser();if(!u)return NextResponse.json({message:"Unauthorized"},{status:401});const b=await req.json();await db.execute({sql:"UPDATE users SET full_name=?,display_name=?,birthday=?,role=?,updated_at=? WHERE account_id=?",args:[b.fullName||null,b.displayName||null,b.birthday||null,b.role||null,new Date().toISOString(),u.account_id]});return NextResponse.json({success:true});}
