import { NextResponse } from "next/server";
import {
  getUserSubscriptionSummary,
  resolveApiSessionUser,
} from "@/lib/subscription";

export async function GET() {
  const ctx = await resolveApiSessionUser();
  if (!ctx) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const summary = await getUserSubscriptionSummary(ctx);
  return NextResponse.json(summary);
}

