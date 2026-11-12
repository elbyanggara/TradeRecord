import { Suspense } from "react";
import type { Metadata } from "next";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { ProtectedPageFallback } from "@/components/ProtectedPageFallback";
import { requireAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard",
};

async function DashboardServer() {
  const user = await requireAuthenticatedUser();
  return <DashboardClient userId={user.id} userEmail={user.email} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<ProtectedPageFallback />}>
      <DashboardServer />
    </Suspense>
  );
}

