import { DashboardSkeleton } from "@/components/UiStates";

export function ProtectedPageFallback() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <DashboardSkeleton />
      </div>
    </div>
  );
}

