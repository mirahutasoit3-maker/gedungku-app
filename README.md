# GedungKu

**Sistem Reservasi Sewa Gedung untuk Pernikahan, Adat & Duka, dan Ulang Tahun**

Aplikasi web *three-tier* manajemen penyewaan gedung berbasis container Docker untuk Tugas Kelompok-1 MID.

## 🔗 Tautan Penting

| Komponen | Tautan |
|---|---|
| Repositori | [GitHub gedungku-app](https://github.com/mirahutasoit3-maker/gedungku-app) |
| Backend Image | [Docker Hub api](https://hub.docker.com/r/mirawatihutasoit/gedungku-api) |
| Frontend Image | [Docker Hub frontend](https://hub.docker.com/r/mirawatihutasoit/gedungku-frontend) |


## 🛠️ Arsitektur Kontainer (Docker Compose)

Aplikasi berjalan otomatis pada **4 container** terisolasi di dalam jaringan `gedungku_net`:
1. **`gedungku_nginx` (Port 80):** Menyajikan Frontend **React 18** dan meneruskan jalur `/api/*` ke backend.
2. **`gedungku_api` (Internal):** Backend **Flask 3** (Gunicorn) dengan status *non-root user*.
3. **`gedungku_db` (Internal):** Database **PostgreSQL 16** dengan data presisten via volume `db_data`.
4. **`gedungku_adminer` (Port 8081):** GUI web manajemen database.

*Fitur Spesifik:* Menggunakan *multi-stage build*, pembatasan kredensial via `.env`, dan *healthcheck database gateway dependency* (API menunggu DB sehat sebelum menyala).

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Clone & Setup Environment
```bash
git clone https://github.com/mirahutasoit3-maker/gedungku-app.git
cd gedungku-app
```
Salin file `.env.example` menjadi `.env` (isi/sesuaikan kredensial di dalamnya):
```bash
# Windows
copy .env.example .env

# Linux / Mac
cp .env.example .env
```

### 2. Jalankan Docker Stack
```bash
docker compose up -d --build
```

### 3. Alamat Akses Layanan

| Fitur | URL / Endpoint | Hak Akses / Kredensial |
|---|---|---|
| **Aplikasi Utama** | `http://localhost` | Registrasi mandiri via menu **Daftar** |
| **Panel Admin** | `http://localhost/admin` | Gunakan `ADMIN_EMAIL` & `ADMIN_PASSWORD` dari `.env` |
| **Database GUI (Adminer)** | `http://localhost:8081` | Server: `db` \| User: `gedungku` \| Sandi: `DB_PASSWORD` |

*Catatan: Struktur tabel data PostgreSQL dan seed data contoh gedung terisi otomatis pada siklus awal booting container.*

---

## 💾 Skema Database (PostgreSQL)

*   **`users`:** id, nama, email, password (hash), role (`admin`, `user`).
*   **`gedung`:** id, nama, kota, alamat, kapasitas, harga_sesi, fasilitas, foto_url, kategori.
*   **`booking`:** id, user_id, gedung_id, jenis_acara, tanggal, sesi, total, status (`menunggu`, `disetujui`, `ditolak`, `dibatalkan`), alasan.
*   **`ulasan`:** id, booking_id, gedung_id, user_id, rating (1-5), komentar, balasan, tersembunyi.
