"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DailyPnLChart } from "@/components/DailyPnLChart";
import { JournalFormModal } from "@/components/JournalFormModal";
import { useToast } from "@/components/ToastProvider";
import {
  DashboardSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/UiStates";
import { useJournals } from "@/hooks/useJournals";
import {
  formatDateId,
  formatMonthYear,
  formatPercent,
  formatSignedPnL,
  getCurrentYearMonth,
} from "@/lib/format";
import { computeDashboardStats, extractAvailableMonths } from "@/lib/journals";
import type { AccountType, JournalPayload } from "@/types/journal";

interface DashboardClientProps {
  userId: string;
  userEmail: string;
}

export function DashboardClient({ userId, userEmail }: DashboardClientProps) {
  const { showToast } = useToast();
  const { journals, isLoading, error, refresh, createJournal } =
    useJournals(userId);

  const [accountFilter, setAccountFilter] = useState<"all" | AccountType>("all");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());
  const [modalOpen, setModalOpen] = useState(false);

  const filteredByAccount = useMemo(() => {
    if (accountFilter === "all") return journals;
    return journals.filter((item) => item.akun === accountFilter);
  }, [journals, accountFilter]);

  const availableMonths = useMemo(
    () => extractAvailableMonths(filteredByAccount),
    [filteredByAccount]
  );

  const stats = useMemo(
    () => computeDashboardStats(filteredByAccount, selectedMonth),
    [filteredByAccount, selectedMonth]
  );

  const recentTrades = useMemo(
    () => filteredByAccount.slice(0, 5),
    [filteredByAccount]
  );

  async function handleCreate(payload: JournalPayload) {
    await createJournal(payload);
    showToast("Catatan PnL berhasil disimpan.", "success");
  }

  return (
    <AppShell userEmail={userEmail} onQuickAdd={() => setModalOpen(true)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#111827]">
              Dashboard Ringkasan
            </h1>
            <p className="text-sm text-slate-600">
              Pantau performa PnL harian dan konsistensi trading Anda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              {(["all", "Real", "Demo"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAccountFilter(opt)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    accountFilter === opt
                      ? "bg-[#1E3A8A] text-white"
                      : "text-slate-600 hover:text-[#111827]"
                  }`}
                >
                  {opt === "all" ? "Semua Akun" : opt}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-[#1E3A8A] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-900"
            >
              <Plus className="h-4 w-4" />
              Catat PnL
            </button>
          </div>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          <ErrorState message={error.message} onRetry={refresh} />
        ) : filteredByAccount.length === 0 ? (
          <EmptyState
            title="Belum Ada Catatan PnL"
            description="Mulai catat hasil trading harian Anda sekarang untuk melihat ringkasan win rate, total PnL, dan grafik harian."
            action={
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1E3A8A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"
              >
                <Plus className="h-4 w-4" />
                Catat PnL Pertama
              </button>
            }
          />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    PnL ({formatMonthYear(selectedMonth)})
                  </span>
                  <Calendar className="h-4 w-4 text-[#1E3A8A]" />
                </div>
                <p
                  className={`mt-2 font-heading text-2xl font-extrabold tabular-nums ${
                    stats.currentMonthPnL > 0
                      ? "text-[#16A34A]"
                      : stats.currentMonthPnL < 0
                      ? "text-[#DC2626]"
                      : "text-[#111827]"
                  }`}
                >
                  {formatSignedPnL(stats.currentMonthPnL)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {stats.dailySeries.length} hari aktif trading
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Total PnL All-Time
                  </span>
                  <Wallet className="h-4 w-4 text-[#1E3A8A]" />
                </div>
                <p
                  className={`mt-2 font-heading text-2xl font-extrabold tabular-nums ${
                    stats.allTimePnL > 0
                      ? "text-[#16A34A]"
                      : stats.allTimePnL < 0
                      ? "text-[#DC2626]"
                      : "text-[#111827]"
                  }`}
                >
                  {formatSignedPnL(stats.allTimePnL)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Akumulasi seluruh entri
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Win Rate &amp; Trade
                  </span>
                  <TrendingUp className="h-4 w-4 text-[#16A34A]" />
                </div>
                <p className="mt-2 font-heading text-2xl font-extrabold tabular-nums text-[#111827]">
                  {stats.winRate.toFixed(1)}%
                </p>
                <p className="mt-1 text-xs text-slate-500 tabular-nums">
                  {stats.totalTrades} trade ({stats.winCount}W / {stats.lossCount}
                  L)
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Rata-rata PnL / Trade
                  </span>
                  <Activity className="h-4 w-4 text-[#1E3A8A]" />
                </div>
                <p
                  className={`mt-2 font-heading text-2xl font-extrabold tabular-nums ${
                    stats.averagePnL > 0
                      ? "text-[#16A34A]"
                      : stats.averagePnL < 0
                      ? "text-[#DC2626]"
                      : "text-[#111827]"
                  }`}
                >
                  {formatSignedPnL(stats.averagePnL)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Expectancy nominal rata-rata
                </p>
              </div>
            </div>

            {/* Chart & Recent Trades */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-heading text-base font-bold text-[#111827]">
                      Grafik PnL Harian
                    </h2>
                    <p className="text-xs text-slate-500">
                      Ketuk atau arahkan kursor ke batang untuk detail harian.
                    </p>
                  </div>
                  <select
                    aria-label="Pilih bulan grafik"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#111827] focus:border-[#1E3A8A] focus:outline-none"
                  >
                    {availableMonths.map((ym) => (
                      <option key={ym} value={ym}>
                        {formatMonthYear(ym)}
                      </option>
                    ))}
                  </select>
                </div>

                <DailyPnLChart series={stats.dailySeries} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-heading text-base font-bold text-[#111827]">
                    Entri Terbaru
                  </h2>
                  <Link
                    href="/journal"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A8A] hover:underline"
                  >
                    Lihat Semua
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {recentTrades.map((item) => {
                    const isProfit = item.pnl_nominal > 0;
                    const isLoss = item.pnl_nominal < 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#F3F4F6]/60 px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              item.arah === "long"
                                ? "bg-emerald-50 text-[#16A34A]"
                                : "bg-red-50 text-[#DC2626]"
                            }`}
                          >
                            {item.arah === "long" ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-bold text-[#111827]">
                                {item.instrumen}
                              </span>
                              <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                                {item.akun}
                              </span>
                            </div>
                            <p className="truncate text-xs text-slate-500">
                              {formatDateId(item.tanggal)}
                              {item.catatan ? ` • ${item.catatan}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="ml-3 shrink-0 text-right">
                          <p
                            className={`text-sm font-bold tabular-nums ${
                              isProfit
                                ? "text-[#16A34A]"
                                : isLoss
                                ? "text-[#DC2626]"
                                : "text-slate-600"
                            }`}
                          >
                            {formatSignedPnL(item.pnl_nominal)}
                          </p>
                          {item.pnl_persen !== null && (
                            <p className="text-[11px] font-medium tabular-nums text-slate-500">
                              {formatPercent(item.pnl_persen)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <JournalFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </AppShell>
  );
}

