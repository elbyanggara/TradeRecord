import { NextResponse } from "next/server";
import {
  getLocalPaymentOrder,
  updateLocalPaymentOrderStatus,
} from "@/lib/local-store";
import {
  fetchMidtransTransactionStatus,
  isMidtransFailedStatus,
  isMidtransSuccessStatus,
} from "@/lib/midtrans";
import {
  createSupabaseAdminClient,
  markPaidOrder,
  resolveApiSessionUser,
} from "@/lib/subscription";

export async function POST(request: Request) {
  const ctx = await resolveApiSessionUser();
  if (!ctx) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  if (!process.env.MIDTRANS_SERVER_KEY?.trim()) {
    return NextResponse.json(
      { error: "MIDTRANS_SERVER_KEY belum dikonfigurasi." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as { orderId?: string };
    const orderId = String(body.orderId ?? "").trim();
    if (!orderId) {
      return NextResponse.json(
        { error: "orderId wajib diisi." },
        { status: 400 }
      );
    }

    let expectedAmount = 0;

    if (ctx.mode === "local") {
      const order = await getLocalPaymentOrder(orderId);
      if (!order || order.userId !== ctx.userId) {
        return NextResponse.json(
          { error: "Order tidak ditemukan." },
          { status: 404 }
        );
      }
      if (order.status === "paid") {
        return NextResponse.json({ status: "paid", isPro: true });
      }
      expectedAmount = order.amountIdr;
    } else {
      const admin = createSupabaseAdminClient();
      if (!admin) {
        return NextResponse.json(
          { error: "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi." },
          { status: 503 }
        );
      }

      const { data: order, error: orderErr } = await admin
        .from("payment_orders")
        .select("order_id, user_id, amount_idr, status")
        .eq("order_id", orderId)
        .eq("user_id", ctx.userId)
        .maybeSingle();

      if (orderErr || !order) {
        return NextResponse.json(
          { error: "Order tidak ditemukan." },
          { status: 404 }
        );
      }

      if (order.status === "paid") {
        return NextResponse.json({ status: "paid", isPro: true });
      }
      expectedAmount = order.amount_idr;
    }

    const mtStatus = await fetchMidtransTransactionStatus(orderId);
    const paidAmount = Math.round(Number(mtStatus.gross_amount ?? 0));

    if (
      isMidtransSuccessStatus(mtStatus.transaction_status, mtStatus.fraud_status)
    ) {
      if (paidAmount !== expectedAmount) {
        return NextResponse.json(
          { error: "Nominal pembayaran tidak sesuai." },
          { status: 400 }
        );
      }
      const activated = await markPaidOrder(orderId);
      if (!activated.ok) {
        return NextResponse.json(
          { error: activated.error ?? "Gagal mengaktifkan paket Pro." },
          { status: 500 }
        );
      }
      return NextResponse.json({ status: "paid", isPro: true });
    }

    const failedStatus = isMidtransFailedStatus(mtStatus.transaction_status);
    if (failedStatus) {
      if (ctx.mode === "local") {
        await updateLocalPaymentOrderStatus(orderId, failedStatus);
      } else {
        const admin = createSupabaseAdminClient();
        await admin
          ?.from("payment_orders")
          .update({ status: failedStatus })
          .eq("order_id", orderId);
      }
      return NextResponse.json({ status: failedStatus, isPro: false });
    }

    return NextResponse.json({
      status: mtStatus.transaction_status ?? "pending",
      isPro: false,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Gagal memverifikasi status pembayaran.",
      },
      { status: 400 }
    );
  }
}

