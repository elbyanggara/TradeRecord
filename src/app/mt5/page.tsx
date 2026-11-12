import { Suspense } from "react";
import type { Metadata } from "next";
import { Mt5PageClient } from "@/components/mt5/Mt5PageClient";
import { ProtectedPageFallback } from "@/components/ProtectedPageFallback";
import { requireAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "MT5 Sync (Pro)",
};

async function Mt5Server({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; order_id?: string }>;
}) {
  const [user, params] = await Promise.all([
    requireAuthenticatedUser(),
    searchParams,
  ]);

  return (
    <Mt5PageClient
      userEmail={user.email}
      initialOrderId={params.order_id ?? null}
    />
  );
}

export default function Mt5Page({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; order_id?: string }>;
}) {
  return (
    <Suspense fallback={<ProtectedPageFallback />}>
      <Mt5Server searchParams={searchParams} />
    </Suspense>
  );
}

