import { NextResponse } from "next/server";
import { resetLocalUserPassword } from "@/lib/local-store";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Endpoint lokal tidak aktif saat Supabase terkonfigurasi." },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      newPassword?: string;
    };
    const email = body.email?.trim() ?? "";
    const newPassword = body.newPassword ?? "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Alamat email tidak valid." },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password baru minimal 8 karakter." },
        { status: 400 }
      );
    }

    const updated = await resetLocalUserPassword(email, newPassword);
    if (!updated) {
      return NextResponse.json(
        { error: "Email belum terdaftar di penyimpanan lokal." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal memperbarui password." },
      { status: 500 }
    );
  }
}

