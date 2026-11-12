import { getCurrentYearMonth } from "@/lib/format";
import type { JournalEntry, JournalFilters } from "@/types/journal";

export interface DailyPnLPoint {
  date: string; // YYYY-MM-DD
  dayLabel: string; // DD
  pnl: number;
  trades: number;
}

export interface DashboardStats {
  currentMonthPnL: number;
  allTimePnL: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number;
  averagePnL: number;
  dailySeries: DailyPnLPoint[];
}

export interface DaySummary {
  date: string;
  pnl: number;
  trades: JournalEntry[];
}

export function filterJournals(
  entries: JournalEntry[],
  filters: JournalFilters
): JournalEntry[] {
  const instrumentQuery = filters.instrumen.trim().toLowerCase();

  return entries.filter((item) => {
    if (filters.month !== "all" && !item.tanggal.startsWith(filters.month)) {
      return false;
    }
    if (filters.akun !== "all" && item.akun !== filters.akun) {
      return false;
    }
    if (instrumentQuery && !item.instrumen.toLowerCase().includes(instrumentQuery)) {
      return false;
    }
    if (filters.hasil === "profit" && item.pnl_nominal <= 0) {
      return false;
    }
    if (filters.hasil === "loss" && item.pnl_nominal >= 0) {
      return false;
    }
    return true;
  });
}

export function computeDashboardStats(
  entries: JournalEntry[],
  targetMonth = getCurrentYearMonth()
): DashboardStats {
  let currentMonthPnL = 0;
  let allTimePnL = 0;
  let winCount = 0;
  let lossCount = 0;
  let breakevenCount = 0;

  const dailyMap = new Map<string, { pnl: number; trades: number }>();

  for (const item of entries) {
    const pnl = Number(item.pnl_nominal) || 0;
    allTimePnL += pnl;

    if (pnl > 0) winCount += 1;
    else if (pnl < 0) lossCount += 1;
    else breakevenCount += 1;

    if (item.tanggal.startsWith(targetMonth)) {
      currentMonthPnL += pnl;
      const existing = dailyMap.get(item.tanggal) ?? { pnl: 0, trades: 0 };
      dailyMap.set(item.tanggal, {
        pnl: existing.pnl + pnl,
        trades: existing.trades + 1,
      });
    }
  }

  const totalTrades = entries.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
  const averagePnL = totalTrades > 0 ? allTimePnL / totalTrades : 0;

  const dailySeries: DailyPnLPoint[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, info]) => ({
      date,
      dayLabel: date.slice(8, 10),
      pnl: info.pnl,
      trades: info.trades,
    }));

  return {
    currentMonthPnL,
    allTimePnL,
    totalTrades,
    winCount,
    lossCount,
    breakevenCount,
    winRate,
    averagePnL,
    dailySeries,
  };
}

export function groupJournalsByDate(
  entries: JournalEntry[],
  yearMonth?: string
): Map<string, DaySummary> {
  const map = new Map<string, DaySummary>();

  for (const item of entries) {
    if (yearMonth && !item.tanggal.startsWith(yearMonth)) continue;
    const existing = map.get(item.tanggal);
    const pnl = Number(item.pnl_nominal) || 0;

    if (existing) {
      existing.pnl += pnl;
      existing.trades.push(item);
    } else {
      map.set(item.tanggal, {
        date: item.tanggal,
        pnl,
        trades: [item],
      });
    }
  }

  return map;
}

export function extractAvailableMonths(entries: JournalEntry[]): string[] {
  const months = new Set<string>();
  months.add(getCurrentYearMonth());
  for (const entry of entries) {
    if (entry.tanggal.length >= 7) {
      months.add(entry.tanggal.slice(0, 7));
    }
  }
  return Array.from(months).sort((a, b) => b.localeCompare(a));
}

