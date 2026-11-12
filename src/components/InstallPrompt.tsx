"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const emptySubscribe = () => () => {};

function getClientPlatformInfo() {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error Safari iOS standalone flag
    Boolean(window.navigator.standalone);
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    // @ts-expect-error Legacy MSStream check
    !window.MSStream;
  return `${isStandalone ? "1" : "0"}:${isIOS ? "1" : "0"}`;
}

export function InstallPrompt({ compact = false }: { compact?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const platformKey = useSyncExternalStore(
    emptySubscribe,
    getClientPlatformInfo,
    () => "0:0"
  );
  const isStandalone = platformKey.startsWith("1:");
  const isIOS = platformKey.endsWith(":1");

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  if (isStandalone) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Aplikasi <strong>PnL Diary</strong> sudah terpasang di perangkat ini.
      </div>
    );
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  return (
    <div
      className={`rounded-2xl border border-blue-200 bg-blue-50/70 ${
        compact ? "p-3.5" : "p-4"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1E3A8A] text-white">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111827]">
              Install PnL Diary ke Layar Utama
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {isIOS
                ? "Di Safari iOS, ketuk tombol Bagikan lalu pilih \"Add to Home Screen\"."
                : deferredPrompt
                ? "Pasang sebagai aplikasi ringan di HP atau desktop."
                : "Buka menu browser lalu pilih \"Install App\" atau \"Add to Home Screen\"."}
            </p>
          </div>
        </div>

        {deferredPrompt ? (
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900"
          >
            <Download className="h-4 w-4" />
            Install Aplikasi
          </button>
        ) : isIOS ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-[#1E3A8A] border border-blue-200">
            <Share className="h-3.5 w-3.5" />
            Safari → Add to Home Screen
          </span>
        ) : null}
      </div>
    </div>
  );
}
