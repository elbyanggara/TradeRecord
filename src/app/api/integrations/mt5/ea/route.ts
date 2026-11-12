import { NextResponse } from "next/server";
import { buildMt5EaSource } from "@/lib/mt5-ea-template";

function resolveRequestOrigin(request: Request): string {
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

export async function GET(request: Request) {
  const appOrigin = resolveRequestOrigin(request);
  const webhookUrl = `${appOrigin}/api/integrations/mt5`;
  const source = buildMt5EaSource({ webhookUrl, appOrigin });

  return new NextResponse(source, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="PnLDiarySync.mq5"',
      "Cache-Control": "no-store",
    },
  });
}

