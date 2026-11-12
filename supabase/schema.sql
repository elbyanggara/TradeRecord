-- PnL Diary — Supabase Database Schema, RLS & MT5 Integration
-- Jalankan SQL ini di Supabase Dashboard -> SQL Editor

-- 1. Tabel journals (sesuai PRD §8 + dukungan deduplikasi MT5)
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
  external_id text,
  created_at timestamptz default now()
);

alter table public.journals
  add column if not exists external_id text;

-- Index untuk query dashboard, filter, dan pagination per user
create index if not exists journals_user_tanggal_idx
  on public.journals (user_id, tanggal desc, created_at desc);

-- Index unik untuk mencegah duplikasi deal MT5 pada user yang sama
create unique index if not exists journals_user_external_id_uidx
  on public.journals (user_id, external_id)
  where external_id is not null;

-- 2. Aktifkan Row Level Security (RLS) pada journals
alter table public.journals enable row level security;

-- 3. Policy isolasi data: user hanya bisa membaca & menulis datanya sendiri
drop policy if exists "own_data" on public.journals;
create policy "own_data" on public.journals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Tabel token integrasi MT5 / EA per user
create table if not exists public.integration_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  token_hash text not null unique,
  token_prefix text not null,
  last_used_at timestamptz,
  created_at timestamptz default now()
);

alter table public.integration_tokens enable row level security;

drop policy if exists "own_tokens" on public.integration_tokens;
create policy "own_tokens" on public.integration_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. RPC untuk menerima webhook trade dari MT5 / EA dengan token API
create or replace function public.ingest_mt5_trade(
  p_raw_token text,
  p_external_id text,
  p_tanggal date,
  p_akun text,
  p_instrumen text,
  p_arah text,
  p_entry numeric,
  p_exit numeric,
  p_lot numeric,
  p_pnl_nominal numeric,
  p_pnl_persen numeric,
  p_catatan text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_user_id uuid;
  v_existing_id uuid;
  v_inserted_id uuid;
begin
  if p_raw_token is null or length(trim(p_raw_token)) < 16 then
    raise exception 'Invalid API token';
  end if;

  v_hash := encode(sha256(convert_to(trim(p_raw_token), 'UTF8')), 'hex');

  select user_id into v_user_id
  from public.integration_tokens
  where token_hash = v_hash
  limit 1;

  if v_user_id is null then
    raise exception 'Invalid API token';
  end if;

  update public.integration_tokens
  set last_used_at = now()
  where user_id = v_user_id;

  if p_external_id is not null and length(trim(p_external_id)) > 0 then
    select id into v_existing_id
    from public.journals
    where user_id = v_user_id and external_id = trim(p_external_id)
    limit 1;

    if v_existing_id is not null then
      return jsonb_build_object(
        'status', 'duplicate',
        'id', v_existing_id
      );
    end if;
  end if;

  insert into public.journals (
    user_id,
    tanggal,
    akun,
    instrumen,
    arah,
    entry,
    exit,
    lot,
    pnl_nominal,
    pnl_persen,
    catatan,
    external_id
  )
  values (
    v_user_id,
    p_tanggal,
    p_akun,
    upper(trim(p_instrumen)),
    lower(trim(p_arah)),
    p_entry,
    p_exit,
    p_lot,
    p_pnl_nominal,
    p_pnl_persen,
    p_catatan,
    nullif(trim(coalesce(p_external_id, '')), '')
  )
  returning id into v_inserted_id;

  return jsonb_build_object(
    'status', 'created',
    'id', v_inserted_id
  );
end;
$$;

revoke all on function public.ingest_mt5_trade(
  text, text, date, text, text, text, numeric, numeric, numeric, numeric, numeric, text
) from public;
grant execute on function public.ingest_mt5_trade(
  text, text, date, text, text, text, numeric, numeric, numeric, numeric, numeric, text
) to anon, authenticated;

-- 6. RPC opsional untuk fitur Hapus Akun dari halaman /profile
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
