import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { SupabaseSetupBanner } from "@/components/UiStates";

interface AuthCardLayoutProps {
  title: string;
  subtitle: string;
  showSetupBanner?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCardLayout({
  title,
  subtitle,
  showSetupBanner = false,
  children,
  footer,
}: AuthCardLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col justify-center bg-[#F3F4F6] px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <BrandLogo href="/" size="lg" />
          <p className="mt-2 text-xs font-medium text-slate-500">
            Catat PnL harianmu, di mana saja.
          </p>
        </div>

        {showSetupBanner && <SupabaseSetupBanner />}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h1 className="font-heading text-2xl font-bold text-[#111827]">
              {title}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>

          {children}
        </div>

        {footer && (
          <div className="text-center text-sm text-slate-600">{footer}</div>
        )}
      </div>
    </div>
  );
}

