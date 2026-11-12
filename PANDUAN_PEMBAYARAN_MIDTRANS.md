# Panduan Aktivasi Pembayaran Midtrans — PnL Diary (MT5 Pro Rp 30.000 / Bulan)

Dokumen ini disimpan sebagai panduan lanjutan untuk mengaktifkan gerbang pembayaran **Midtrans** (QRIS, e-Wallet, Virtual Account Bank) agar fitur **MT5 Sync Pro** dapat dibeli oleh pengguna publik seharga **Rp 30.000 / 30 hari**.

---

## Status Proyek Saat Ini (Sudah Siap di Kode & Vercel)
- Web produksi live di: `https://pnl-diary.vercel.app`
- Menu khusus MT5 Sync: `https://pnl-diary.vercel.app/mt5`
- Halaman Paywall Pro dengan harga default **Rp 30.000 / 30 hari** sudah aktif.
- API Backend Midtrans Snap (`/api/payments/midtrans/checkout`, `/api/payments/midtrans/verify`, `/api/payments/midtrans/webhook`) sudah siap menerima transaksi.
- EA MT5 `PnLDiarySync.mq5` siap diunduh otomatis dengan URL & API Key setelah status Pro aktif.

---

## 4 Langkah Aktivasi yang Perlu Dikerjakan Besok

### Langkah 1: Jalankan SQL Terbaru di Supabase (1 Menit)
Pastikan tabel database untuk langganan dan pesanan pembayaran sudah aktif di Supabase:
1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → pilih proyek **`pnl-diary`** → menu **SQL Editor**.
2. Buka file [`supabase/schema.sql`](supabase/schema.sql) di repositori ini, salin seluruh isinya, tempel ke SQL Editor Supabase, lalu klik **Run**.
3. Pastikan muncul pesan `Success. No rows returned`.

*(Catatan: Langkah ini membuat tabel `user_subscriptions`, `payment_orders`, serta memperbarui RPC `ingest_mt5_trade` agar memeriksa status Pro aktif).*

---

### Langkah 2: Ambil Kunci Akses dari Midtrans
1. Masuk ke [Midtrans Dashboard](https://dashboard.midtrans.com) (atau [Midtrans Sandbox](https://dashboard.sandbox.midtrans.com) untuk mode tes).
2. Masuk ke menu **Settings → Access Keys**:
   - Salin **Server Key** (contoh: `SB-Mid-server-...` atau `Mid-server-...`)
   - Salin **Client Key** (contoh: `SB-Mid-client-...` atau `Mid-client-...`)
3. Masuk ke menu **Settings → Configuration**:
   - Di kolom **Payment Notification URL**, masukkan URL webhook ini:
     ```text
     https://pnl-diary.vercel.app/api/payments/midtrans/webhook
     ```
   - Klik **Save changes**.

---

### Langkah 3: Ambil `service_role` Secret Key dari Supabase
Key ini dibutuhkan agar server Vercel Anda diizinkan mengubah status langganan pengguna dari `inactive` menjadi `active` begitu pembayaran terkonfirmasi:
1. Di **Supabase Dashboard** (`pnl-diary`), klik ikon gerigi di kiri bawah (**Project Settings**) → pilih **API**.
2. Pada bagian **Project API keys**, klik *Reveal* pada key **`service_role` (secret)** lalu salin kodenya.

---

### Langkah 4: Tambahkan Environment Variables di Vercel & Redeploy
1. Buka [Vercel Dashboard](https://vercel.com) → pilih proyek **`pnl-diary`** → tab **Settings → Environment Variables**.
2. Tambahkan variabel berikut (pastikan mencentang checklist **Production**, **Preview**, dan **Development**):

| Nama Variabel | Nilai (Value) | Keterangan |
|---|---|---|
| `MIDTRANS_SERVER_KEY` | *(Salin dari Langkah 2)* | Server key rahasia Midtrans |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | *(Salin dari Langkah 2)* | Client key Midtrans untuk pop-up Snap |
| `MIDTRANS_IS_PRODUCTION` | `false` *(jika Sandbox)* atau `true` *(jika Live)* | Menentukan gateway Sandbox / Produksi |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Salin dari Langkah 3)* | Secret role untuk aktivasi data langganan |
| `PRO_PLAN_PRICE_IDR` | `30000` *(opsional, default sudah 30000)* | Harga paket per 30 hari |

3. Buka tab **Deployments** di Vercel, klik tombol titik tiga (`...`) di samping deployment teratas → klik **Redeploy**.

---

## Cara Verifikasi Setelah Selesai
1. Buka `https://pnl-diary.vercel.app/mt5` setelah login.
2. Klik tombol **Bayar & Aktifkan Pro (Rp 30.000)**.
3. Pop-up Midtrans Snap akan langsung muncul dengan pilihan metode pembayaran (QRIS / Bank Transfer / e-Wallet).
4. Setelah transaksi diselesaikan, status halaman akan langsung berubah menjadi **Paket MT5 Pro Aktif** dan kartu download EA MT5 siap digunakan.
