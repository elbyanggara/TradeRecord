import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  LOCAL_SESSION_COOKIE,
  signLocalSession,
} from "@/lib/local-auth-token";
import { authenticateLocalUser, registerLocalUser } from "@/lib/local-store";
import {
  mt5AccountToEmail,
  normalizeMt5AccountNumber,
} from "@/lib/mt5-account";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type Mt5AuthAction = "login" | "register";

interface Mt5AuthBody {
  action?: Mt5AuthAction;
  accountNumber?: string;
  password?: string;
}

async function createLocalAuthResponse(
  user: { id: string; email: string; createdAt: string },
  accountNumber: string,
  isNewAccount: boolean
) {
  const token = await signLocalSession({
    userId: user.id,
    email: user.email,
    createdAt: user.createdAt,
  });
  const res = NextResponse.json({
    ok: true,
    accountNumber,
    isNewAccount,
  });
  res.cookies.set(LOCAL_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Mt5AuthBody;
    const action: Mt5AuthAction =
      body.action === "register" ? "register" : "login";
    const accountNumber = normalizeMt5AccountNumber(
      String(body.accountNumber ?? "")
    );
    const password = String(body.password ?? "");

    if (!accountNumber) {
      return NextResponse.json(
        { error: "Nomor akun MT5 harus berupa 4–16 digit angka." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "PIN / Password minimal 6 karakter." },
        { status: 400 }
      );
    }

    const syntheticEmail = mt5AccountToEmail(accountNumber);

    if (!isSupabaseConfigured()) {
      if (action === "register") {
        try {
          const user = await registerLocalUser(syntheticEmail, password);
          return createLocalAuthResponse(user, accountNumber, true);
        } catch {
          return NextResponse.json(
            {
              error:
                "Nomor akun MT5 ini sudah terdaftar. Pilih tab Masuk untuk login.",
            },
            { status: 409 }
          );
        }
      }

      const user = await authenticateLocalUser(syntheticEmail, password);
      if (!user) {
        return NextResponse.json(
          {
            error:
              "Nomor akun MT5 atau PIN tidak sesuai. Jika baru pertama kali, pilih Daftar Akun MT5.",
          },
          { status: 401 }
        );
      }
      return createLocalAuthResponse(user, accountNumber, false);
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Konfigurasi Supabase tidak tersedia." },
        { status: 500 }
      );
    }

    if (action === "register") {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

      if (serviceRoleKey) {
        const { url } = getSupabaseEnv();
        const admin = createSupabaseAdmin(url, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { error: createError } = await admin.auth.admin.createUser({
          email: syntheticEmail,
          password,
          email_confirm: true,
          user_metadata: {
            auth_mode: "mt5",
            mt5_account: accountNumber,
          },
        });

        if (createError) {
          const msg = createError.message.toLowerCase();
          if (msg.includes("already") || msg.includes("registered")) {
            return NextResponse.json(
              {
                error:
                  "Nomor akun MT5 ini sudah terdaftar. Pilih tab Masuk untuk login.",
              },
              { status: 409 }
            );
          }
          return NextResponse.json(
            { error: createError.message },
            { status: 400 }
          );
        }

        const { error: loginAfterError } =
          await supabase.auth.signInWithPassword({
            email: syntheticEmail,
            password,
          });
        if (loginAfterError) {
          return NextResponse.json(
            { error: loginAfterError.message },
            { status: 400 }
          );
        }

        return NextResponse.json({
          ok: true,
          accountNumber,
          isNewAccount: true,
        });
      }

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: syntheticEmail,
          password,
          options: {
            data: {
              auth_mode: "mt5",
              mt5_account: accountNumber,
            },
          },
        });

      if (signUpError) {
        const msg = signUpError.message.toLowerCase();
        if (msg.includes("already") || msg.includes("registered")) {
          return NextResponse.json(
            {
              error:
                "Nomor akun MT5 ini sudah terdaftar. Pilih tab Masuk untuk login.",
            },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: signUpError.message },
          { status: 400 }
        );
      }

      if (!signUpData.session) {
        return NextResponse.json(
          {
            error:
              "Pendaftaran akun MT5 tanpa email memerlukan 'Confirm email' dimatikan di Supabase (Authentication -> Sign In / Providers -> Email) atau isi SUPABASE_SERVICE_ROLE_KEY di Vercel.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        accountNumber,
        isNewAccount: true,
      });
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        {
          error:
            "Nomor akun MT5 atau PIN tidak sesuai. Jika baru pertama kali, pilih Daftar Akun MT5.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      accountNumber,
      isNewAccount: false,
    });
  } catch {
    return NextResponse.json(
      { error: "Permintaan login MT5 tidak valid." },
      { status: 400 }
    );
  }
}
