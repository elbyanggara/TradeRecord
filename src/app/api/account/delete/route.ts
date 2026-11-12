import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  LOCAL_SESSION_COOKIE,
  verifyLocalSession,
} from "@/lib/local-auth-token";
import { deleteLocalUser } from "@/lib/local-store";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    const token = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;
    const session = await verifyLocalSession(token);
    if (!session) {
      return NextResponse.json(
        { error: "Tidak terautentikasi." },
        { status: 401 }
      );
    }
    await deleteLocalUser(session.userId);
    const res = NextResponse.json({ success: true });
    res.cookies.delete(LOCAL_SESSION_COOKIE);
    return res;
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Konfigurasi Supabase belum tersedia." },
      { status: 500 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const { error: rpcError } = await supabase.rpc("delete_own_account");
  if (rpcError) {
    return NextResponse.json(
      {
        error:
          "Gagal menghapus akun. Pastikan fungsi delete_own_account() dari supabase/schema.sql sudah dijalankan di Supabase.",
      },
      { status: 400 }
    );
  }

  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
