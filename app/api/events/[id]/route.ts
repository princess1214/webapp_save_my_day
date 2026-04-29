import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server-db";
import { getSessionUser } from "@/lib/server-auth";

export async function PUT(req:NextRequest,{params}:{params:Promise<{id:string}>}){const u:any=await getSessionUser();if(!u)return NextResponse.json({message:"Unauthorized"},{status:401});const {id}=await params;const body=await req.json();await db.execute({sql:"UPDATE events SET data_json=?,updated_at=? WHERE id=? AND account_id=?",args:[JSON.stringify({...body,id}),new Date().toISOString(),id,u.account_id]});return NextResponse.json({item:{...body,id}})}
export async function DELETE(_req:NextRequest,{params}:{params:Promise<{id:string}>}){const u:any=await getSessionUser();if(!u)return NextResponse.json({message:"Unauthorized"},{status:401});const {id}=await params;await db.execute({sql:"DELETE FROM events WHERE id=? AND account_id=?",args:[id,u.account_id]});return new NextResponse(null,{status:204})}
