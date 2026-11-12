import type { JournalEntry } from "@/types/journal";

const CSV_HEADERS = [
  "tanggal",
  "akun",
  "instrumen",
  "arah",
  "entry",
  "exit",
  "lot",
  "pnl_nominal",
  "pnl_persen",
  "catatan",
] as const;

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function journalsToCsv(entries: JournalEntry[]): string {
  const headerLine = CSV_HEADERS.join(",");
  const rows = entries.map((item) =>
    [
      escapeCsvCell(item.tanggal),
      escapeCsvCell(item.akun),
      escapeCsvCell(item.instrumen),
      escapeCsvCell(item.arah),
      escapeCsvCell(item.entry),
      escapeCsvCell(item.exit),
      escapeCsvCell(item.lot),
      escapeCsvCell(item.pnl_nominal),
      escapeCsvCell(item.pnl_persen),
      escapeCsvCell(item.catatan),
    ].join(",")
  );
  // Prepend UTF-8 BOM so Excel/Sheets renders Indonesian text cleanly
  return `\uFEFF${[headerLine, ...rows].join("\r\n")}`;
}

export function downloadJournalsCsv(
  entries: JournalEntry[],
  filename = "pnl-diary-export.csv"
): void {
  const csv = journalsToCsv(entries);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

