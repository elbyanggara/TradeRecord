import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  LOCAL_SESSION_COOKIE,
  verifyLocalSession,
} from "@/lib/local-auth-token";
import {
  deleteLocalIntegrationToken,
  getLocalIntegrationToken,
  hashApiToken,
  upsertLocalIntegrationToken,
} from "@/lib/local-store";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

async function resolveSessionUser() {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    const token = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;
    const session = await verifyLocalSession(token);
    if (!session) return null;
    return { mode: "local" as const, userId: session.userId };
  }

  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { mode: "supabase" as const, userId: user.id, supabase };
}

export async function GET() {
  const ctx = await resolveSessionUser();
  if (!ctx) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  if (ctx.mode === "local") {
    const token = await getLocalIntegrationToken(ctx.userId);
    return NextResponse.json({
      hasToken: Boolean(token),
      tokenPrefix: token?.tokenPrefix ?? null,
      createdAt: token?.createdAt ?? null,
      lastUsedAt: token?.lastUsedAt ?? null,
    });
  }

  const { data, error } = await ctx.supabase
    .from("integration_tokens")
    .select("token_prefix, created_at, last_used_at")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error:
          "Tabel integration_tokens belum tersedia. Jalankan ulang supabase/schema.sql di SQL Editor Supabase.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    hasToken: Boolean(data),
    tokenPrefix: data?.token_prefix ?? null,
    createdAt: data?.created_at ?? null,
    lastUsedAt: data?.last_used_at ?? null,
  });
}

export async function POST() {
  const ctx = await resolveSessionUser();
  if (!ctx) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const rawToken = `pnld_${crypto.randomBytes(24).toString("hex")}`;
  const tokenPrefix = `${rawToken.slice(0, 12)}...${rawToken.slice(-4)}`;
  const tokenHash = hashApiToken(rawToken);

  if (ctx.mode === "local") {
    const saved = await upsertLocalIntegrationToken(
      ctx.userId,
      rawToken,
      tokenPrefix
    );
    return NextResponse.json({
      token: rawToken,
      tokenPrefix: saved.tokenPrefix,
      createdAt: saved.createdAt,
      lastUsedAt: saved.lastUsedAt,
    });
  }

  const { data, error } = await ctx.supabase
    .from("integration_tokens")
    .upsert(
      {
        user_id: ctx.userId,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        last_used_at: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("token_prefix, created_at, last_used_at")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error:
          "Gagal membuat API key. Pastikan SQL terbaru di supabase/schema.sql sudah dijalankan di Supabase.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    token: rawToken,
    tokenPrefix: data.token_prefix,
    createdAt: data.created_at,
    lastUsedAt: data.last_used_at,
  });
}

export async function DELETE() {
  const ctx = await resolveSessionUser();
  if (!ctx) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  if (ctx.mode === "local") {
    await deleteLocalIntegrationToken(ctx.userId);
    return NextResponse.json({ success: true });
  }

  const { error } = await ctx.supabase
    .from("integration_tokens")
    .delete()
    .eq("user_id", ctx.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

