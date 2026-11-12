import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterClient } from "@/components/auth/RegisterClient";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Daftar Akun",
};

export default function RegisterPage() {
  const configured = isSupabaseConfigured();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] text-sm text-slate-500">
          Memuat halaman pendaftaran...
        </div>
      }
    >
      <RegisterClient supabaseConfigured={configured} />
    </Suspense>
  );
}

