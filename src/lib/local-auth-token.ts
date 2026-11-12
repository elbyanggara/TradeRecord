export const LOCAL_SESSION_COOKIE = "pnl_local_session";

export interface LocalSessionPayload {
  userId: string;
  email: string;
  createdAt: string;
  exp: number;
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  return (
    process.env.LOCAL_AUTH_SECRET ||
    "pnl-diary-local-dev-session-signing-key-v1"
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (padded.length % 4)) % 4;
    const binary = atob(padded + "=".repeat(padLen));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signLocalSession(input: {
  userId: string;
  email: string;
  createdAt: string;
}): Promise<string> {
  const payload: LocalSessionPayload = {
    ...input,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getHmacKey();
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encoded)
  );
  const sig = toBase64Url(new Uint8Array(sigBuffer));
  return `${encoded}.${sig}`;
}

export async function verifyLocalSession(
  token: string | undefined
): Promise<LocalSessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const sigBytes = fromBase64Url(sig);
  if (!sigBytes) return null;

  try {
    const key = await getHmacKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer as ArrayBuffer,
      new TextEncoder().encode(encoded)
    );
    if (!valid) return null;

    const payloadBytes = fromBase64Url(encoded);
    if (!payloadBytes) return null;
    const parsed = JSON.parse(
      new TextDecoder().decode(payloadBytes)
    ) as LocalSessionPayload;

    if (!parsed.userId || !parsed.email || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

