"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookText,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Plus,
  UserCircle2,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useToast } from "@/components/ToastProvider";
import { formatAccountLabel } from "@/lib/mt5-account";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

interface AppShellProps {
  userEmail: string;
  children: ReactNode;
  onQuickAdd?: () => void;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/journal", label: "Jurnal", icon: BookText },
  { href: "/calendar", label: "Kalender", icon: CalendarDays },
  { href: "/profile", label: "Profil", icon: UserCircle2 },
] as const;

export function AppShell({ userEmail, children, onQuickAdd }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();

  async function handleLogout() {
    try {
      if (!isSupabaseConfigured()) {
        await fetch("/api/local/auth/logout", { method: "POST" });
      } else {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
      showToast("Berhasil keluar dari akun.", "info");
      router.push("/login");
      router.refresh();
    } catch {
      showToast("Gagal keluar dari sesi.", "error");
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#111827] md:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-slate-200 md:bg-white">
        <div className="flex h-16 items-center border-b border-slate-100 px-5">
          <BrandLogo href="/dashboard" size="md" />
        </div>

        <div className="p-4">
          {onQuickAdd ? (
            <button
              type="button"
              onClick={onQuickAdd}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900"
            >
              <Plus className="h-4 w-4" />
              Catat PnL
            </button>
          ) : (
            <Link
              href="/journal?new=1"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900"
            >
              <Plus className="h-4 w-4" />
              Catat PnL
            </Link>
          )}
        </div>

        <nav aria-label="Navigasi utama" className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-blue-50 text-[#1E3A8A]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-[#111827]"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    active ? "text-[#1E3A8A]" : "text-slate-400"
                  }`}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-[#F3F4F6] px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Akun Aktif
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-[#111827]">
              {formatAccountLabel(userEmail)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-red-50 hover:border-red-200 hover:text-[#DC2626]"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm md:hidden">
          <BrandLogo href="/dashboard" size="sm" />
          {onQuickAdd ? (
            <button
              type="button"
              onClick={onQuickAdd}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E3A8A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-900"
            >
              <Plus className="h-4 w-4" />
              Catat
            </button>
          ) : (
            <Link
              href="/journal?new=1"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E3A8A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-900"
            >
              <Plus className="h-4 w-4" />
              Catat
            </Link>
          )}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-24 md:px-8 md:py-7 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav
        aria-label="Navigasi mobile"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur-sm md:hidden"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition ${
                active ? "text-[#1E3A8A]" : "text-slate-500 hover:text-[#111827]"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  active ? "text-[#1E3A8A]" : "text-slate-400"
                }`}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

