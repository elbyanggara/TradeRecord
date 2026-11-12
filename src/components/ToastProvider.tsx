"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev.slice(-2), { id, type, message }]);
      setTimeout(() => {
        dismiss(id);
      }, 3600);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-20 right-4 left-4 z-50 flex flex-col gap-2 pointer-events-none md:bottom-6 md:left-auto md:w-96"
      >
        {toasts.map((toast) => {
          const styles =
            toast.type === "success"
              ? "border-emerald-200 bg-white text-[#111827]"
              : toast.type === "error"
              ? "border-red-200 bg-white text-[#111827]"
              : "border-blue-200 bg-white text-[#111827]";

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lg ${styles}`}
            >
              {toast.type === "success" && (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#16A34A]" />
              )}
              {toast.type === "error" && (
                <AlertCircle className="h-5 w-5 shrink-0 text-[#DC2626]" />
              )}
              {toast.type === "info" && (
                <Info className="h-5 w-5 shrink-0 text-[#1E3A8A]" />
              )}
              <p className="flex-1 text-sm font-medium leading-snug">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Tutup notifikasi"
                className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

