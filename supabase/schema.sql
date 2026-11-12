-- PnL Diary — Supabase Database Schema & RLS
-- Jalankan SQL ini di Supabase Dashboard -> SQL Editor

-- 1. Tabel journals (sesuai PRD §8)
create table if not exists public.journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tanggal date not null,
  akun text not null default 'Real' check (akun in ('Real', 'Demo')),
  instrumen text not null,
  arah text not null check (arah in ('long', 'short')),
  entry numeric,
  exit numeric,
  lot numeric,
  pnl_nominal numeric not null,
  pnl_persen numeric,
  catatan text,
  created_at timestamptz default now()
);

-- Index untuk query dashboard, filter, dan pagination per user
create index if not exists journals_user_tanggal_idx
  on public.journals (user_id, tanggal desc, created_at desc);

-- 2. Aktifkan Row Level Security (RLS)
alter table public.journals enable row level security;

-- 3. Policy isolasi data: user hanya bisa membaca & menulis datanya sendiri
drop policy if exists "own_data" on public.journals;
create policy "own_data" on public.journals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. RPC opsional untuk fitur Hapus Akun dari halaman /profile
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

