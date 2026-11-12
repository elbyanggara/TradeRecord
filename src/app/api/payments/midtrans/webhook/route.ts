import { NextResponse } from "next/server";
import {
  getLocalPaymentOrder,
  updateLocalPaymentOrderStatus,
} from "@/lib/local-store";
import {
  isMidtransFailedStatus,
  isMidtransSuccessStatus,
  verifyMidtransSignature,
} from "@/lib/midtrans";
import {
  createSupabaseAdminClient,
  markPaidOrder,
} from "@/lib/subscription";
import { isSupabaseConfigured } from "@/lib/supabase/env";

interface MidtransWebhookPayload {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MidtransWebhookPayload;
    const orderId = String(body.order_id ?? "").trim();
    const statusCode = String(body.status_code ?? "").trim();
    const grossAmount = String(body.gross_amount ?? "").trim();
    const signatureKey = String(body.signature_key ?? "").trim();

    if (!orderId || !statusCode || !grossAmount || !signatureKey) {
      return NextResponse.json(
        { error: "Payload webhook Midtrans tidak lengkap." },
        { status: 400 }
      );
    }

    const validSignature = verifyMidtransSignature({
      orderId,
      statusCode,
      grossAmount,
      signatureKey,
    });
    if (!validSignature) {
      return NextResponse.json(
        { error: "Invalid Midtrans signature." },
        { status: 403 }
      );
    }

    let expectedAmount = 0;

    if (!isSupabaseConfigured()) {
      const order = await getLocalPaymentOrder(orderId);
      if (!order) {
        return NextResponse.json({ ok: true, ignored: "Order not found" });
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

      const { data: order } = await admin
        .from("payment_orders")
        .select("order_id, amount_idr")
        .eq("order_id", orderId)
        .maybeSingle();

      if (!order) {
        return NextResponse.json({ ok: true, ignored: "Order not found" });
      }
      expectedAmount = order.amount_idr;
    }

    if (Math.round(Number(grossAmount)) !== expectedAmount) {
      return NextResponse.json(
        { error: "Gross amount mismatch." },
        { status: 400 }
      );
    }

    if (isMidtransSuccessStatus(body.transaction_status, body.fraud_status)) {
      const activated = await markPaidOrder(orderId);
      if (!activated.ok) {
        return NextResponse.json(
          { error: activated.error ?? "Failed to activate subscription." },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true, status: "paid" });
    }

    const failedStatus = isMidtransFailedStatus(body.transaction_status);
    if (failedStatus) {
      if (!isSupabaseConfigured()) {
        await updateLocalPaymentOrderStatus(orderId, failedStatus);
      } else {
        const admin = createSupabaseAdminClient();
        await admin
          ?.from("payment_orders")
          .update({ status: failedStatus })
          .eq("order_id", orderId)
          .neq("status", "paid");
      }
      return NextResponse.json({ ok: true, status: failedStatus });
    }

    return NextResponse.json({
      ok: true,
      status: body.transaction_status ?? "pending",
    });
  } catch {
    return NextResponse.json(
      { error: "Payload JSON webhook tidak valid." },
      { status: 400 }
    );
  }
}

