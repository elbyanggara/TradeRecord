import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginClient } from "@/components/auth/LoginClient";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Masuk",
};

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] text-sm text-slate-500">
          Memuat halaman masuk...
        </div>
      }
    >
      <LoginClient supabaseConfigured={configured} />
    </Suspense>
  );
}

