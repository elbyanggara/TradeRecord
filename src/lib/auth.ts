import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  LOCAL_SESSION_COOKIE,
  verifyLocalSession,
} from "@/lib/local-auth-token";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export interface AuthenticatedUser {
  id: string;
  email: string;
  createdAt?: string;
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    const token = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;
    const session = await verifyLocalSession(token);
    if (!session) {
      redirect("/login");
    }
    return {
      id: session.userId,
      email: session.email,
      createdAt: session.createdAt,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return {
    id: user.id,
    email: user.email ?? "trader@pnldiary.app",
    createdAt: user.created_at,
  };
}
