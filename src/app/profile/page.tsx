import { Suspense } from "react";
import type { Metadata } from "next";
import { ProfileClient } from "@/components/profile/ProfileClient";
import { ProtectedPageFallback } from "@/components/ProtectedPageFallback";
import { requireAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Profil",
};

async function ProfileServer() {
  const user = await requireAuthenticatedUser();
  return (
    <ProfileClient
      userId={user.id}
      userEmail={user.email}
      createdAt={user.createdAt}
    />
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProtectedPageFallback />}>
      <ProfileServer />
    </Suspense>
  );
}
