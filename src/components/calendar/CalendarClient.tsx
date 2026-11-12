"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
  getTodayIsoDate,
} from "@/lib/format";
import { groupJournalsByDate } from "@/lib/journals";
import type {
  AccountType,
  JournalEntry,
  JournalPayload,
} from "@/types/journal";

const WEEKDAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function shiftYearMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, "0");
  return `${nextY}-${nextM}`;
}

export function CalendarClient({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const { showToast } = useToast();
  const {
    journals,
    isLoading,
    error,
    refresh,
    createJournal,
    updateJournal,
    deleteJournal,
  } = useJournals(userId);

  const today = getTodayIsoDate();
  const [currentMonth, setCurrentMonth] = useState(getCurrentYearMonth());
  const [accountFilter, setAccountFilter] = useState<"all" | AccountType>("all");
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const [formOpen, setFormOpen] = useState(false);
  const [formDefaultDate, setFormDefaultDate] = useState<string>(today);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<JournalEntry | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const filteredJournals = useMemo(() => {
    if (accountFilter === "all") return journals;
    return journals.filter((item) => item.akun === accountFilter);
  }, [journals, accountFilter]);

  const dailyMap = useMemo(
    () => groupJournalsByDate(filteredJournals, currentMonth),
    [filteredJournals, currentMonth]
  );

  const calendarCells = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const daysInMonth = new Date(y, m, 0).getDate();
    // Monday-first offset: JS getDay() 0 (Sun) -> 6, 1 (Mon) -> 0
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: Array<{ isoDate: string; dayNumber: number } | null> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dd = String(day).padStart(2, "0");
      cells.push({
        isoDate: `${currentMonth}-${dd}`,
        dayNumber: day,
      });
    }
    return cells;
  }, [currentMonth]);

  const monthStats = useMemo(() => {
    let totalPnL = 0;
    let profitDays = 0;
    let lossDays = 0;
    let totalTrades = 0;

    for (const day of dailyMap.values()) {
      totalPnL += day.pnl;
      totalTrades += day.trades.length;
      if (day.pnl > 0) profitDays += 1;
      else if (day.pnl < 0) lossDays += 1;
    }

    return { totalPnL, profitDays, lossDays, totalTrades };
  }, [dailyMap]);

  const selectedDayEntries = useMemo(() => {
    return filteredJournals.filter((item) => item.tanggal === selectedDate);
  }, [filteredJournals, selectedDate]);

  const selectedDayTotal = useMemo(
    () =>
      selectedDayEntries.reduce(
        (sum, item) => sum + (Number(item.pnl_nominal) || 0),
        0
      ),
    [selectedDayEntries]
  );

  function openCreateForDate(dateIso: string) {
    const target = dateIso > today ? today : dateIso;
    setEditingEntry(null);
    setFormDefaultDate(target);
    setFormOpen(true);
  }

  async function handleFormSubmit(payload: JournalPayload) {
    if (editingEntry) {
      await updateJournal(editingEntry.id, payload);
      showToast("Entri berhasil diperbarui.", "success");
    } else {
      await createJournal(payload);
      showToast("Entri berhasil ditambahkan.", "success");
    }
  }

  async function handleConfirmDelete() {
    if (!deletingEntry) return;
    try {
      setDeletingLoading(true);
      await deleteJournal(deletingEntry.id);
      showToast("Entri telah dihapus.", "info");
      setDeletingEntry(null);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal menghapus entri.",
        "error"
      );
    } finally {
      setDeletingLoading(false);
    }
  }

  return (
    <AppShell
      userEmail={userEmail}
      onQuickAdd={() => openCreateForDate(selectedDate)}
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#111827]">
              Kalender PnL
            </h1>
            <p className="text-sm text-slate-600">
              Ketuk tanggal untuk melihat detail entri trading hari tersebut.
            </p>
          </div>

          <div className="inline-flex self-start rounded-xl border border-slate-200 bg-white p-1">
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
                {opt === "all" ? "Semua" : opt}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          <ErrorState message={error.message} onRetry={refresh} />
        ) : (
          <>
            {/* Month Controls & Summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Bulan sebelumnya"
                    onClick={() =>
                      setCurrentMonth((m) => shiftYearMonth(m, -1))
                    }
                    className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <h2 className="min-w-[140px] text-center font-heading text-base font-bold capitalize text-[#111827]">
                    {formatMonthYear(currentMonth)}
                  </h2>
                  <button
                    type="button"
                    aria-label="Bulan berikutnya"
                    onClick={() => setCurrentMonth((m) => shiftYearMonth(m, 1))}
                    className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  {currentMonth !== getCurrentYearMonth() && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentMonth(getCurrentYearMonth());
                        setSelectedDate(today);
                      }}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#1E3A8A]"
                    >
                      Bulan Ini
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="rounded-lg bg-[#F3F4F6] px-2.5 py-1 font-medium text-slate-700">
                    Total:{" "}
                    <strong
                      className={`tabular-nums ${
                        monthStats.totalPnL > 0
                          ? "text-[#16A34A]"
                          : monthStats.totalPnL < 0
                          ? "text-[#DC2626]"
                          : "text-[#111827]"
                      }`}
                    >
                      {formatSignedPnL(monthStats.totalPnL)}
                    </strong>
                  </span>
                  <span className="font-semibold text-[#16A34A]">
                    {monthStats.profitDays} Profit
                  </span>
                  <span className="font-semibold text-[#DC2626]">
                    {monthStats.lossDays} Loss
                  </span>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    {label}
                  </div>
                ))}

                {calendarCells.map((cell, idx) => {
                  if (!cell) {
                    return <div key={`empty-${idx}`} className="min-h-[60px] sm:min-h-[78px]" />;
                  }

                  const summary = dailyMap.get(cell.isoDate);
                  const hasData = Boolean(summary);
                  const isProfit = summary ? summary.pnl > 0 : false;
                  const isLoss = summary ? summary.pnl < 0 : false;
                  const isSelected = selectedDate === cell.isoDate;
                  const isToday = today === cell.isoDate;

                  let cellClasses =
                    "border-slate-200 bg-[#F3F4F6]/80 text-slate-700 hover:border-slate-300";
                  if (hasData) {
                    if (isProfit) {
                      cellClasses =
                        "border-emerald-200 bg-emerald-50 text-[#16A34A] hover:border-[#16A34A]";
                    } else if (isLoss) {
                      cellClasses =
                        "border-red-200 bg-red-50 text-[#DC2626] hover:border-[#DC2626]";
                    } else {
                      cellClasses =
                        "border-slate-300 bg-slate-100 text-slate-700";
                    }
                  }

                  return (
                    <button
                      key={cell.isoDate}
                      type="button"
                      onClick={() => setSelectedDate(cell.isoDate)}
                      className={`relative flex min-h-[62px] flex-col justify-between rounded-xl border p-1.5 text-left transition sm:min-h-[82px] sm:p-2 ${cellClasses} ${
                        isSelected
                          ? "ring-2 ring-[#1E3A8A] ring-offset-1"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[11px] font-bold tabular-nums ${
                            isToday
                              ? "rounded-full bg-[#1E3A8A] px-1.5 py-0.5 text-white"
                              : "text-[#111827]"
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        {summary && (
                          <span className="hidden rounded bg-white/80 px-1 text-[10px] font-semibold text-slate-600 sm:inline">
                            {summary.trades.length}x
                          </span>
                        )}
                      </div>

                      {summary ? (
                        <span className="truncate text-[10px] font-extrabold tabular-nums sm:text-xs">
                          {formatSignedPnL(summary.pnl)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-[#16A34A]" />
                  Hari Profit
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-[#DC2626]" />
                  Hari Loss
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-slate-300 bg-[#F3F4F6]" />
                  Tidak ada data
                </span>
              </div>
            </div>

            {/* Selected Date Detail */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Detail Tanggal
                  </p>
                  <div className="flex items-center gap-3">
                    <h3 className="font-heading text-lg font-bold text-[#111827]">
                      {formatDateId(selectedDate)}
                    </h3>
                    {selectedDayEntries.length > 0 && (
                      <span
                        className={`rounded-lg px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                          selectedDayTotal > 0
                            ? "bg-emerald-50 text-[#16A34A]"
                            : selectedDayTotal < 0
                            ? "bg-red-50 text-[#DC2626]"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {formatSignedPnL(selectedDayTotal)}
                      </span>
                    )}
                  </div>
                </div>

                {selectedDate <= today && (
                  <button
                    type="button"
                    onClick={() => openCreateForDate(selectedDate)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1E3A8A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-900"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah di Tanggal Ini
                  </button>
                )}
              </div>

              {selectedDayEntries.length === 0 ? (
                <div className="pt-4">
                  <EmptyState
                    title="Tidak Ada Trade pada Tanggal Ini"
                    description={
                      selectedDate > today
                        ? "Tanggal berada di masa depan."
                        : "Belum ada catatan transaksi untuk tanggal yang dipilih."
                    }
                  />
                </div>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {selectedDayEntries.map((item) => {
                    const isProfit = item.pnl_nominal > 0;
                    const isLoss = item.pnl_nominal < 0;
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-[#F3F4F6]/50 p-3.5 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
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
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-[#111827]">
                                {item.instrumen}
                              </span>
                              <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                                {item.akun}
                              </span>
                              <span className="text-[11px] font-semibold uppercase text-slate-500">
                                {item.arah}
                              </span>
                            </div>
                            {item.catatan && (
                              <p className="mt-0.5 text-xs text-slate-600">
                                {item.catatan}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                          <div className="text-left sm:text-right">
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
                              <p className="text-[11px] tabular-nums text-slate-500">
                                {formatPercent(item.pnl_persen)}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEntry(item);
                                setFormOpen(true);
                              }}
                              aria-label={`Edit ${item.instrumen}`}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-[#1E3A8A]"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingEntry(item)}
                              aria-label={`Hapus ${item.instrumen}`}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-[#DC2626]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <JournalFormModal
        open={formOpen}
        initialEntry={editingEntry}
        defaultDate={formDefaultDate}
        onClose={() => {
          setFormOpen(false);
          setEditingEntry(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDialog
        open={Boolean(deletingEntry)}
        title="Hapus Entri Jurnal?"
        description="Entri yang dihapus tidak dapat dikembalikan."
        confirmLabel="Ya, Hapus"
        loading={deletingLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingEntry(null)}
      />
    </AppShell>
  );
}

