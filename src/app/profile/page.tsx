import { Suspense } from "react";
import type { Metadata } from "next";
import { ProfileClient } from "@/components/profile/ProfileClient";
import { ProtectedPageFallback } from "@/components/ProtectedPageFallback";
import { requireAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Profil",
};

async function ProfileServer({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const [user, resolvedSearchParams] = await Promise.all([
    requireAuthenticatedUser(),
    searchParams,
  ]);
  return (
    <ProfileClient
      userId={user.id}
      userEmail={user.email}
      createdAt={user.createdAt}
      initialSetupMt5={resolvedSearchParams.setup === "mt5"}
    />
  );
}

export default function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  return (
    <Suspense fallback={<ProtectedPageFallback />}>
      <ProfileServer searchParams={searchParams} />
    </Suspense>
  );
}

