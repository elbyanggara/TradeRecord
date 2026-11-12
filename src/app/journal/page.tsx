import { Suspense } from "react";
import type { Metadata } from "next";
import { JournalClient } from "@/components/journal/JournalClient";
import { ProtectedPageFallback } from "@/components/ProtectedPageFallback";
import { requireAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Jurnal PnL",
};

async function JournalServer() {
  const user = await requireAuthenticatedUser();
  return <JournalClient userId={user.id} userEmail={user.email} />;
}

export default function JournalPage() {
  return (
    <Suspense fallback={<ProtectedPageFallback />}>
      <JournalServer />
    </Suspense>
  );
}

