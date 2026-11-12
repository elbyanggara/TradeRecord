import { NextResponse } from "next/server";
import {
  LOCAL_SESSION_COOKIE,
  signLocalSession,
} from "@/lib/local-auth-token";
import { registerLocalUser } from "@/lib/local-store";
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
      password?: string;
    };
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Alamat email tidak valid." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password minimal 8 karakter." },
        { status: 400 }
      );
    }

    const user = await registerLocalUser(email, password);
    const token = await signLocalSession({
      userId: user.id,
      email: user.email,
      createdAt: user.createdAt,
    });

    const res = NextResponse.json({
      user: { id: user.id, email: user.email },
    });
    res.cookies.set(LOCAL_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal mendaftarkan akun.",
      },
      { status: 400 }
    );
  }
}

