import { NextResponse } from "next/server";
import {
  LOCAL_SESSION_COOKIE,
  signLocalSession,
} from "@/lib/local-auth-token";
import { authenticateLocalUser } from "@/lib/local-store";
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

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const user = await authenticateLocalUser(email, password);
    if (!user) {
      return NextResponse.json(
        { error: "Email atau password tidak sesuai." },
        { status: 401 }
      );
    }

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
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses login." },
      { status: 500 }
    );
  }
}

