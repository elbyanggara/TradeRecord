"use client";

import { useState } from "react";
import { formatDateId, formatSignedPnL } from "@/lib/format";
import type { DailyPnLPoint } from "@/lib/journals";

export function DailyPnLChart({ series }: { series: DailyPnLPoint[] }) {
  const [selected, setSelected] = useState<DailyPnLPoint | null>(null);

  if (series.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-500">
        Belum ada data transaksi pada bulan ini untuk ditampilkan di grafik.
      </div>
    );
  }

  const maxAbs = Math.max(...series.map((d) => Math.abs(d.pnl)), 1);
  const activePoint = selected ?? series[series.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F3F4F6] px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="font-semibold text-[#111827]">
            {formatDateId(activePoint.date)}
          </span>
          <span>•</span>
          <span>{activePoint.trades} trade</span>
        </div>
        <span
          className={`font-bold tabular-nums ${
            activePoint.pnl > 0
              ? "text-[#16A34A]"
              : activePoint.pnl < 0
              ? "text-[#DC2626]"
              : "text-slate-600"
          }`}
        >
          {formatSignedPnL(activePoint.pnl)}
        </span>
      </div>

      <div className="relative overflow-x-auto pb-2">
        <div
          className="relative flex h-48 min-w-full items-center gap-1.5 px-1"
          style={{ minWidth: series.length > 14 ? `${series.length * 26}px` : undefined }}
        >
          {/* Zero baseline */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-slate-300" />

          {series.map((point) => {
            const heightPct = Math.max((Math.abs(point.pnl) / maxAbs) * 44, 6);
            const isPositive = point.pnl >= 0;
            const isActive = activePoint.date === point.date;

            return (
              <button
                key={point.date}
                type="button"
                onClick={() => setSelected(point)}
                onMouseEnter={() => setSelected(point)}
                aria-label={`${formatDateId(point.date)}: ${formatSignedPnL(point.pnl)}`}
                className={`group relative flex h-full flex-1 flex-col items-center justify-center rounded-lg transition focus:outline-none ${
                  isActive ? "bg-blue-50/70" : "hover:bg-slate-50"
                }`}
              >
                <div className="relative flex h-full w-full items-center justify-center">
                  <div
                    className={`w-full max-w-[22px] rounded-md transition-all ${
                      point.pnl > 0
                        ? "bg-[#16A34A] group-hover:bg-emerald-700"
                        : point.pnl < 0
                        ? "bg-[#DC2626] group-hover:bg-red-700"
                        : "bg-slate-400"
                    } ${isActive ? "ring-2 ring-[#1E3A8A]/40" : ""}`}
                    style={{
                      height: `${heightPct}%`,
                      position: "absolute",
                      bottom: isPositive ? "50%" : undefined,
                      top: !isPositive ? "50%" : undefined,
                    }}
                  />
                </div>
                <span className="mt-auto text-[10px] font-medium text-slate-500 tabular-nums">
                  {point.dayLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

