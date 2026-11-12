"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  LogOut,
  ShieldCheck,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useToast } from "@/components/ToastProvider";
import { useJournals } from "@/hooks/useJournals";
import { downloadJournalsCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

interface ProfileClientProps {
  userId: string;
  userEmail: string;
  createdAt?: string;
}

export function ProfileClient({
  userId,
  userEmail,
  createdAt,
}: ProfileClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { journals, isLoading } = useJournals(userId);

  const [logoutLoading, setLogoutLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const joinedLabel = createdAt
    ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(createdAt))
    : "—";

  function handleExportAll() {
    if (journals.length === 0) {
      showToast("Belum ada entri jurnal untuk diexport.", "info");
      return;
    }
    downloadJournalsCsv(journals, "pnl-diary-semua-entri.csv");
    showToast(`Berhasil export ${journals.length} entri ke CSV.`, "success");
  }

  async function handleLogout() {
    try {
      setLogoutLoading(true);
      if (!isSupabaseConfigured()) {
        await fetch("/api/local/auth/logout", { method: "POST" });
      } else {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
      showToast("Anda telah keluar dari akun.", "info");
      router.push("/login");
      router.refresh();
    } catch {
      showToast("Gagal keluar. Silakan coba lagi.", "error");
    } finally {
      setLogoutLoading(false);
    }
  }

  async function handleDeleteAccount() {
    try {
      setDeleteLoading(true);
      const res = await fetch("/api/account/delete", {
        method: "POST",
      });
      const body = (await res.json()) as { error?: string };

      if (!res.ok) {
        showToast(body.error ?? "Gagal menghapus akun.", "error");
        setDeleteDialogOpen(false);
        return;
      }

      showToast("Akun dan seluruh data Anda telah dihapus.", "info");
      router.push("/");
      router.refresh();
    } catch {
      showToast("Terjadi kesalahan saat menghapus akun.", "error");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <AppShell userEmail={userEmail}>
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#111827]">
            Profil &amp; Pengaturan
          </h1>
          <p className="text-sm text-slate-600">
            Kelola akun, export data CSV, dan instalasi aplikasi PWA.
          </p>
        </div>

        {/* Account Info */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#1E3A8A]">
                <UserCircle2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#111827]">{userEmail}</p>
                <p className="text-xs text-slate-500">
                  Bergabung sejak {joinedLabel}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#16A34A]">
              <ShieldCheck className="h-4 w-4" />
              Data Privat (RLS Aktif)
            </span>
          </div>
        </div>

        {/* Export CSV */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-base font-bold text-[#111827]">
                Export Data ke CSV
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                {isLoading
                  ? "Menghitung jumlah entri..."
                  : `Total ${journals.length} entri jurnal tersimpan siap diunduh.`}
              </p>
            </div>
            <button
              type="button"
              disabled={isLoading || journals.length === 0}
              onClick={handleExportAll}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
          </div>
        </div>

        {/* PWA Install */}
        <InstallPrompt />

        {/* Session & Danger Zone */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-base font-bold text-[#111827]">
                Sesi Login
              </h2>
              <p className="text-xs text-slate-600">
                Keluar dari perangkat ini tanpa menghapus data jurnal Anda.
              </p>
            </div>
            <button
              type="button"
              disabled={logoutLoading}
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#111827] hover:bg-slate-50 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {logoutLoading ? "Keluar..." : "Keluar"}
            </button>
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-heading text-sm font-bold text-[#DC2626]">
                Hapus Akun Permanen
              </h3>
              <p className="text-xs text-slate-600">
                Menghapus akun serta seluruh catatan PnL Anda secara permanen.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-[#DC2626] hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              Hapus Akun
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Hapus Akun Permanen?"
        description="Tindakan ini akan menghapus akun Anda beserta seluruh riwayat jurnal PnL dan tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus Akun Saya"
        loading={deleteLoading}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </AppShell>
  );
}

