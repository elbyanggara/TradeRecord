import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  LOCAL_SESSION_COOKIE,
  verifyLocalSession,
} from "@/lib/local-auth-token";
import { createLocalJournal, listLocalJournals } from "@/lib/local-store";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { JournalPayload } from "@/types/journal";

async function getSessionOr401() {
  const cookieStore = await cookies();
  const token = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;
  return verifyLocalSession(token);
}

export async function GET() {
  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not available" }, { status: 400 });
  }

  const session = await getSessionOr401();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const entries = await listLocalJournals(session.userId);
  return NextResponse.json({ data: entries });
}

export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not available" }, { status: 400 });
  }

  const session = await getSessionOr401();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as JournalPayload;
    if (
      !payload.tanggal ||
      !payload.instrumen ||
      !Number.isFinite(Number(payload.pnl_nominal))
    ) {
      return NextResponse.json(
        { error: "Data jurnal tidak lengkap." },
        { status: 400 }
      );
    }

    const created = await createLocalJournal(session.userId, {
      ...payload,
      pnl_nominal: Number(payload.pnl_nominal),
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal menyimpan catatan.",
      },
      { status: 500 }
    );
  }
}

