import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarClient } from "@/components/calendar/CalendarClient";
import { ProtectedPageFallback } from "@/components/ProtectedPageFallback";
import { requireAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Kalender PnL",
};

async function CalendarServer() {
  const user = await requireAuthenticatedUser();
  return <CalendarClient userId={user.id} userEmail={user.email} />;
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<ProtectedPageFallback />}>
      <CalendarServer />
    </Suspense>
  );
}

