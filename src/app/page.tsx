import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  Lock,
  Smartphone,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { InstallPrompt } from "@/components/InstallPrompt";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Dashboard Ringkasan",
    description:
      "Pantau total PnL bulan berjalan, all-time PnL, win rate, jumlah trade, rata-rata PnL, dan grafik harian secara real-time.",
  },
  {
    icon: CalendarDays,
    title: "Kalender PnL Bulanan",
    description:
      "Lihat hari profit (hijau) dan loss (merah) dalam satu tampilan kalender. Klik tanggal mana saja untuk cek detail trade.",
  },
  {
    icon: Download,
    title: "Filter & Export CSV",
    description:
      "Filter riwayat berdasarkan bulan, instrumen, akun Real/Demo, atau hasil profit/loss, lalu unduh ke file CSV kapan saja.",
  },
  {
    icon: Lock,
    title: "Privat & Aman (RLS)",
    description:
      "Setiap data trade dilindungi Row Level Security di database sehingga hanya akun Anda yang dapat mengakses catatan Anda.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6] text-[#111827]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandLogo href="/" size="md" />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#111827]"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900"
            >
              Daftar Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pt-16 lg:pb-16">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold text-[#1E3A8A]">
                <Smartphone className="h-3.5 w-3.5" />
                Web & PWA • Akses dari HP maupun Desktop
              </div>

              <h1 className="mt-5 font-heading text-3xl font-extrabold tracking-tight text-[#111827] sm:text-5xl sm:leading-[1.12]">
                Catat PnL harianmu,{" "}
                <span className="text-[#1E3A8A]">di mana saja.</span>
              </h1>

              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                Jurnal PnL harian yang simpel, aman, dan bisa diakses dari HP
                maupun desktop. Catat profit &amp; loss trading-mu, pantau
                performa, dan simpan datamu dengan aman.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900"
                >
                  Mulai Catat Gratis
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-[#111827] transition hover:bg-slate-50"
                >
                  Sudah Punya Akun? Masuk
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                  Siap pakai dalam &lt; 3 menit
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                  Installable PWA (Android &amp; iOS)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                  Export CSV kapan saja
                </span>
              </div>
            </div>

            {/* Product Preview Card */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Ringkasan Bulan Ini
                    </p>
                    <p className="mt-0.5 font-heading text-2xl font-extrabold tabular-nums text-[#16A34A]">
                      +1.420
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-3 py-1.5 text-right">
                    <p className="text-[11px] font-medium text-emerald-700">
                      Win Rate
                    </p>
                    <p className="font-heading text-sm font-bold tabular-nums text-[#16A34A]">
                      66,7%
                    </p>
                  </div>
                </div>

                {/* Mini Daily Bars */}
                <div className="mt-4 grid grid-cols-7 gap-2">
                  {[
                    { day: "Sen", val: "+180", pos: true },
                    { day: "Sel", val: "-90", pos: false },
                    { day: "Rab", val: "+340", pos: true },
                    { day: "Kam", val: "+120", pos: true },
                    { day: "Jum", val: "-100", pos: false },
                    { day: "Sab", val: "—", pos: null },
                    { day: "Min", val: "+970", pos: true },
                  ].map((item) => (
                    <div
                      key={item.day}
                      className={`rounded-xl border p-2 text-center ${
                        item.pos === true
                          ? "border-emerald-200 bg-emerald-50/70"
                          : item.pos === false
                          ? "border-red-200 bg-red-50/70"
                          : "border-slate-200 bg-[#F3F4F6]"
                      }`}
                    >
                      <p className="text-[10px] font-medium text-slate-500">
                        {item.day}
                      </p>
                      <p
                        className={`mt-1 text-[11px] font-bold tabular-nums ${
                          item.pos === true
                            ? "text-[#16A34A]"
                            : item.pos === false
                            ? "text-[#DC2626]"
                            : "text-slate-400"
                        }`}
                      >
                        {item.val}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Example Entries matching PRD §14 */}
                <div className="mt-5 space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Contoh Catatan Jurnal
                  </p>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#16A34A]">
                        <TrendingUp className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#111827]">
                            XAUUSD
                          </span>
                          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#1E3A8A]">
                            Real
                          </span>
                          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#16A34A]">
                            LONG
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          10 Nov 2026 • TP tercapai
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums text-[#16A34A]">
                        +120
                      </p>
                      <p className="text-[11px] font-medium tabular-nums text-emerald-700">
                        +1,2%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#DC2626]">
                        <TrendingDown className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#111827]">
                            EURUSD
                          </span>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                            Demo
                          </span>
                          <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#DC2626]">
                            SHORT
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          11 Nov 2026 • SL kena
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums text-[#DC2626]">
                        -100
                      </p>
                      <p className="text-[11px] font-medium tabular-nums text-red-700">
                        -0,8%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="border-t border-slate-200 bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="font-heading text-2xl font-bold text-[#111827] sm:text-3xl">
                Semua yang trader butuhkan, tanpa spreadsheet rumit
              </h2>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Fokus mencatat hasil trading harian dengan cepat dari HP setelah
                tutup posisi.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-[#F3F4F6]/60 p-5 transition hover:border-blue-200 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E3A8A] text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-heading text-base font-bold text-[#111827]">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <InstallPrompt />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-[#F3F4F6] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
          <BrandLogo href="/" size="sm" showTagline />
          <div className="flex items-center gap-5 text-xs font-medium text-slate-600">
            <Link href="/login" className="hover:text-[#1E3A8A]">
              Masuk
            </Link>
            <Link href="/register" className="hover:text-[#1E3A8A]">
              Daftar
            </Link>
            <Link href="/reset" className="hover:text-[#1E3A8A]">
              Reset Password
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
