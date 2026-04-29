import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/auth";

export async function GET(){const u=await requireSessionUser(); if(!u)return NextResponse.json({message:"Unauthorized"},{status:401}); const r=await query<{data_json:any}>("SELECT data_json FROM users WHERE id=$1",[u.id]); return NextResponse.json({profile:{email:u.email,accountId:u.account_id,familyId:u.family_id,...(r.rows[0]?.data_json||{})}})}
export async function PUT(req:Request){const u=await requireSessionUser(); if(!u)return NextResponse.json({message:"Unauthorized"},{status:401}); const data=await req.json(); await query("UPDATE users SET data_json=$1 WHERE id=$2",[data,u.id]); return NextResponse.json({profile:{email:u.email,accountId:u.account_id,familyId:u.family_id,...data}})}
