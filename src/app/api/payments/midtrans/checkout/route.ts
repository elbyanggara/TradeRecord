import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createLocalPaymentOrder } from "@/lib/local-store";
import { createMidtransSnapTransaction } from "@/lib/midtrans";
import {
  createSupabaseAdminClient,
  getProPlanPriceIdr,
  PRO_PLAN_DURATION_DAYS,
  resolveApiSessionUser,
} from "@/lib/subscription";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function resolveAppOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  if (host) {
    const proto =
      request.headers.get("x-forwarded-proto") ||
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const ctx = await resolveApiSessionUser();
  if (!ctx) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  if (!process.env.MIDTRANS_SERVER_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "Pembayaran Midtrans belum diaktifkan admin (MIDTRANS_SERVER_KEY belum diatur di Vercel).",
      },
      { status: 503 }
    );
  }

  if (isSupabaseConfigured()) {
    const admin = createSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json(
        {
          error:
            "Konfigurasi backend pembayaran belum lengkap (SUPABASE_SERVICE_ROLE_KEY belum diatur di Vercel).",
        },
        { status: 503 }
      );
    }
  }

  try {
    const amountIdr = getProPlanPriceIdr();
    const shortId = ctx.userId.replace(/-/g, "").slice(0, 8);
    const suffix = crypto.randomBytes(3).toString("hex");
    const orderId = `PNLD-PRO-${shortId}-${Date.now()}-${suffix}`;
    const origin = resolveAppOrigin(request);
    const finishRedirectUrl = `${origin}/mt5?payment=finish&order_id=${encodeURIComponent(orderId)}`;

    const snap = await createMidtransSnapTransaction({
      orderId,
      amountIdr,
      customerEmail: ctx.email,
      finishRedirectUrl,
      itemName: `PnL Diary MT5 Pro (${PRO_PLAN_DURATION_DAYS} Hari)`,
    });

    if (ctx.mode === "local") {
      await createLocalPaymentOrder({
        orderId,
        userId: ctx.userId,
        plan: "pro",
        amountIdr,
        status: "pending",
        snapToken: snap.token,
        snapRedirectUrl: snap.redirectUrl,
        paidAt: null,
        createdAt: new Date().toISOString(),
      });
    } else {
      const admin = createSupabaseAdminClient()!;
      const { error: insertError } = await admin.from("payment_orders").insert({
        order_id: orderId,
        user_id: ctx.userId,
        plan: "pro",
        amount_idr: amountIdr,
        status: "pending",
        snap_token: snap.token,
        snap_redirect_url: snap.redirectUrl,
      });

      if (insertError) {
        return NextResponse.json(
          {
            error:
              "Gagal menyimpan order pembayaran. Pastikan SQL terbaru (tabel payment_orders & user_subscriptions) sudah dijalankan di Supabase.",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      orderId,
      snapToken: snap.token,
      redirectUrl: snap.redirectUrl,
      amountIdr,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Gagal membuat transaksi pembayaran Midtrans.",
      },
      { status: 400 }
    );
  }
}

