"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, Eye, EyeOff, LogIn, Mail } from "lucide-react";
import { AuthCardLayout } from "@/components/auth/AuthCardLayout";
import { useToast } from "@/components/ToastProvider";
import { createClient } from "@/lib/supabase/client";

type LoginMode = "manual" | "mt5";
type Mt5Action = "login" | "register";

function sanitizeNext(nextParam: string | null): string {
  if (!nextParam || !nextParam.startsWith("/") || nextParam.startsWith("//")) {
    return "/dashboard";
  }
  return nextParam;
}

export function LoginClient({
  supabaseConfigured,
}: {
  supabaseConfigured: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const nextPath = sanitizeNext(searchParams.get("next"));
  const callbackError = searchParams.get("error");
  const initialMode: LoginMode =
    searchParams.get("mode") === "mt5" ? "mt5" : "manual";

  const [loginMode, setLoginMode] = useState<LoginMode>(initialMode);
  const [mt5Action, setMt5Action] = useState<Mt5Action>("login");

  // Manual (Email) login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // MT5 (EA) login state
  const [mt5Account, setMt5Account] = useState("");
  const [mt5Pin, setMt5Pin] = useState("");
  const [mt5PinConfirm, setMt5PinConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    callbackError === "auth_callback"
      ? "Verifikasi tautan gagal atau sudah kedaluwarsa. Silakan coba lagi."
      : null
  );
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  function switchMode(mode: LoginMode) {
    setLoginMode(mode);
    setError(null);
  }

  async function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    try {
      setLoading(true);

      if (!supabaseConfigured) {
        const res = await fetch("/api/local/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(json.error ?? "Email atau password tidak sesuai.");
          return;
        }
        showToast("Berhasil masuk. Selamat mencatat PnL!", "success");
        router.push(nextPath);
        router.refresh();
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes("email not confirmed")) {
          setError(
            "Email belum diverifikasi. Periksa kotak masuk atau folder spam Anda."
          );
        } else {
          setError("Email atau password tidak sesuai.");
        }
        return;
      }

      showToast("Berhasil masuk. Selamat mencatat PnL!", "success");
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal masuk. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleMt5Submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanedAccount = mt5Account.replace(/\s+/g, "").trim();
    if (!/^\d{4,16}$/.test(cleanedAccount)) {
      setError("Nomor akun MT5 harus berupa 4–16 digit angka.");
      return;
    }
    if (mt5Pin.length < 6) {
      setError("PIN / Password minimal 6 karakter.");
      return;
    }
    if (mt5Action === "register" && mt5Pin !== mt5PinConfirm) {
      setError("Konfirmasi PIN / Password tidak sama.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/mt5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mt5Action,
          accountNumber: cleanedAccount,
          password: mt5Pin,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        isNewAccount?: boolean;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        setError(json.error ?? "Gagal masuk dengan akun MT5.");
        return;
      }

      if (json.isNewAccount) {
        showToast(
          `Akun MT5 #${cleanedAccount} siap! Download file EA di bawah ini.`,
          "success"
        );
        router.push("/profile?setup=mt5");
      } else {
        showToast(`Berhasil masuk ke MT5 #${cleanedAccount}!`, "success");
        router.push(nextPath);
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menghubungkan akun MT5."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    if (!supabaseConfigured) return;

    try {
      setOauthLoading(true);
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            nextPath
          )}`,
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setOauthLoading(false);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal masuk dengan Google."
      );
      setOauthLoading(false);
    }
  }

  const passwordToggleButton = (
    <button
      type="button"
      onClick={() => setShowPassword((prev) => !prev)}
      aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
    >
      {showPassword ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
    </button>
  );

  return (
    <AuthCardLayout
      title="Masuk ke PnL Diary"
      subtitle="Pilih mode Trade Manual (Email) atau Auto-Sync EA (Nomor Akun MT5)."
      footer={
        loginMode === "manual" ? (
          <>
            Belum punya akun manual?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#1E3A8A] hover:underline"
            >
              Daftar dengan email
            </Link>
          </>
        ) : (
          <>
            Trading manual tanpa EA?{" "}
            <button
              type="button"
              onClick={() => switchMode("manual")}
              className="font-semibold text-[#1E3A8A] hover:underline"
            >
              Masuk dengan Email
            </button>
          </>
        )
      }
    >
      {/* Mode Switcher: Manual vs EA MT5 */}
      <div
        role="tablist"
        aria-label="Pilih metode masuk"
        className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl bg-[#F3F4F6] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={loginMode === "manual"}
          onClick={() => switchMode("manual")}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            loginMode === "manual"
              ? "bg-white text-[#1E3A8A] shadow-xs"
              : "text-slate-600 hover:text-[#111827]"
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          Trade Manual
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={loginMode === "mt5"}
          onClick={() => switchMode("mt5")}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            loginMode === "mt5"
              ? "bg-white text-[#1E3A8A] shadow-xs"
              : "text-slate-600 hover:text-[#111827]"
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          Pakai EA (MT5)
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-[#DC2626]"
        >
          {error}
        </div>
      )}

      {loginMode === "manual" ? (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-slate-700"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700"
              >
                Password
              </label>
              <Link
                href="/reset"
                className="text-xs font-semibold text-[#1E3A8A] hover:underline"
              >
                Lupa password?
              </Link>
            </div>
            <div className="relative mt-1.5">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {passwordToggleButton}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || oauthLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Memproses..." : "Masuk"}
          </button>

          {supabaseConfigured && (
            <>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400">atau</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || oauthLoading}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-slate-50 disabled:opacity-60"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z"
                  />
                </svg>
                {oauthLoading
                  ? "Menghubungkan Google..."
                  : "Masuk dengan Google"}
              </button>
            </>
          )}
        </form>
      ) : (
        <form onSubmit={handleMt5Submit} className="space-y-4">
          <div className="flex rounded-xl border border-slate-200 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMt5Action("login");
                setError(null);
              }}
              className={`flex-1 rounded-lg py-1.5 transition ${
                mt5Action === "login"
                  ? "bg-blue-50 text-[#1E3A8A]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Masuk Akun MT5
            </button>
            <button
              type="button"
              onClick={() => {
                setMt5Action("register");
                setError(null);
              }}
              className={`flex-1 rounded-lg py-1.5 transition ${
                mt5Action === "register"
                  ? "bg-blue-50 text-[#1E3A8A]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Daftar Akun MT5 Baru
            </button>
          </div>

          <p className="rounded-xl bg-blue-50/70 px-3 py-2 text-xs text-slate-600">
            {mt5Action === "login"
              ? "Masuk langsung memakai Nomor Akun MT5 & PIN jurnal Anda tanpa email."
              : "Buat jurnal khusus akun MT5 tanpa email. Anda cukup buat PIN agar jurnal aman, lalu download file EA 1-klik."}
          </p>

          <div>
            <label
              htmlFor="mt5-account"
              className="block text-xs font-semibold text-slate-700"
            >
              Nomor Akun MT5
            </label>
            <input
              id="mt5-account"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              required
              placeholder="Contoh: 51029384"
              value={mt5Account}
              onChange={(e) => setMt5Account(e.target.value.replace(/\D/g, ""))}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="mt5-pin"
              className="block text-xs font-semibold text-slate-700"
            >
              {mt5Action === "register"
                ? "Buat PIN / Password Jurnal"
                : "PIN / Password Jurnal"}
            </label>
            <div className="relative mt-1.5">
              <input
                id="mt5-pin"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mt5Action === "register" ? "new-password" : "current-password"
                }
                minLength={6}
                required
                placeholder="Minimal 6 karakter"
                value={mt5Pin}
                onChange={(e) => setMt5Pin(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {passwordToggleButton}
            </div>
          </div>

          {mt5Action === "register" && (
            <div>
              <label
                htmlFor="mt5-pin-confirm"
                className="block text-xs font-semibold text-slate-700"
              >
                Ulangi PIN / Password
              </label>
              <input
                id="mt5-pin-confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={6}
                required
                placeholder="Ketik ulang PIN / Password"
                value={mt5PinConfirm}
                onChange={(e) => setMt5PinConfirm(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-60"
          >
            <Bot className="h-4 w-4" />
            {loading
              ? "Memproses..."
              : mt5Action === "register"
                ? "Buat Akun MT5 & Siapkan EA"
                : "Masuk dengan Akun MT5"}
          </button>
        </form>
      )}
    </AuthCardLayout>
  );
}
