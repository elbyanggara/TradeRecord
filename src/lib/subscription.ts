import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  LOCAL_SESSION_COOKIE,
  verifyLocalSession,
} from "@/lib/local-auth-token";
import {
  activateLocalProFromOrder,
  getLocalSubscription,
  listLocalPaymentOrders,
} from "@/lib/local-store";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const PRO_PLAN_DURATION_DAYS = 30;

export function getProPlanPriceIdr(): number {
  const parsed = Number(process.env.PRO_PLAN_PRICE_IDR ?? 99000);
  if (Number.isFinite(parsed) && parsed >= 1000) {
    return Math.round(parsed);
  }
  return 99000;
}

export interface ApiSessionContext {
  mode: "local" | "supabase";
  userId: string;
  email: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

export async function resolveApiSessionUser(): Promise<ApiSessionContext | null> {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    const token = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;
    const session = await verifyLocalSession(token);
    if (!session) return null;
    return {
      mode: "local",
      userId: session.userId,
      email: session.email,
      supabase: null,
    };
  }

  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return {
    mode: "supabase",
    userId: user.id,
    email: user.email ?? "trader@pnldiary.app",
    supabase,
  };
}

export function createSupabaseAdminClient() {
  if (!isSupabaseConfigured()) return null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) return null;
  const { url } = getSupabaseEnv();
  return createSupabaseAdmin(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface SubscriptionSummary {
  isPro: boolean;
  plan: "free" | "pro";
  status: "inactive" | "active" | "expired";
  proUntil: string | null;
  priceIdr: number;
  durationDays: number;
  midtransConfigured: boolean;
  midtransClientKey: string | null;
  midtransIsProduction: boolean;
  paymentServerReady: boolean;
  schemaMissing?: boolean;
  recentOrders: Array<{
    orderId: string;
    amountIdr: number;
    status: "pending" | "paid" | "failed" | "expired";
    snapRedirectUrl: string | null;
    createdAt: string;
    paidAt: string | null;
  }>;
}

function isProTimestampActive(
  plan: string | null | undefined,
  status: string | null | undefined,
  proUntil: string | null | undefined
): boolean {
  if (plan !== "pro" || status !== "active") return false;
  if (!proUntil) return true;
  return new Date(proUntil).getTime() > Date.now();
}

export async function getUserSubscriptionSummary(
  ctx: ApiSessionContext
): Promise<SubscriptionSummary> {
  const priceIdr = getProPlanPriceIdr();
  const midtransServerConfigured = Boolean(
    process.env.MIDTRANS_SERVER_KEY?.trim()
  );
  const midtransClientKey =
    process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim() || null;
  const midtransIsProduction =
    process.env.MIDTRANS_IS_PRODUCTION === "true";

  if (ctx.mode === "local") {
    const [sub, orders] = await Promise.all([
      getLocalSubscription(ctx.userId),
      listLocalPaymentOrders(ctx.userId),
    ]);
    const isPro = isProTimestampActive(sub?.plan, sub?.status, sub?.proUntil);
    return {
      isPro,
      plan: isPro ? "pro" : "free",
      status: isPro ? "active" : sub?.status ?? "inactive",
      proUntil: sub?.proUntil ?? null,
      priceIdr,
      durationDays: PRO_PLAN_DURATION_DAYS,
      midtransConfigured: midtransServerConfigured,
      midtransClientKey,
      midtransIsProduction,
      paymentServerReady: midtransServerConfigured,
      recentOrders: orders.slice(0, 5).map((o) => ({
        orderId: o.orderId,
        amountIdr: o.amountIdr,
        status: o.status,
        snapRedirectUrl: o.snapRedirectUrl,
        createdAt: o.createdAt,
        paidAt: o.paidAt,
      })),
    };
  }

  const supabase = ctx.supabase!;
  const [{ data: subRow, error: subErr }, { data: orderRows }] =
    await Promise.all([
      supabase
        .from("user_subscriptions")
        .select("plan, status, pro_until")
        .eq("user_id", ctx.userId)
        .maybeSingle(),
      supabase
        .from("payment_orders")
        .select("order_id, amount_idr, status, snap_redirect_url, created_at, paid_at")
        .eq("user_id", ctx.userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const schemaMissing = Boolean(
    subErr &&
      (subErr.message.includes("user_subscriptions") ||
        subErr.code === "42P01" ||
        subErr.code === "PGRST205")
  );

  const isPro = isProTimestampActive(
    subRow?.plan,
    subRow?.status,
    subRow?.pro_until
  );
  const effectiveStatus = isPro
    ? "active"
    : subRow?.plan === "pro" && subRow?.status === "active"
      ? "expired"
      : (subRow?.status as "inactive" | "active" | "expired" | undefined) ??
        "inactive";

  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  return {
    isPro,
    plan: isPro ? "pro" : "free",
    status: effectiveStatus,
    proUntil: subRow?.pro_until ?? null,
    priceIdr,
    durationDays: PRO_PLAN_DURATION_DAYS,
    midtransConfigured: midtransServerConfigured,
    midtransClientKey,
    midtransIsProduction,
    paymentServerReady: midtransServerConfigured && hasServiceRole,
    schemaMissing,
    recentOrders: (orderRows ?? []).map((row) => ({
      orderId: row.order_id,
      amountIdr: row.amount_idr,
      status: row.status as "pending" | "paid" | "failed" | "expired",
      snapRedirectUrl: row.snap_redirect_url,
      createdAt: row.created_at,
      paidAt: row.paid_at,
    })),
  };
}

export async function activatePaidOrderInSupabase(orderId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY belum diatur di Vercel.",
    };
  }

  const { data: order, error: orderErr } = await admin
    .from("payment_orders")
    .select("order_id, user_id, status")
    .eq("order_id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return { ok: false, error: "Order pembayaran tidak ditemukan." };
  }

  // Idempotent: do not extend subscription twice for the same paid order.
  if (order.status === "paid") {
    return { ok: true };
  }

  const now = new Date();
  const { error: updateOrderErr } = await admin
    .from("payment_orders")
    .update({ status: "paid", paid_at: now.toISOString() })
    .eq("order_id", orderId)
    .neq("status", "paid");

  if (updateOrderErr) {
    return { ok: false, error: updateOrderErr.message };
  }

  const { data: currentSub } = await admin
    .from("user_subscriptions")
    .select("pro_until")
    .eq("user_id", order.user_id)
    .maybeSingle();

  const existingUntilMs = currentSub?.pro_until
    ? new Date(currentSub.pro_until).getTime()
    : 0;
  const baseMs = existingUntilMs > now.getTime() ? existingUntilMs : now.getTime();
  const nextProUntil = new Date(
    baseMs + PRO_PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error: subUpsertErr } = await admin.from("user_subscriptions").upsert(
    {
      user_id: order.user_id,
      plan: "pro",
      status: "active",
      pro_until: nextProUntil,
      last_order_id: orderId,
      updated_at: now.toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (subUpsertErr) {
    return { ok: false, error: subUpsertErr.message };
  }

  return { ok: true };
}

export async function markPaidOrder(orderId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    const sub = await activateLocalProFromOrder(
      orderId,
      PRO_PLAN_DURATION_DAYS
    );
    if (!sub) return { ok: false, error: "Order pembayaran tidak ditemukan." };
    return { ok: true };
  }
  return activatePaidOrderInSupabase(orderId);
}

