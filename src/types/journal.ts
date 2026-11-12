export type AccountType = "Real" | "Demo";
export type TradeDirection = "long" | "short";
export type OutcomeFilter = "all" | "profit" | "loss";

export interface JournalEntry {
  id: string;
  user_id: string;
  tanggal: string; // YYYY-MM-DD
  akun: AccountType;
  instrumen: string;
  arah: TradeDirection;
  entry: number | null;
  exit: number | null;
  lot: number | null;
  pnl_nominal: number;
  pnl_persen: number | null;
  catatan: string | null;
  external_id?: string | null;
  created_at: string;
}

export interface JournalPayload {
  tanggal: string;
  akun: AccountType;
  instrumen: string;
  arah: TradeDirection;
  entry: number | null;
  exit: number | null;
  lot: number | null;
  pnl_nominal: number;
  pnl_persen: number | null;
  catatan: string | null;
  external_id?: string | null;
}

export interface JournalFilters {
  month: string; // "all" | "YYYY-MM"
  instrumen: string; // "" or search text
  akun: "all" | AccountType;
  hasil: OutcomeFilter;
}
