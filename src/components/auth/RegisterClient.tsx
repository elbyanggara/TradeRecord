"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, UserPlus } from "lucide-react";
import { AuthCardLayout } from "@/components/auth/AuthCardLayout";
import { useToast } from "@/components/ToastProvider";
import { createClient } from "@/lib/supabase/client";

export function RegisterClient({
  supabaseConfigured,
}: {
  supabaseConfigured: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Email wajib diisi.");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal harus 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    try {
      setLoading(true);

      if (!supabaseConfigured) {
        const res = await fetch("/api/local/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(json.error ?? "Gagal membuat akun.");
          return;
        }
        showToast("Akun berhasil dibuat!", "success");
        router.push("/dashboard");
        router.refresh();
        return;
      }

      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        showToast("Akun berhasil dibuat!", "success");
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setNeedsVerification(true);
      showToast("Link verifikasi dikirim ke email Anda.", "success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuat akun. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCardLayout
      title="Buat Akun Baru"
      subtitle="Gratis dan pribadi. Mulai catat PnL harianmu dalam hitungan menit."
      footer={
        <div className="space-y-1.5">
          <div>
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#1E3A8A] hover:underline"
            >
              Masuk di sini
            </Link>
          </div>
          <div>
            Pakai EA MT5 tanpa email?{" "}
            <Link
              href="/login?mode=mt5"
              className="font-semibold text-[#1E3A8A] hover:underline"
            >
              Masuk / Daftar via Nomor Akun MT5
            </Link>
          </div>
        </div>
      }
    >
      {needsVerification ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[#16A34A]">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="font-heading text-lg font-bold text-[#111827]">
            Cek Email Verifikasi Anda
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Kami telah mengirim tautan aktivasi ke{" "}
            <strong className="text-[#111827]">{email}</strong>. Klik tautan
            tersebut untuk mengaktifkan akun dan masuk ke dashboard.
          </p>
          <p className="text-xs text-slate-500">
            Tidak menemukan email? Periksa folder Spam atau Promosi.
          </p>
          <Link
            href="/login"
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"
          >
            Ke Halaman Masuk
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-[#DC2626]"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="register-email"
              className="block text-xs font-semibold text-slate-700"
            >
              Email
            </label>
            <input
              id="register-email"
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
            <label
              htmlFor="register-password"
              className="block text-xs font-semibold text-slate-700"
            >
              Password (minimal 8 karakter)
            </label>
            <div className="relative mt-1.5">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                required
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? "Sembunyikan password" : "Lihat password"
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="register-confirm"
              className="block text-xs font-semibold text-slate-700"
            >
              Ulangi Password
            </label>
            <input
              id="register-confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="Ketik ulang password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            {loading ? "Mendaftarkan..." : "Daftar Sekarang"}
          </button>
        </form>
      )}
    </AuthCardLayout>
  );
}
