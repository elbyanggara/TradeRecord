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

interface LocalStoreData {
  users: LocalUserRecord[];
  journals: JournalEntry[];
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
    };
  } catch {
    return { users: [], journals: [] };
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

