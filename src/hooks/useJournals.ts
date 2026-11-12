"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { JournalEntry, JournalPayload } from "@/types/journal";

const JOURNALS_SWR_KEY = "pnl:journals";

function normalizeRow(row: Record<string, unknown>): JournalEntry {
  return {
    ...(row as unknown as JournalEntry),
    entry:
      row.entry !== null && row.entry !== undefined ? Number(row.entry) : null,
    exit:
      row.exit !== null && row.exit !== undefined ? Number(row.exit) : null,
    lot: row.lot !== null && row.lot !== undefined ? Number(row.lot) : null,
    pnl_nominal: Number(row.pnl_nominal),
    pnl_persen:
      row.pnl_persen !== null && row.pnl_persen !== undefined
        ? Number(row.pnl_persen)
        : null,
  };
}

async function fetchJournals(): Promise<JournalEntry[]> {
  if (!isSupabaseConfigured()) {
    const res = await fetch("/api/local/journals", { cache: "no-store" });
    const json = (await res.json()) as {
      data?: Record<string, unknown>[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(json.error ?? "Gagal memuat data jurnal.");
    }
    return (json.data ?? []).map(normalizeRow);
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("journals")
    .select("*")
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    normalizeRow(row as Record<string, unknown>)
  );
}

export function useJournals(userId: string) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    JournalEntry[],
    Error
  >(userId ? [JOURNALS_SWR_KEY, userId] : null, fetchJournals, {
    revalidateOnFocus: true,
    keepPreviousData: true,
  });

  async function createJournal(payload: JournalPayload): Promise<JournalEntry> {
    if (!isSupabaseConfigured()) {
      const res = await fetch("/api/local/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        data?: Record<string, unknown>;
        error?: string;
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error ?? "Gagal menyimpan entri.");
      }
      await mutate();
      return normalizeRow(json.data);
    }

    const supabase = createClient();
    const { data: inserted, error: insertError } = await supabase
      .from("journals")
      .insert({
        user_id: userId,
        ...payload,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    await mutate();
    return normalizeRow(inserted as Record<string, unknown>);
  }

  async function updateJournal(
    id: string,
    payload: JournalPayload
  ): Promise<JournalEntry> {
    if (!isSupabaseConfigured()) {
      const res = await fetch(`/api/local/journals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        data?: Record<string, unknown>;
        error?: string;
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error ?? "Gagal memperbarui entri.");
      }
      await mutate();
      return normalizeRow(json.data);
    }

    const supabase = createClient();
    const { data: updated, error: updateError } = await supabase
      .from("journals")
      .update(payload)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    await mutate();
    return normalizeRow(updated as Record<string, unknown>);
  }

  async function deleteJournal(id: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const res = await fetch(`/api/local/journals/${id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menghapus entri.");
      }
      await mutate();
      return;
    }

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("journals")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    await mutate();
  }

  return {
    journals: data ?? [],
    isLoading,
    isValidating,
    error,
    refresh: () => mutate(),
    createJournal,
    updateJournal,
    deleteJournal,
  };
}
