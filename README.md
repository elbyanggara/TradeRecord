# PnL Diary — Jurnal PnL Harian

> **Catat PnL harianmu, di mana saja.**

Web & PWA jurnal trading harian yang dibangun dengan **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **SWR**, dan **Supabase (Auth + Postgres + RLS)**.

## Fitur MVP
- **Landing Page (`/`)**: Pengenalan produk, pratinjau PnL, panduan install PWA.
- **Autentikasi (`/login`, `/register`, `/reset`)**: Register dengan email + password (min 8 karakter) dan verifikasi email, Login (termasuk opsi Google OAuth), Session persist, Reset password via email, dan proteksi route via `src/proxy.ts`.
- **Dashboard (`/dashboard`)**: Total PnL bulan berjalan & all-time, jumlah trade, win rate, rata-rata PnL/trade, grafik PnL harian, serta filter akun (`Real` / `Demo`).
- **Jurnal PnL (`/journal`)**: Tambah, edit, hapus (dengan modal konfirmasi), pagination 20 entri/halaman, filter bulan/instrumen/akun/hasil, dan Export CSV.
- **Kalender PnL (`/calendar`)**: Tampilan bulanan berwarna (hijau profit, merah loss, abu tanpa data) dengan detail entri per tanggal.
- **Profil (`/profile`)**: Info akun, download CSV seluruh entri, panduan install PWA, logout, dan hapus akun permanen.
- **PWA**: `src/app/manifest.ts`, service worker `public/sw.js`, dan ikon `192×192` & `512×512`.

## Setup Lokal & Supabase

1. Salin `.env.local.example` menjadi `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
2. Isi variabel lingkungan dari **Supabase Dashboard → Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (untuk aktivasi webhook pembayaran)
3. Jalankan skema SQL di **Supabase Dashboard → SQL Editor** dari file [`supabase/schema.sql`](supabase/schema.sql) untuk membuat tabel `public.journals`, `public.integration_tokens`, `public.user_subscriptions`, `public.payment_orders`, policy RLS, dan RPC `ingest_mt5_trade`.
4. Di **Supabase → Authentication → URL Configuration**, tambahkan URL aplikasi Anda (mis. `http://localhost:3000/auth/callback` dan `https://pnl-diary.vercel.app/auth/callback`) ke **Redirect URLs**.
5. Konfigurasi Pembayaran Midtrans (untuk langganan MT5 Pro Rp 30.000):
   - `MIDTRANS_SERVER_KEY`: Server Key dari Midtrans
   - `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`: Client Key dari Midtrans
   - `MIDTRANS_IS_PRODUCTION`: `false` (Sandbox) atau `true` (Production)
   - Di Midtrans Dashboard (Settings -> Configuration), set Payment Notification URL ke:
     `https://pnl-diary.vercel.app/api/payments/midtrans/webhook`
6. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```

## Verifikasi & Build
```bash
npm run lint
npm run build
```
