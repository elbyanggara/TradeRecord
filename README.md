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
3. Jalankan skema SQL di **Supabase Dashboard → SQL Editor** dari file [`supabase/schema.sql`](supabase/schema.sql) untuk membuat tabel `public.journals`, index, policy RLS `"own_data"`, serta fungsi `delete_own_account()`.
4. Di **Supabase → Authentication → URL Configuration**, tambahkan URL aplikasi Anda (mis. `http://localhost:3000/auth/callback` dan `https://pnldiary.app/auth/callback`) ke **Redirect URLs**.
5. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```

## Verifikasi & Build
```bash
npm run lint
npm run build
```
