"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { JournalFormModal } from "@/components/JournalFormModal";
import { useToast } from "@/components/ToastProvider";
import {
  EmptyState,
  ErrorState,
  JournalListSkeleton,
} from "@/components/UiStates";
import { useJournals } from "@/hooks/useJournals";
import { downloadJournalsCsv } from "@/lib/csv";
import {
  formatDateId,
  formatMonthYear,
  formatNumber,
  formatPercent,
  formatSignedPnL,
} from "@/lib/format";
import { extractAvailableMonths, filterJournals } from "@/lib/journals";
import type {
  JournalEntry,
  JournalFilters,
  JournalPayload,
} from "@/types/journal";

const PAGE_SIZE = 20;

const DEFAULT_FILTERS: JournalFilters = {
  month: "all",
  instrumen: "",
  akun: "all",
  hasil: "all",
};

export function JournalClient({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const searchParams = useSearchParams();
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

  const [filters, setFilters] = useState<JournalFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(
    () => searchParams.get("new") === "1"
  );
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<JournalEntry | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const availableMonths = useMemo(
    () => extractAvailableMonths(journals),
    [journals]
  );

  const filteredEntries = useMemo(
    () => filterJournals(journals, filters),
    [journals, filters]
  );

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const paginatedEntries = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [filteredEntries, safePage]);

  const hasActiveFilter =
    filters.month !== "all" ||
    filters.instrumen.trim() !== "" ||
    filters.akun !== "all" ||
    filters.hasil !== "all";

  function updateFilter<K extends keyof JournalFilters>(
    key: K,
    value: JournalFilters[K]
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  function openCreateModal() {
    setEditingEntry(null);
    setFormOpen(true);
  }

  function openEditModal(entry: JournalEntry) {
    setEditingEntry(entry);
    setFormOpen(true);
  }

  async function handleFormSubmit(payload: JournalPayload) {
    if (editingEntry) {
      await updateJournal(editingEntry.id, payload);
      showToast("Entri jurnal berhasil diperbarui.", "success");
    } else {
      await createJournal(payload);
      showToast("Entri jurnal berhasil ditambahkan.", "success");
    }
  }

  async function handleConfirmDelete() {
    if (!deletingEntry) return;
    try {
      setDeletingLoading(true);
      await deleteJournal(deletingEntry.id);
      showToast("Entri jurnal telah dihapus.", "info");
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

  function handleExportCsv() {
    if (filteredEntries.length === 0) {
      showToast("Tidak ada data untuk diexport.", "info");
      return;
    }
    const suffix = filters.month !== "all" ? filters.month : "semua";
    downloadJournalsCsv(filteredEntries, `pnl-diary-${suffix}.csv`);
    showToast(
      `Berhasil mengunduh ${filteredEntries.length} entri ke CSV.`,
      "success"
    );
  }

  return (
    <AppShell userEmail={userEmail} onQuickAdd={openCreateModal}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#111827]">
              Jurnal PnL
            </h1>
            <p className="text-sm text-slate-600">
              Catat, filter, edit, dan export seluruh transaksi trading Anda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredEntries.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#111827] hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E3A8A] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-900"
            >
              <Plus className="h-4 w-4" />
              Tambah Entri
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Filter className="h-3.5 w-3.5 text-[#1E3A8A]" />
              Filter Jurnal
            </span>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A8A] hover:underline"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="filter-month"
                className="block text-[11px] font-medium text-slate-500"
              >
                Bulan
              </label>
              <select
                id="filter-month"
                value={filters.month}
                onChange={(e) => updateFilter("month", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#111827] focus:border-[#1E3A8A] focus:outline-none"
              >
                <option value="all">Semua Bulan</option>
                {availableMonths.map((ym) => (
                  <option key={ym} value={ym}>
                    {formatMonthYear(ym)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-instrumen"
                className="block text-[11px] font-medium text-slate-500"
              >
                Instrumen
              </label>
              <input
                id="filter-instrumen"
                type="text"
                placeholder="Cari XAUUSD, EURUSD..."
                value={filters.instrumen}
                onChange={(e) => updateFilter("instrumen", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-[#111827] focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="filter-akun"
                className="block text-[11px] font-medium text-slate-500"
              >
                Akun
              </label>
              <select
                id="filter-akun"
                value={filters.akun}
                onChange={(e) =>
                  updateFilter("akun", e.target.value as JournalFilters["akun"])
                }
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#111827] focus:border-[#1E3A8A] focus:outline-none"
              >
                <option value="all">Semua Akun</option>
                <option value="Real">Real</option>
                <option value="Demo">Demo</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-hasil"
                className="block text-[11px] font-medium text-slate-500"
              >
                Hasil
              </label>
              <select
                id="filter-hasil"
                value={filters.hasil}
                onChange={(e) =>
                  updateFilter(
                    "hasil",
                    e.target.value as JournalFilters["hasil"]
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#111827] focus:border-[#1E3A8A] focus:outline-none"
              >
                <option value="all">Semua Hasil</option>
                <option value="profit">Profit (+)</option>
                <option value="loss">Loss (-)</option>
              </select>
            </div>
          </div>
        </div>

        {/* List Content */}
        {isLoading ? (
          <JournalListSkeleton />
        ) : error ? (
          <ErrorState message={error.message} onRetry={refresh} />
        ) : filteredEntries.length === 0 ? (
          <EmptyState
            title={
              hasActiveFilter
                ? "Tidak Ada Entri yang Cocok"
                : "Jurnal PnL Masih Kosong"
            }
            description={
              hasActiveFilter
                ? "Coba ubah atau reset filter untuk melihat catatan lainnya."
                : "Tambahkan entri PnL pertama Anda untuk mulai melacak riwayat trading."
            }
            action={
              hasActiveFilter ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-slate-50"
                >
                  Reset Filter
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1E3A8A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Entri
                </button>
              )
            }
          />
        ) : (
          <>
            {/* Mobile Card List (< md) */}
            <div className="space-y-3 md:hidden">
              {paginatedEntries.map((item) => {
                const isProfit = item.pnl_nominal > 0;
                const isLoss = item.pnl_nominal < 0;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-heading text-base font-bold text-[#111827]">
                            {item.instrumen}
                          </span>
                          <span className="rounded-md bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {item.akun}
                          </span>
                          <span
                            className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase ${
                              item.arah === "long"
                                ? "bg-emerald-50 text-[#16A34A]"
                                : "bg-red-50 text-[#DC2626]"
                            }`}
                          >
                            {item.arah === "long" ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {item.arah}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateId(item.tanggal)}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className={`font-heading text-base font-extrabold tabular-nums ${
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
                          <p className="text-xs font-medium tabular-nums text-slate-500">
                            {formatPercent(item.pnl_persen)}
                          </p>
                        )}
                      </div>
                    </div>

                    {(item.entry !== null ||
                      item.exit !== null ||
                      item.lot !== null) && (
                      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#F3F4F6] px-3 py-2 text-[11px]">
                        <div>
                          <span className="text-slate-500">Entry</span>
                          <p className="font-semibold tabular-nums text-[#111827]">
                            {formatNumber(item.entry)}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Exit</span>
                          <p className="font-semibold tabular-nums text-[#111827]">
                            {formatNumber(item.exit)}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Lot</span>
                          <p className="font-semibold tabular-nums text-[#111827]">
                            {formatNumber(item.lot)}
                          </p>
                        </div>
                      </div>
                    )}

                    {item.catatan && (
                      <p className="mt-2.5 text-xs text-slate-600">
                        {item.catatan}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingEntry(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs md:block">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#F3F4F6]/80 text-xs font-semibold text-slate-600">
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Akun</th>
                      <th className="px-4 py-3">Instrumen</th>
                      <th className="px-4 py-3">Arah</th>
                      <th className="px-4 py-3 text-right">Entry / Exit</th>
                      <th className="px-4 py-3 text-right">Lot</th>
                      <th className="px-4 py-3 text-right">PnL</th>
                      <th className="px-4 py-3">Catatan</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedEntries.map((item) => {
                      const isProfit = item.pnl_nominal > 0;
                      const isLoss = item.pnl_nominal < 0;
                      return (
                        <tr
                          key={item.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-slate-700">
                            {formatDateId(item.tanggal)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                                item.akun === "Real"
                                  ? "bg-blue-50 text-[#1E3A8A]"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {item.akun}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-[#111827]">
                            {item.instrumen}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold uppercase ${
                                item.arah === "long"
                                  ? "bg-emerald-50 text-[#16A34A]"
                                  : "bg-red-50 text-[#DC2626]"
                              }`}
                            >
                              {item.arah === "long" ? (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDownRight className="h-3.5 w-3.5" />
                              )}
                              {item.arah}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-xs tabular-nums text-slate-600">
                            {formatNumber(item.entry)} / {formatNumber(item.exit)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-xs tabular-nums text-slate-600">
                            {formatNumber(item.lot)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <p
                              className={`font-bold tabular-nums ${
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
                          </td>
                          <td className="max-w-[200px] truncate px-4 py-3 text-xs text-slate-600">
                            {item.catatan || "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                aria-label={`Edit ${item.instrumen}`}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#1E3A8A]"
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 sm:flex-row">
              <span>
                Menampilkan{" "}
                <strong className="text-[#111827]">
                  {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filteredEntries.length)}
                </strong>{" "}
                dari{" "}
                <strong className="text-[#111827]">
                  {filteredEntries.length}
                </strong>{" "}
                entri
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Sebelumnya
                </button>
                <span className="font-semibold text-[#111827] tabular-nums">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Berikutnya
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <JournalFormModal
        open={formOpen}
        initialEntry={editingEntry}
        onClose={() => {
          setFormOpen(false);
          setEditingEntry(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDialog
        open={Boolean(deletingEntry)}
        title="Hapus Entri Jurnal?"
        description={
          deletingEntry
            ? `Entri ${deletingEntry.instrumen} tanggal ${formatDateId(
                deletingEntry.tanggal
              )} (${formatSignedPnL(
                deletingEntry.pnl_nominal
              )}) akan dihapus permanen.`
            : ""
        }
        confirmLabel="Ya, Hapus"
        loading={deletingLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingEntry(null)}
      />
    </AppShell>
  );
}

