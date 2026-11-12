"use client";

import type { ReactNode } from "react";
import { AlertCircle, BookOpen, RefreshCw } from "lucide-react";

export function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
      <div className="h-3.5 w-28 rounded bg-slate-200" />
      <div className="mt-3 h-7 w-36 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
        <div className="h-4 w-48 rounded bg-slate-200" />
        <div className="mt-6 h-52 w-full rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

export function JournalListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="h-3 w-48 rounded bg-slate-100" />
            </div>
            <div className="h-6 w-20 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#1E3A8A]">
        <BookOpen className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-heading text-base font-bold text-[#111827]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-600">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message = "Terjadi kesalahan saat memuat data.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/70 px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-[#DC2626]">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-3 font-heading text-base font-bold text-[#111827]">
        Gagal Memuat Data
      </h3>
      <p className="mt-1 max-w-md text-sm text-slate-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
        >
          <RefreshCw className="h-4 w-4" />
          Coba Lagi
        </button>
      )}
    </div>
  );
}

export function SupabaseSetupBanner() {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">Konfigurasi Supabase Belum Diisi</p>
      <p className="mt-1 text-amber-900">
        Salin <code className="rounded bg-amber-100 px-1 py-0.5">.env.local.example</code>{" "}
        menjadi <code className="rounded bg-amber-100 px-1 py-0.5">.env.local</code>{" "}
        lalu isi <code className="rounded bg-amber-100 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
        dan <code className="rounded bg-amber-100 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        serta jalankan <code className="rounded bg-amber-100 px-1 py-0.5">supabase/schema.sql</code>.
      </p>
    </div>
  );
}

