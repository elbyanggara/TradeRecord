import crypto from "node:crypto";

function getMidtransServerKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!key) {
    throw new Error(
      "MIDTRANS_SERVER_KEY belum dikonfigurasi di environment server."
    );
  }
  return key;
}

export function isMidtransProduction(): boolean {
  return process.env.MIDTRANS_IS_PRODUCTION === "true";
}

function getSnapBaseUrl(): string {
  return isMidtransProduction()
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
}

function getApiBaseUrl(): string {
  return isMidtransProduction()
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

function getBasicAuthHeader(): string {
  const serverKey = getMidtransServerKey();
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

export interface CreateSnapParams {
  orderId: string;
  amountIdr: number;
  customerEmail: string;
  finishRedirectUrl: string;
  itemName: string;
}

export interface CreateSnapResult {
  token: string;
  redirectUrl: string;
}

export async function createMidtransSnapTransaction(
  params: CreateSnapParams
): Promise<CreateSnapResult> {
  const res = await fetch(`${getSnapBaseUrl()}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: getBasicAuthHeader(),
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.amountIdr,
      },
      item_details: [
        {
          id: "pnl-diary-mt5-pro-30d",
          price: params.amountIdr,
          quantity: 1,
          name: params.itemName,
        },
      ],
      customer_details: {
        email: params.customerEmail,
      },
      callbacks: {
        finish: params.finishRedirectUrl,
      },
    }),
  });

  const data = (await res.json()) as {
    token?: string;
    redirect_url?: string;
    error_messages?: string[];
  };

  if (!res.ok || !data.token || !data.redirect_url) {
    throw new Error(
      data.error_messages?.join(", ") ||
        "Gagal membuat sesi pembayaran Midtrans."
    );
  }

  return {
    token: data.token,
    redirectUrl: data.redirect_url,
  };
}

export interface MidtransTransactionStatus {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  transaction_status?: string;
  fraud_status?: string;
  signature_key?: string;
}

export async function fetchMidtransTransactionStatus(
  orderId: string
): Promise<MidtransTransactionStatus> {
  const res = await fetch(
    `${getApiBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: getBasicAuthHeader(),
      },
      cache: "no-store",
    }
  );

  const data = (await res.json()) as MidtransTransactionStatus & {
    status_message?: string;
  };
  if (!res.ok && res.status === 404) {
    throw new Error("Transaksi Midtrans belum ditemukan atau belum dibayar.");
  }
  return data;
}

export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey || !params.signatureKey) return false;

  const expected = crypto
    .createHash("sha512")
    .update(
      `${params.orderId}${params.statusCode}${params.grossAmount}${serverKey}`
    )
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(params.signatureKey, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function isMidtransSuccessStatus(
  transactionStatus?: string,
  fraudStatus?: string
): boolean {
  if (transactionStatus === "settlement") return true;
  if (transactionStatus === "capture") {
    return !fraudStatus || fraudStatus === "accept";
  }
  return false;
}

export function isMidtransFailedStatus(
  transactionStatus?: string
): "failed" | "expired" | null {
  if (transactionStatus === "expire") return "expired";
  if (
    transactionStatus === "deny" ||
    transactionStatus === "cancel" ||
    transactionStatus === "failure"
  ) {
    return "failed";
  }
  return null;
}

