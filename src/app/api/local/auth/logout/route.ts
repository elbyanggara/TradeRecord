import { NextResponse } from "next/server";
import { LOCAL_SESSION_COOKIE } from "@/lib/local-auth-token";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(LOCAL_SESSION_COOKIE);
  return res;
}

