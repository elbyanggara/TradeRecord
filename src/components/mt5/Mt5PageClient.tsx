"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import useSWR from "swr";
import {
  Bot,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Mt5IntegrationCard } from "@/components/profile/Mt5IntegrationCard";
import { useToast } from "@/components/ToastProvider";
import type { SubscriptionSummary } from "@/lib/subscription";

declare global {
  interface Window {
    snap?: {
      pay: (
        snapToken: string,
        callbacks?: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

async function fetchSubscription(url: string): Promise<SubscriptionSummary> {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as SubscriptionSummary & { error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? "Gagal memuat status paket Pro.");
  }
  return json;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateId(iso: string | null): string {
  if (!iso) return "Selamanya";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function Mt5PageClient({
  userEmail,
  initialOrderId,
}: {
  userEmail: string;
  initialOrderId: string | null;
}) {
  const { showToast } = useToast();
  const {
    data: sub,
    error,
    isLoading,
    mutate,
  } = useSWR<SubscriptionSummary, Error>("/api/subscription", fetchSubscription);

  const [checkingOut, setCheckingOut] = useState(false);
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const autoVerifiedRef = useRef<string | null>(null);

  const verifyOrder = useCallback(
    async (orderId: string, silent = false) => {
      try {
        setVerifyingOrderId(orderId);
        const res = await fetch("/api/payments/midtrans/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const json = (await res.json()) as {
          status?: string;
          isPro?: boolean;
          error?: string;
        };

        if (!res.ok) {
          if (!silent) {
            showToast(json.error ?? "Gagal mengecek status pembayaran.", "error");
          }
          return;
        }

        await mutate();
        if (json.isPro) {
          showToast(
            "Pembayaran terkonfirmasi! Fitur Auto-Sync MT5 Pro sudah aktif.",
            "success"
          );
        } else if (!silent) {
          showToast(
            `Status transaksi saat ini: ${json.status ?? "pending"}.`,
            "info"
          );
        }
      } catch {
        if (!silent) {
          showToast("Terjadi kesalahan saat memverifikasi pembayaran.", "error");
        }
      } finally {
        setVerifyingOrderId(null);
      }
    },
    [mutate, showToast]
  );

  useEffect(() => {
    if (!initialOrderId || autoVerifiedRef.current === initialOrderId) return;
    autoVerifiedRef.current = initialOrderId;
    void verifyOrder(initialOrderId, true);
  }, [initialOrderId, verifyOrder]);

  async function handleCheckout() {
    try {
      setCheckingOut(true);
      const res = await fetch("/api/payments/midtrans/checkout", {
        method: "POST",
      });
      const json = (await res.json()) as {
        orderId?: string;
        snapToken?: string;
        redirectUrl?: string;
        error?: string;
      };

      if (!res.ok || !json.orderId || !json.redirectUrl) {
        showToast(json.error ?? "Gagal memulai pembayaran.", "error");
        return;
      }

      const createdOrderId = json.orderId;
      await mutate();

      if (json.snapToken && typeof window !== "undefined" && window.snap) {
        window.snap.pay(json.snapToken, {
          onSuccess: () => {
            void verifyOrder(createdOrderId);
          },
          onPending: () => {
            showToast(
              "Pembayaran menunggu diselesaikan. Klik 'Cek Status' setelah transfer/QRIS berhasil.",
              "info"
            );
          },
          onError: () => {
            showToast("Pembayaran gagal diproses.", "error");
          },
          onClose: () => {
            void verifyOrder(createdOrderId, true);
          },
        });
        return;
      }

      window.location.href = json.redirectUrl;
    } catch {
      showToast("Terjadi kesalahan saat membuat transaksi pembayaran.", "error");
    } finally {
      setCheckingOut(false);
    }
  }

  const snapScriptUrl = sub?.midtransIsProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  const latestPendingOrder = sub?.recentOrders.find(
    (o) => o.status === "pending"
  );

  return (
    <AppShell userEmail={userEmail}>
      {sub?.midtransClientKey && (
        <Script
          src={snapScriptUrl}
          data-client-key={sub.midtransClientKey}
          strategy="afterInteractive"
        />
      )}

      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-[#111827]">
                MT5 Sync
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                <Crown className="h-3.5 w-3.5" />
                PRO
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Hubungkan MetaTrader 5 / EA agar setiap posisi close tercatat
              otomatis ke jurnal PnL Anda.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Memeriksa status langganan Pro Anda...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-[#DC2626]">
            {error.message}
          </div>
        ) : sub?.isPro ? (
          <>
            {/* Active Pro Banner */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-xs">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#16A34A] text-white">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-950">
                      Paket MT5 Pro Aktif
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-800">
                      Berlaku hingga: <strong>{formatDateId(sub.proUntil)}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={checkingOut || !sub.paymentServerReady}
                  onClick={handleCheckout}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {checkingOut
                    ? "Memproses..."
                    : `Perpanjang +${sub.durationDays} Hari`}
                </button>
              </div>
            </div>

            {/* Full MT5 Integration Card */}
            <Mt5IntegrationCard />
          </>
        ) : (
          /* Paywall Card when user has not paid */
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    <Bot className="h-3 w-3" />
                    Akses Terkunci — Khusus Paket Pro
                  </span>
                  <h2 className="mt-1.5 font-heading text-xl font-bold text-[#111827]">
                    Aktifkan Auto-Sync MetaTrader 5
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Pencatatan manual di Dashboard, Jurnal, dan Kalender tetap
                    100% gratis selamanya. Upgrade ke <strong>MT5 Pro</strong>{" "}
                    untuk membuka sinkronisasi otomatis real-time langsung dari
                    EA &amp; akun MT5 Anda.
                  </p>
                </div>
              </div>

              <div className="shrink-0 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-left sm:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Akses {sub?.durationDays ?? 30} Hari
                </p>
                <p className="font-heading text-2xl font-bold tabular-nums text-[#1E3A8A]">
                  {formatRupiah(sub?.priceIdr ?? 30000)}
                </p>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {[
                "1-Klik Download EA (PnLDiarySync.mq5) otomatis terisi URL & API Key",
                "Catat otomatis trade EA maupun manual di MT5 saat posisi close",
                "Anti-duplikat deal & otomatis hitung PnL bersih (termasuk swap/komisi)",
                "Pembayaran aman via QRIS, Virtual Account Bank, dan e-Wallet (Midtrans)",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 rounded-xl bg-[#F3F4F6] p-3 text-xs text-[#111827]"
                >
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {sub?.schemaMissing && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                Admin note: Tabel <code>user_subscriptions</code> /{" "}
                <code>payment_orders</code> belum ada di Supabase. Jalankan{" "}
                <code>supabase/schema.sql</code> terbaru di SQL Editor Supabase.
              </div>
            )}

            {!sub?.paymentServerReady && !sub?.schemaMissing && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                Admin note: Gateway pembayaran Midtrans belum aktif sepenuhnya.
                Pastikan <code>MIDTRANS_SERVER_KEY</code>,{" "}
                <code>NEXT_PUBLIC_MIDTRANS_CLIENT_KEY</code>, dan{" "}
                <code>SUPABASE_SERVICE_ROLE_KEY</code> sudah ditambahkan di
                Environment Variables Vercel.
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500">
                Aktivasi otomatis seketika setelah pembayaran terkonfirmasi.
              </div>
              <button
                type="button"
                disabled={checkingOut}
                onClick={handleCheckout}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-900 disabled:opacity-60"
              >
                <CreditCard className="h-4 w-4" />
                {checkingOut
                  ? "Menyiapkan Pembayaran..."
                  : `Bayar & Aktifkan Pro (${formatRupiah(sub?.priceIdr ?? 30000)})`}
              </button>
            </div>

            {/* Pending Payment Verification Box */}
            {latestPendingOrder && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5 text-xs">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold text-[#111827]">
                      Menunggu Pembayaran ({latestPendingOrder.orderId})
                    </p>
                    <p className="text-slate-500">
                      Sudah menyelesaikan transfer / QRIS? Klik cek status untuk
                      membuka akses Pro.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {latestPendingOrder.snapRedirectUrl && (
                    <a
                      href={latestPendingOrder.snapRedirectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#111827] hover:bg-slate-100"
                    >
                      Lanjutkan Bayar
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={verifyingOrderId === latestPendingOrder.orderId}
                    onClick={() => void verifyOrder(latestPendingOrder.orderId)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {verifyingOrderId === latestPendingOrder.orderId
                      ? "Mengecek..."
                      : "Cek Status"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

