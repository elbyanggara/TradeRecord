import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  LOCAL_SESSION_COOKIE,
  verifyLocalSession,
} from "@/lib/local-auth-token";
import { deleteLocalJournal, updateLocalJournal } from "@/lib/local-store";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { JournalPayload } from "@/types/journal";

async function getSessionOr401() {
  const cookieStore = await cookies();
  const token = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;
  return verifyLocalSession(token);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not available" }, { status: 400 });
  }

  const session = await getSessionOr401();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const payload = (await request.json()) as JournalPayload;
    const updated = await updateLocalJournal(session.userId, id, {
      ...payload,
      pnl_nominal: Number(payload.pnl_nominal),
    });
    if (!updated) {
      return NextResponse.json(
        { error: "Entri tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: "Gagal memperbarui catatan." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not available" }, { status: 400 });
  }

  const session = await getSessionOr401();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const { id } = await context.params;
  const deleted = await deleteLocalJournal(session.userId, id);
  if (!deleted) {
    return NextResponse.json(
      { error: "Entri tidak ditemukan." },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}

