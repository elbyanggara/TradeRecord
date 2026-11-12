"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownRight, ArrowUpRight, X } from "lucide-react";
import { getTodayIsoDate } from "@/lib/format";
import type {
  AccountType,
  JournalEntry,
  JournalPayload,
  TradeDirection,
} from "@/types/journal";

interface JournalFormModalProps {
  open: boolean;
  initialEntry?: JournalEntry | null;
  defaultDate?: string;
  onClose: () => void;
  onSubmit: (payload: JournalPayload) => Promise<void>;
}

const INSTRUMENT_PRESETS = ["XAUUSD", "EURUSD", "BTCUSD", "NAS100", "BBCA"];

function parseOptionalNumber(raw: string, label: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} harus berupa angka yang valid.`);
  }
  return parsed;
}

export function JournalFormModal({
  open,
  initialEntry,
  defaultDate,
  onClose,
  onSubmit,
}: JournalFormModalProps) {
  if (!open) return null;

  const modalKey = initialEntry
    ? `edit-${initialEntry.id}`
    : `new-${defaultDate ?? "today"}`;

  return (
    <JournalFormModalContent
      key={modalKey}
      initialEntry={initialEntry}
      defaultDate={defaultDate}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function JournalFormModalContent({
  initialEntry,
  defaultDate,
  onClose,
  onSubmit,
}: Omit<JournalFormModalProps, "open">) {
  const isEditing = Boolean(initialEntry);
  const today = getTodayIsoDate();

  const [tanggal, setTanggal] = useState(
    initialEntry?.tanggal ?? defaultDate ?? today
  );
  const [akun, setAkun] = useState<AccountType>(initialEntry?.akun ?? "Real");
  const [instrumen, setInstrumen] = useState(initialEntry?.instrumen ?? "");
  const [arah, setArah] = useState<TradeDirection>(
    initialEntry?.arah ?? "long"
  );
  const [entry, setEntry] = useState(
    initialEntry?.entry !== null && initialEntry?.entry !== undefined
      ? String(initialEntry.entry)
      : ""
  );
  const [exit, setExit] = useState(
    initialEntry?.exit !== null && initialEntry?.exit !== undefined
      ? String(initialEntry.exit)
      : ""
  );
  const [lot, setLot] = useState(
    initialEntry?.lot !== null && initialEntry?.lot !== undefined
      ? String(initialEntry.lot)
      : ""
  );
  const [pnlNominal, setPnlNominal] = useState(
    initialEntry ? String(initialEntry.pnl_nominal) : ""
  );
  const [pnlPersen, setPnlPersen] = useState(
    initialEntry?.pnl_persen !== null && initialEntry?.pnl_persen !== undefined
      ? String(initialEntry.pnl_persen)
      : ""
  );
  const [catatan, setCatatan] = useState(initialEntry?.catatan ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [submitting, onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (!tanggal) {
        throw new Error("Tanggal wajib diisi.");
      }
      if (tanggal > getTodayIsoDate()) {
        throw new Error("Tanggal tidak boleh di masa depan.");
      }
      const cleanInstrumen = instrumen.trim().toUpperCase();
      if (!cleanInstrumen) {
        throw new Error("Instrumen wajib diisi (contoh: XAUUSD).");
      }

      const trimmedPnl = pnlNominal.trim();
      if (!trimmedPnl) {
        throw new Error("PnL Nominal wajib diisi.");
      }
      const parsedPnl = Number(trimmedPnl);
      if (!Number.isFinite(parsedPnl)) {
        throw new Error("PnL Nominal harus berupa angka yang valid.");
      }

      const payload: JournalPayload = {
        tanggal,
        akun,
        instrumen: cleanInstrumen,
        arah,
        entry: parseOptionalNumber(entry, "Harga Entry"),
        exit: parseOptionalNumber(exit, "Harga Exit"),
        lot: parseOptionalNumber(lot, "Lot / Volume"),
        pnl_nominal: parsedPnl,
        pnl_persen: parseOptionalNumber(pnlPersen, "PnL (%)"),
        catatan: catatan.trim() ? catatan.trim() : null,
      };

      setSubmitting(true);
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menyimpan entri jurnal."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="journal-modal-title"
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2
              id="journal-modal-title"
              className="font-heading text-lg font-bold text-[#111827]"
            >
              {isEditing ? "Edit Entri Jurnal" : "Catat PnL Baru"}
            </h2>
            <p className="text-xs text-slate-500">
              Kolom bertanda * wajib diisi.
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Tutup form"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-[#DC2626]"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="journal-tanggal"
                className="block text-xs font-semibold text-slate-700"
              >
                Tanggal *
              </label>
              <input
                id="journal-tanggal"
                type="date"
                max={today}
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700">
                Akun *
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(["Real", "Demo"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAkun(option)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      akun === option
                        ? "border-[#1E3A8A] bg-[#1E3A8A] text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="journal-instrumen"
              className="block text-xs font-semibold text-slate-700"
            >
              Instrumen *
            </label>
            <input
              id="journal-instrumen"
              type="text"
              required
              placeholder="Contoh: XAUUSD, EURUSD, BTCUSD"
              value={instrumen}
              onChange={(e) => setInstrumen(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm uppercase text-[#111827] placeholder:normal-case focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {INSTRUMENT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setInstrumen(preset)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                    instrumen.toUpperCase() === preset
                      ? "border-[#1E3A8A] bg-blue-50 text-[#1E3A8A]"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="block text-xs font-semibold text-slate-700">
                Arah Posisi *
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setArah("long")}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    arah === "long"
                      ? "border-[#16A34A] bg-emerald-50 text-[#16A34A]"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => setArah("short")}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    arah === "short"
                      ? "border-[#DC2626] bg-red-50 text-[#DC2626]"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <ArrowDownRight className="h-4 w-4" />
                  Short
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="journal-pnl-nominal"
                className="block text-xs font-semibold text-slate-700"
              >
                PnL Nominal (+ / -) *
              </label>
              <input
                id="journal-pnl-nominal"
                type="number"
                step="any"
                required
                placeholder="Contoh: 120 atau -100"
                value={pnlNominal}
                onChange={(e) => setPnlNominal(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold tabular-nums text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label
                htmlFor="journal-entry"
                className="block text-xs font-medium text-slate-600"
              >
                Entry
              </label>
              <input
                id="journal-entry"
                type="number"
                step="any"
                placeholder="2650.0"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="journal-exit"
                className="block text-xs font-medium text-slate-600"
              >
                Exit
              </label>
              <input
                id="journal-exit"
                type="number"
                step="any"
                placeholder="2662.0"
                value={exit}
                onChange={(e) => setExit(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="journal-lot"
                className="block text-xs font-medium text-slate-600"
              >
                Lot
              </label>
              <input
                id="journal-lot"
                type="number"
                step="any"
                placeholder="0.1"
                value={lot}
                onChange={(e) => setLot(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="journal-pnl-persen"
                className="block text-xs font-medium text-slate-600"
              >
                PnL (%)
              </label>
              <input
                id="journal-pnl-persen"
                type="number"
                step="any"
                placeholder="1.2"
                value={pnlPersen}
                onChange={(e) => setPnlPersen(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="journal-catatan"
              className="block text-xs font-medium text-slate-600"
            >
              Catatan Trade
            </label>
            <textarea
              id="journal-catatan"
              rows={2}
              placeholder="Contoh: TP tercapai sesuai rencana, disiplin SL."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-[#111827] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#1E3A8A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
            >
              {submitting
                ? "Menyimpan..."
                : isEditing
                ? "Simpan Perubahan"
                : "Simpan Jurnal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
