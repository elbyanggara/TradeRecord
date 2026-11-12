"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Bot,
  Check,
  Copy,
  Download,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ToastProvider";
import { buildMt5EaSource } from "@/lib/mt5-ea-template";

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

function triggerEaDownload(source: string) {
  const blob = new Blob([source], { type: "text/plain;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = "PnLDiarySync.mq5";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
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
  const [copiedField, setCopiedField] = useState<"origin" | "token" | null>(
    null
  );

  const appOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://pnl-diary.vercel.app";
  const webhookUrl = `${appOrigin}/api/integrations/mt5`;

  function downloadPersonalizedEa(apiKey?: string) {
    const source = buildMt5EaSource({
      webhookUrl,
      appOrigin,
      apiKey,
    });
    triggerEaDownload(source);
  }

  async function handleCopy(text: string, field: "origin" | "token") {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      showToast(
        field === "origin" ? "URL domain disalin." : "API Key disalin.",
        "success"
      );
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      showToast("Gagal menyalin ke clipboard.", "error");
    }
  }

  async function handleGenerateAndDownload() {
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
      downloadPersonalizedEa(json.token);
      await mutate();
      showToast(
        "API Key dibuat & PnLDiarySync.mq5 siap pakai berhasil diunduh!",
        "success"
      );
    } catch {
      showToast("Terjadi kesalahan saat menyiapkan EA MT5.", "error");
    } finally {
      setGenerating(false);
    }
  }

  function handleDownloadCurrentEa() {
    if (!freshToken) return;
    downloadPersonalizedEa(freshToken);
    showToast("PnLDiarySync.mq5 dengan API Key Anda diunduh.", "success");
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
              Download 1 file EA yang sudah otomatis terisi URL &amp; API Key
              akun Anda — tanpa perlu copy-paste key manual ke kode EA.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
          {error.message}
        </div>
      ) : (
        <>
          {/* Primary 1-Click Action Box */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-700 space-y-0.5">
                {isLoading ? (
                  <span>Memeriksa status integrasi MT5...</span>
                ) : freshToken ? (
                  <>
                    <p className="font-semibold text-emerald-800">
                      File EA siap pakai sudah membawa URL &amp; API Key Anda.
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Jika file terhapus, klik tombol Download EA lagi (key tidak
                      berubah).
                    </p>
                  </>
                ) : data?.hasToken ? (
                  <>
                    <p>
                      Key aktif:{" "}
                      <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[#111827] border border-slate-200">
                        {data.tokenPrefix}
                      </code>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {lastUsedText
                        ? `Terakhir sinkron: ${lastUsedText}`
                        : "Belum ada transaksi masuk dari MT5."}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-[#111827]">
                      1-Klik Siapkan EA MT5 Anda
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Otomatis membuat API Key pribadi dan mengunduh{" "}
                      <strong>PnLDiarySync.mq5</strong> yang sudah terisi penuh.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {freshToken ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDownloadCurrentEa}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-900"
                    >
                      <Download className="h-4 w-4" />
                      Download EA (.mq5)
                    </button>
                    <button
                      type="button"
                      disabled={generating}
                      onClick={handleGenerateAndDownload}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {generating ? "Membuat..." : "Ganti Key & EA"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={generating || isLoading}
                    onClick={handleGenerateAndDownload}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    {generating
                      ? "Menyiapkan EA..."
                      : data?.hasToken
                        ? "Buat Key Baru & Download EA (.mq5)"
                        : "Buat Key & Download EA (.mq5)"}
                  </button>
                )}

                {data?.hasToken && (
                  <button
                    type="button"
                    onClick={() => setRevokeDialogOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-semibold text-[#DC2626] hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Nonaktifkan
                  </button>
                )}
              </div>
            </div>

            {data?.hasToken && !freshToken && (
              <p className="text-[11px] text-slate-500">
                Demi keamanan, API Key lama tidak disimpan terbuka di server.
                Klik <strong>Buat Key Baru &amp; Download EA</strong> untuk
                mengunduh file EA baru yang terisi otomatis, atau{" "}
                <button
                  type="button"
                  onClick={() => downloadPersonalizedEa()}
                  className="font-semibold text-[#1E3A8A] hover:underline"
                >
                  download template EA (isi key manual)
                </button>
                .
              </p>
            )}
          </div>

          {freshToken && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-900">
                  API Key Cadangan (sudah otomatis masuk ke file .mq5 Anda)
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

          {/* Domain Allowlist URL for MT5 */}
          <div className="rounded-xl bg-[#F3F4F6] p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                URL untuk Allow WebRequest di MT5
              </span>
              <button
                type="button"
                onClick={() => handleCopy(appOrigin, "origin")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A8A] hover:underline"
              >
                {copiedField === "origin" ? (
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
              {appOrigin}
            </code>
          </div>

          {/* Setup Guide */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-[#111827]">
              Cara Pasang di MT5 (3 Langkah Simpel):
            </p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs text-slate-600">
              <li>
                Klik tombol <strong>Buat Key &amp; Download EA (.mq5)</strong>{" "}
                di atas — URL &amp; API Key Anda sudah langsung terisi di
                dalamnya.
              </li>
              <li>
                Di MT5, buka{" "}
                <strong>File → Open Data Folder → MQL5 → Experts</strong>,
                masukkan file <strong>PnLDiarySync.mq5</strong>, lalu double-klik
                &amp; tekan <strong>F7 (Compile)</strong> di MetaEditor.
              </li>
              <li>
                Di MT5, buka{" "}
                <strong>Tools → Options → Expert Advisors</strong>, centang{" "}
                <em>Allow WebRequest for listed URL</em>, tempel{" "}
                <strong>URL</strong> di atas, lalu pasang{" "}
                <strong>PnLDiarySync</strong> di 1 chart bebas. Selesai!
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
