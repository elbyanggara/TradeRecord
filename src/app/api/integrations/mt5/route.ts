import { createClient as createAnonClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getTodayIsoDate } from "@/lib/format";
import { ingestLocalMt5Trade } from "@/lib/local-store";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import type { AccountType, JournalPayload, TradeDirection } from "@/types/journal";

interface Mt5WebhookBody {
  api_key?: string;
  deal_id?: string | number;
  account_number?: string | number;
  tanggal?: string;
  akun?: string;
  instrumen?: string;
  arah?: string;
  entry?: number | string | null;
  exit?: number | string | null;
  lot?: number | string | null;
  pnl_nominal?: number | string;
  pnl_persen?: number | string | null;
  catatan?: string | null;
}

function toOptionalNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

function extractToken(request: Request, body: Mt5WebhookBody): string {
  const auth = request.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const xKey = request.headers.get("x-api-key");
  if (xKey) return xKey.trim();
  if (typeof body.api_key === "string") return body.api_key.trim();
  return "";
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "PnL Diary MT5 Webhook",
  });
}

export async function POST(request: Request) {
  try {
    const rawText = (await request.text()).replace(/\0+$/, "").trim();
    if (!rawText) {
      return NextResponse.json(
        { error: "Body JSON tidak boleh kosong." },
        { status: 400 }
      );
    }

    const body = JSON.parse(rawText) as Mt5WebhookBody;
    const rawToken = extractToken(request, body);
    if (!rawToken) {
      return NextResponse.json(
        { error: "API Key tidak ditemukan (gunakan Authorization Bearer atau x-api-key)." },
        { status: 401 }
      );
    }

    const tanggal =
      typeof body.tanggal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.tanggal)
        ? body.tanggal
        : getTodayIsoDate();

    const akun: AccountType =
      String(body.akun ?? "Real").toLowerCase() === "demo" ? "Demo" : "Real";

    const instrumen = String(body.instrumen ?? "")
      .trim()
      .toUpperCase();
    if (!instrumen) {
      return NextResponse.json(
        { error: "Field instrumen wajib diisi." },
        { status: 400 }
      );
    }

    const rawArah = String(body.arah ?? "").trim().toLowerCase();
    if (rawArah !== "long" && rawArah !== "short") {
      return NextResponse.json(
        { error: "Field arah harus 'long' atau 'short'." },
        { status: 400 }
      );
    }
    const arah: TradeDirection = rawArah;

    const pnlNominal = Number(body.pnl_nominal);
    if (!Number.isFinite(pnlNominal)) {
      return NextResponse.json(
        { error: "Field pnl_nominal harus berupa angka." },
        { status: 400 }
      );
    }

    const dealPart =
      body.deal_id !== undefined && body.deal_id !== null
        ? String(body.deal_id).trim()
        : "";
    const accPart =
      body.account_number !== undefined && body.account_number !== null
        ? String(body.account_number).trim()
        : "";
    const externalId = dealPart
      ? `mt5:${accPart || "default"}:${dealPart}`
      : null;

    const payload: JournalPayload = {
      tanggal,
      akun,
      instrumen,
      arah,
      entry: toOptionalNum(body.entry),
      exit: toOptionalNum(body.exit),
      lot: toOptionalNum(body.lot),
      pnl_nominal: Math.round(pnlNominal * 100) / 100,
      pnl_persen: toOptionalNum(body.pnl_persen),
      catatan:
        typeof body.catatan === "string" && body.catatan.trim()
          ? body.catatan.trim()
          : externalId
          ? `MT5 AutoSync (#${dealPart})`
          : "MT5 AutoSync",
      external_id: externalId,
    };

    if (!isSupabaseConfigured()) {
      try {
        const result = await ingestLocalMt5Trade(rawToken, payload);
        return NextResponse.json(result, {
          status: result.status === "created" ? 201 : 200,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Token tidak valid.";
        const status = message === "Invalid API token" ? 401 : 400;
        return NextResponse.json({ error: message }, { status });
      }
    }

    const { url, anonKey } = getSupabaseEnv();
    const supabase = createAnonClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.rpc("ingest_mt5_trade", {
      p_raw_token: rawToken,
      p_external_id: payload.external_id ?? null,
      p_tanggal: payload.tanggal,
      p_akun: payload.akun,
      p_instrumen: payload.instrumen,
      p_arah: payload.arah,
      p_entry: payload.entry,
      p_exit: payload.exit,
      p_lot: payload.lot,
      p_pnl_nominal: payload.pnl_nominal,
      p_pnl_persen: payload.pnl_persen,
      p_catatan: payload.catatan,
    });

    if (error) {
      const msg = error.message || "Gagal memproses webhook MT5.";
      const status = msg.includes("Invalid API token") ? 401 : 400;
      return NextResponse.json({ error: msg }, { status });
    }

    const result = (data ?? { status: "created" }) as {
      status: string;
      id?: string;
    };
    return NextResponse.json(result, {
      status: result.status === "created" ? 201 : 200,
    });
  } catch {
    return NextResponse.json(
      { error: "Payload JSON tidak valid." },
      { status: 400 }
    );
  }
}

