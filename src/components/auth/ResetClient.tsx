"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, Mail } from "lucide-react";
import { AuthCardLayout } from "@/components/auth/AuthCardLayout";
import { useToast } from "@/components/ToastProvider";
import { createClient } from "@/lib/supabase/client";

export function ResetClient({
  supabaseConfigured,
}: {
  supabaseConfigured: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const isUpdateMode = searchParams.get("mode") === "update";

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequestReset(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Masukkan alamat email Anda.");
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            "/reset?mode=update"
          )}`,
        }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSent(true);
      showToast("Link reset password telah dikirim ke email Anda.", "success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengirim email reset."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLocalReset(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Masukkan alamat email terdaftar.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/local/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          newPassword,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Gagal memperbarui password.");
        return;
      }
      showToast("Password berhasil diperbarui! Silakan masuk.", "success");
      router.push("/login");
    } catch {
      setError("Gagal memperbarui password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      showToast("Password berhasil diperbarui!", "success");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memperbarui password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCardLayout
      title={
        isUpdateMode || !supabaseConfigured
          ? "Atur Ulang Password"
          : "Reset Password"
      }
      subtitle={
        !supabaseConfigured
          ? "Masukkan email terdaftar dan password baru Anda."
          : isUpdateMode
          ? "Masukkan password baru untuk akun PnL Diary Anda."
          : "Kami akan mengirimkan tautan pemulihan password ke email Anda."
      }
      footer={
        <Link
          href="/login"
          className="font-semibold text-[#1E3A8A] hover:underline"
        >
          Kembali ke halaman Masuk
        </Link>
      }
    >
      {!supabaseConfigured ? (
        <form onSubmit={handleLocalReset} className="space-y-4">
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
              htmlFor="local-reset-email"
              className="block text-xs font-semibold text-slate-700"
            >
              Email Terdaftar
            </label>
            <input
              id="local-reset-email"
              type="email"
              required
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="local-reset-pass"
              className="block text-xs font-semibold text-slate-700"
            >
              Password Baru (minimal 8 karakter)
            </label>
            <input
              id="local-reset-pass"
              type="password"
              minLength={8}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="local-reset-confirm"
              className="block text-xs font-semibold text-slate-700"
            >
              Konfirmasi Password Baru
            </label>
            <input
              id="local-reset-confirm"
              type="password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-3 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {loading ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </form>
      ) : isUpdateMode ? (
        <form onSubmit={handleUpdatePassword} className="space-y-4">
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
              htmlFor="reset-new-password"
              className="block text-xs font-semibold text-slate-700"
            >
              Password Baru (minimal 8 karakter)
            </label>
            <input
              id="reset-new-password"
              type="password"
              minLength={8}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="reset-confirm-password"
              className="block text-xs font-semibold text-slate-700"
            >
              Konfirmasi Password Baru
            </label>
            <input
              id="reset-confirm-password"
              type="password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-3 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {loading ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </form>
      ) : sent ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[#16A34A]">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="font-heading text-lg font-bold text-[#111827]">
            Tautan Reset Terkirim
          </h2>
          <p className="text-sm text-slate-600">
            Jika email <strong className="text-[#111827]">{email}</strong>{" "}
            terdaftar, Anda akan menerima tautan untuk mengatur ulang password.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-xs font-semibold text-[#1E3A8A] hover:underline"
          >
            Kirim ulang ke email lain
          </button>
        </div>
      ) : (
        <form onSubmit={handleRequestReset} className="space-y-4">
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
              htmlFor="reset-email"
              className="block text-xs font-semibold text-slate-700"
            >
              Email Terdaftar
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              required
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-3 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
          >
            <Mail className="h-4 w-4" />
            {loading ? "Mengirim..." : "Kirim Link Reset"}
          </button>
        </form>
      )}
    </AuthCardLayout>
  );
}
