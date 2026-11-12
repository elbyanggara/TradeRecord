"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Bot,
  Check,
  Copy,
  Download,
  KeyRound,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ToastProvider";

interface TokenStatusResponse {
  hasToken: boolean;
  tokenPrefix: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
}

async function fetchTokenStatus(url: string): Promise<TokenStatusResponse> {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as TokenStatusResponse & { error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? "Gagal memuat status integrasi MT5.");
  }
  return json;
}

export function Mt5IntegrationCard() {
  const { showToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR<
    TokenStatusResponse,
    Error
  >("/api/integrations/mt5/token", fetchTokenStatus);

  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copiedField, setCopiedField] = useState<"url" | "token" | null>(null);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/integrations/mt5`
      : "https://pnl-diary.vercel.app/api/integrations/mt5";

  async function handleCopy(text: string, field: "url" | "token") {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      showToast(
        field === "url" ? "Webhook URL disalin." : "API Key disalin.",
        "success"
      );
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      showToast("Gagal menyalin ke clipboard.", "error");
    }
  }

  async function handleGenerateToken() {
    try {
      setGenerating(true);
      const res = await fetch("/api/integrations/mt5/token", {
        method: "POST",
      });
      const json = (await res.json()) as {
        token?: string;
        error?: string;
      };
      if (!res.ok || !json.token) {
        showToast(json.error ?? "Gagal membuat API Key MT5.", "error");
        return;
      }
      setFreshToken(json.token);
      await mutate();
      showToast("API Key MT5 berhasil dibuat!", "success");
    } catch {
      showToast("Terjadi kesalahan saat membuat API Key.", "error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevokeToken() {
    try {
      setRevoking(true);
      const res = await fetch("/api/integrations/mt5/token", {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(json.error ?? "Gagal menonaktifkan API Key.", "error");
        return;
      }
      setFreshToken(null);
      setRevokeDialogOpen(false);
      await mutate();
      showToast("API Key MT5 dinonaktifkan.", "info");
    } catch {
      showToast("Gagal menonaktifkan API Key.", "error");
    } finally {
      setRevoking(false);
    }
  }

  const lastUsedText = data?.lastUsedAt
    ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(data.lastUsedAt))
    : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1E3A8A]">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-base font-bold text-[#111827]">
                Auto-Sync MetaTrader 5 (EA)
              </h2>
              {!isLoading && !error && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    data?.hasToken
                      ? "bg-emerald-50 text-[#16A34A]"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {data?.hasToken ? "Aktif" : "Belum Aktif"}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              Catat otomatis setiap posisi EA atau manual yang close di MT5
              langsung ke jurnal Anda via Webhook.
            </p>
          </div>
        </div>

        <a
          href="/downloads/PnLDiarySync.mq5"
          download="PnLDiarySync.mq5"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#1E3A8A] bg-blue-50/70 px-3.5 py-2 text-xs font-semibold text-[#1E3A8A] hover:bg-blue-100"
        >
          <Download className="h-4 w-4" />
          Download EA (.mq5)
        </a>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
          {error.message}
        </div>
      ) : (
        <>
          {/* Webhook URL */}
          <div className="rounded-xl bg-[#F3F4F6] p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Webhook URL (Masukkan ke Allow WebRequest MT5)
              </span>
              <button
                type="button"
                onClick={() => handleCopy(webhookUrl, "url")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A8A] hover:underline"
              >
                {copiedField === "url" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                    Disalin
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Salin URL
                  </>
                )}
              </button>
            </div>
            <code className="block break-all rounded-lg bg-white px-3 py-2 text-xs font-mono text-[#111827] border border-slate-200">
              {webhookUrl}
            </code>
          </div>

          {/* API Key Management */}
          <div className="space-y-3">
            {freshToken && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-900">
                    API Key Baru (Simpan sekarang, hanya tampil 1 kali)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(freshToken, "token")}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-[#16A34A] border border-emerald-200 hover:bg-emerald-100"
                  >
                    {copiedField === "token" ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Disalin
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Salin Key
                      </>
                    )}
                  </button>
                </div>
                <code className="block break-all rounded-lg bg-white px-3 py-2 text-xs font-mono text-[#111827] border border-emerald-200">
                  {freshToken}
                </code>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-600">
                {isLoading ? (
                  <span>Memeriksa status API Key...</span>
                ) : data?.hasToken ? (
                  <div className="space-y-0.5">
                    <p>
                      Key aktif:{" "}
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[#111827]">
                        {data.tokenPrefix}
                      </code>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {lastUsedText
                        ? `Terakhir sinkron: ${lastUsedText}`
                        : "Belum ada transaksi masuk dari MT5."}
                    </p>
                  </div>
                ) : (
                  <span>
                    Buat API Key pribadi untuk menghubungkan EA MT5 ke akun ini.
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={generating || isLoading}
                  onClick={handleGenerateToken}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E3A8A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
                >
                  {data?.hasToken ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      {generating ? "Membuat..." : "Buat Ulang Key"}
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-3.5 w-3.5" />
                      {generating ? "Membuat..." : "Buat API Key MT5"}
                    </>
                  )}
                </button>

                {data?.hasToken && (
                  <button
                    type="button"
                    onClick={() => setRevokeDialogOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-[#DC2626] hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Nonaktifkan
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Setup Guide */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-[#111827]">
              Cara Pasang di MT5 (1 Menit):
            </p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs text-slate-600">
              <li>
                Download file <strong>PnLDiarySync.mq5</strong> lalu salin ke
                folder{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5">
                  MQL5/Experts/
                </code>{" "}
                dan compile di MetaEditor (`F7`).
              </li>
              <li>
                Di MT5, buka{" "}
                <strong>Tools → Options → Expert Advisors</strong>, centang{" "}
                <em>Allow WebRequest for listed URL</em>, lalu tambahkan{" "}
                <strong>Webhook URL</strong> di atas.
              </li>
              <li>
                Pasang EA <strong>PnLDiarySync</strong> di 1 chart bebas
                (EA trading utama tetap berjalan di chart lain).
              </li>
              <li>
                Tempel <strong>API Key</strong> di input{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5">
                  InpApiKey
                </code>
                . Setiap transaksi close akan langsung masuk ke Jurnal &amp;
                Dashboard.
              </li>
            </ol>
          </div>
        </>
      )}

      <ConfirmDialog
        open={revokeDialogOpen}
        title="Nonaktifkan API Key MT5?"
        description="EA MT5 yang menggunakan key ini tidak akan bisa mengirim transaksi baru sampai Anda membuat API Key lagi."
        confirmLabel="Ya, Nonaktifkan"
        loading={revoking}
        onConfirm={handleRevokeToken}
        onCancel={() => setRevokeDialogOpen(false)}
      />
    </div>
  );
}

