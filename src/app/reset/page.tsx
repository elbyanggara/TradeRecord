import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetClient } from "@/components/auth/ResetClient";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default function ResetPage() {
  const configured = isSupabaseConfigured();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] text-sm text-slate-500">
          Memuat halaman reset password...
        </div>
      }
    >
      <ResetClient supabaseConfigured={configured} />
    </Suspense>
  );
}

