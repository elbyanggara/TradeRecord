import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { JournalEntry, JournalPayload } from "@/types/journal";

export interface LocalUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface LocalIntegrationToken {
  userId: string;
  tokenHash: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface LocalSubscriptionRecord {
  userId: string;
  plan: "free" | "pro";
  status: "inactive" | "active" | "expired";
  proUntil: string | null;
  lastOrderId: string | null;
  updatedAt: string;
}

export interface LocalPaymentOrderRecord {
  orderId: string;
  userId: string;
  plan: "pro";
  amountIdr: number;
  status: "pending" | "paid" | "failed" | "expired";
  snapToken: string | null;
  snapRedirectUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface LocalStoreData {
  users: LocalUserRecord[];
  journals: JournalEntry[];
  tokens: LocalIntegrationToken[];
  subscriptions: LocalSubscriptionRecord[];
  paymentOrders: LocalPaymentOrderRecord[];
}

const STORE_DIR = path.join(process.cwd(), ".local-data");
const STORE_PATH = path.join(STORE_DIR, "store.json");

let writeQueue: Promise<unknown> = Promise.resolve();

async function readStore(): Promise<LocalStoreData> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalStoreData>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      journals: Array.isArray(parsed.journals) ? parsed.journals : [],
      tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
      subscriptions: Array.isArray(parsed.subscriptions)
        ? parsed.subscriptions
        : [],
      paymentOrders: Array.isArray(parsed.paymentOrders)
        ? parsed.paymentOrders
        : [],
    };
  } catch {
    return {
      users: [],
      journals: [],
      tokens: [],
      subscriptions: [],
      paymentOrders: [],
    };
  }
}

async function writeStore(data: LocalStoreData): Promise<void> {
  if (process.env.VERCEL === "1") {
    throw new Error(
      "Di Vercel, wajib mengisi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di Environment Variables."
    );
  }
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(fn, fn);
  writeQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hexHash] = storedHash.split(":");
  if (!salt || !hexHash) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hexHash, "hex");
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function hashApiToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken.trim(), "utf8").digest("hex");
}

export async function registerLocalUser(
  email: string,
  password: string
): Promise<LocalUserRecord> {
  const normalized = email.trim().toLowerCase();
  return withStoreLock(async () => {
    const store = await readStore();
    const exists = store.users.some(
      (u) => u.email.toLowerCase() === normalized
    );
    if (exists) {
      throw new Error("Email sudah terdaftar. Silakan masuk.");
    }

    const user: LocalUserRecord = {
      id: crypto.randomUUID(),
      email: normalized,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    store.users.push(user);
    await writeStore(store);
    return user;
  });
}

export async function authenticateLocalUser(
  email: string,
  password: string
): Promise<LocalUserRecord | null> {
  const normalized = email.trim().toLowerCase();
  const store = await readStore();
  const user = store.users.find((u) => u.email.toLowerCase() === normalized);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
}

export async function resetLocalUserPassword(
  email: string,
  newPassword: string
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  return withStoreLock(async () => {
    const store = await readStore();
    const user = store.users.find((u) => u.email.toLowerCase() === normalized);
    if (!user) return false;
    user.passwordHash = hashPassword(newPassword);
    await writeStore(store);
    return true;
  });
}

export async function deleteLocalUser(userId: string): Promise<void> {
  return withStoreLock(async () => {
    const store = await readStore();
    store.users = store.users.filter((u) => u.id !== userId);
    store.journals = store.journals.filter((j) => j.user_id !== userId);
    store.tokens = store.tokens.filter((t) => t.userId !== userId);
    store.subscriptions = store.subscriptions.filter((s) => s.userId !== userId);
    store.paymentOrders = store.paymentOrders.filter((o) => o.userId !== userId);
    await writeStore(store);
  });
}

export async function listLocalJournals(
  userId: string
): Promise<JournalEntry[]> {
  const store = await readStore();
  return store.journals
    .filter((j) => j.user_id === userId)
    .sort((a, b) => {
      const dateCmp = b.tanggal.localeCompare(a.tanggal);
      if (dateCmp !== 0) return dateCmp;
      return b.created_at.localeCompare(a.created_at);
    });
}

export async function createLocalJournal(
  userId: string,
  payload: JournalPayload
): Promise<JournalEntry> {
  return withStoreLock(async () => {
    const store = await readStore();
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      user_id: userId,
      ...payload,
      created_at: new Date().toISOString(),
    };
    store.journals.push(entry);
    await writeStore(store);
    return entry;
  });
}

export async function updateLocalJournal(
  userId: string,
  id: string,
  payload: JournalPayload
): Promise<JournalEntry | null> {
  return withStoreLock(async () => {
    const store = await readStore();
    const idx = store.journals.findIndex(
      (j) => j.id === id && j.user_id === userId
    );
    if (idx === -1) return null;
    const updated: JournalEntry = {
      ...store.journals[idx],
      ...payload,
    };
    store.journals[idx] = updated;
    await writeStore(store);
    return updated;
  });
}

export async function deleteLocalJournal(
  userId: string,
  id: string
): Promise<boolean> {
  return withStoreLock(async () => {
    const store = await readStore();
    const before = store.journals.length;
    store.journals = store.journals.filter(
      (j) => !(j.id === id && j.user_id === userId)
    );
    if (store.journals.length === before) return false;
    await writeStore(store);
    return true;
  });
}

export async function getLocalIntegrationToken(
  userId: string
): Promise<Omit<LocalIntegrationToken, "tokenHash"> | null> {
  const store = await readStore();
  const found = store.tokens.find((t) => t.userId === userId);
  if (!found) return null;
  return {
    userId: found.userId,
    tokenPrefix: found.tokenPrefix,
    lastUsedAt: found.lastUsedAt,
    createdAt: found.createdAt,
  };
}

export async function upsertLocalIntegrationToken(
  userId: string,
  rawToken: string,
  tokenPrefix: string
): Promise<Omit<LocalIntegrationToken, "tokenHash">> {
  const tokenHash = hashApiToken(rawToken);
  return withStoreLock(async () => {
    const store = await readStore();
    const now = new Date().toISOString();
    const nextRecord: LocalIntegrationToken = {
      userId,
      tokenHash,
      tokenPrefix,
      lastUsedAt: null,
      createdAt: now,
    };
    const idx = store.tokens.findIndex((t) => t.userId === userId);
    if (idx >= 0) {
      store.tokens[idx] = nextRecord;
    } else {
      store.tokens.push(nextRecord);
    }
    await writeStore(store);
    return {
      userId,
      tokenPrefix,
      lastUsedAt: null,
      createdAt: now,
    };
  });
}

export async function deleteLocalIntegrationToken(
  userId: string
): Promise<void> {
  return withStoreLock(async () => {
    const store = await readStore();
    store.tokens = store.tokens.filter((t) => t.userId !== userId);
    await writeStore(store);
  });
}

export async function ingestLocalMt5Trade(
  rawToken: string,
  payload: JournalPayload
): Promise<{ status: "created" | "duplicate"; id: string }> {
  const tokenHash = hashApiToken(rawToken);
  return withStoreLock(async () => {
    const store = await readStore();
    const tokenRecord = store.tokens.find((t) => t.tokenHash === tokenHash);
    if (!tokenRecord) {
      throw new Error("Invalid API token");
    }

    const sub = store.subscriptions.find((s) => s.userId === tokenRecord.userId);
    const isSubActive =
      sub?.plan === "pro" &&
      sub.status === "active" &&
      (!sub.proUntil || new Date(sub.proUntil).getTime() > Date.now());
    if (!isSubActive) {
      throw new Error("Pro subscription required");
    }

    tokenRecord.lastUsedAt = new Date().toISOString();

    if (payload.external_id) {
      const duplicate = store.journals.find(
        (j) =>
          j.user_id === tokenRecord.userId &&
          j.external_id === payload.external_id
      );
      if (duplicate) {
        await writeStore(store);
        return { status: "duplicate", id: duplicate.id };
      }
    }

    const created: JournalEntry = {
      id: crypto.randomUUID(),
      user_id: tokenRecord.userId,
      ...payload,
      created_at: new Date().toISOString(),
    };
    store.journals.push(created);
    await writeStore(store);
    return { status: "created", id: created.id };
  });
}

export async function getLocalSubscription(
  userId: string
): Promise<LocalSubscriptionRecord | null> {
  const store = await readStore();
  return store.subscriptions.find((s) => s.userId === userId) ?? null;
}

export async function listLocalPaymentOrders(
  userId: string
): Promise<LocalPaymentOrderRecord[]> {
  const store = await readStore();
  return store.paymentOrders
    .filter((o) => o.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createLocalPaymentOrder(
  record: LocalPaymentOrderRecord
): Promise<void> {
  return withStoreLock(async () => {
    const store = await readStore();
    store.paymentOrders.push(record);
    await writeStore(store);
  });
}

export async function getLocalPaymentOrder(
  orderId: string
): Promise<LocalPaymentOrderRecord | null> {
  const store = await readStore();
  return store.paymentOrders.find((o) => o.orderId === orderId) ?? null;
}

export async function activateLocalProFromOrder(
  orderId: string,
  durationDays: number
): Promise<LocalSubscriptionRecord | null> {
  return withStoreLock(async () => {
    const store = await readStore();
    const order = store.paymentOrders.find((o) => o.orderId === orderId);
    if (!order) return null;

    const now = new Date();
    if (order.status !== "paid") {
      order.status = "paid";
      order.paidAt = now.toISOString();
    }

    const existing = store.subscriptions.find((s) => s.userId === order.userId);
    const baseTime =
      existing?.proUntil && new Date(existing.proUntil).getTime() > now.getTime()
        ? new Date(existing.proUntil).getTime()
        : now.getTime();
    const nextUntil = new Date(
      baseTime + durationDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const updated: LocalSubscriptionRecord = {
      userId: order.userId,
      plan: "pro",
      status: "active",
      proUntil: nextUntil,
      lastOrderId: orderId,
      updatedAt: now.toISOString(),
    };

    const idx = store.subscriptions.findIndex((s) => s.userId === order.userId);
    if (idx >= 0) {
      store.subscriptions[idx] = updated;
    } else {
      store.subscriptions.push(updated);
    }

    await writeStore(store);
    return updated;
  });
}

export async function updateLocalPaymentOrderStatus(
  orderId: string,
  status: "pending" | "paid" | "failed" | "expired"
): Promise<void> {
  return withStoreLock(async () => {
    const store = await readStore();
    const order = store.paymentOrders.find((o) => o.orderId === orderId);
    if (!order) return;
    order.status = status;
    await writeStore(store);
  });
}
