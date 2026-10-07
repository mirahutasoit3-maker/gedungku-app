# GedungKu

**Sistem Reservasi Sewa Gedung untuk Pernikahan, Adat & Duka, dan Ulang Tahun**

Aplikasi web penyewaan gedung yang berjalan di container Docker. Dibuat untuk Tugas Kelompok-1 MID: Pengembangan Aplikasi yang Berjalan pada Container.


## Deskripsi

GedungKu memiliki dua peran: **user** yang memesan gedung, dan **admin** yang mengelola gedung serta menyetujui pesanan. Gedung dibagi menjadi tiga kategori: **Pernikahan**, **Adat & Duka**, dan **Ulang Tahun**.

**Fitur**
- Daftar dan login dengan peran admin dan user
- Telusuri gedung per kategori, pencarian nama atau kota, dan sisa sesi per tanggal
- Pemesanan dengan **anti-bentrok jadwal** (gedung, tanggal, dan sesi yang sama tidak bisa dipesan dua kali)
- Riwayat dan pembatalan pesanan (user)
- Dashboard, CRUD gedung, dan setujui atau tolak pesanan (admin)

Sesi: pagi (08.00-12.00), siang (13.00-17.00), malam (19.00-23.00).

## Arsitektur

```
Browser → nginx :80 ─┬─ halaman React
                     └─ /api/* → api (Flask) :5000 → db (PostgreSQL) :5432
                                                          ↓
                                                    volume db_data
adminer :8081 → db
```

| Container | Fungsi |
|---|---|
| `gedungku_nginx` | Frontend React (multi-stage build) dan reverse proxy |
| `gedungku_api` | Backend Flask + Gunicorn |
| `gedungku_db` | PostgreSQL 16 |
| `gedungku_adminer` | Antarmuka web database |

**Penerapan container:** Dockerfile sendiri, multi-stage build, user non-root, healthcheck database, named volume, custom network, kredensial di `.env`, dan restart policy.

**Teknologi:** React 18 (Vite), Flask 3, PostgreSQL 16, Nginx, Docker Compose.

## Cara Menjalankan

Prasyarat: Docker dan Docker Compose, port 80 dan 8081 kosong.

```bash
git clone [link GitHub]
cd gedungku
copy .env.example .env        # Linux/Mac: cp .env.example .env
```

Ubah `.env` (minimal `DB_PASSWORD`, `SECRET_KEY`, `ADMIN_PASSWORD`), lalu:

```bash
docker compose up -d --build
docker ps
```

| Fungsi | Alamat |
|---|---|
| Aplikasi | http://localhost |
| Dashboard admin | http://localhost/admin |
| Adminer | http://localhost:8081/?pgsql=db&username=gedungku&db=gedungku |

Akun admin dibuat otomatis dari `ADMIN_EMAIL` dan `ADMIN_PASSWORD` di `.env`. Data contoh gedung juga terisi otomatis.

## Cara Penggunaan

**User:** pilih kategori dan tanggal, klik **Pesan Gedung**, daftar atau masuk, pilih jenis acara dan sesi, lalu kirim. Pantau status di **Pesanan saya**.

**Admin:** masuk, buka **Dashboard admin**, klik **Setujui** atau **Tolak** pada pesanan, dan kelola gedung lewat tombol Tambah, Ubah, dan Hapus.

## Database

| Tabel | Kolom utama |
|---|---|
| `users` | id, nama, email, password (hash), role |
| `gedung` | id, nama, kota, alamat, kapasitas, harga_sesi, fasilitas, foto_url, kategori |
| `booking` | id, user_id, gedung_id, jenis_acara, tanggal, sesi, total, status, dibuat |

`booking` berelasi ke `users` dan `gedung` lewat foreign key. Anti-bentrok dijaga juga oleh unique index `(gedung_id, tanggal, sesi)`.

## Perintah Berguna

```bash
docker compose logs -f api     # log backend
docker compose down            # berhenti, data tetap ada
docker compose down -v         # berhenti dan HAPUS data
```

Uji persistensi: `down`, lalu `up -d`. Data akun dan pesanan tetap ada karena tersimpan di volume `db_data`.

## Pemecahan Masalah

- **Port 80 terpakai:** ubah menjadi `"8080:80"` pada service `nginx`.
- **Error 502:** tunggu sekitar 10 detik, atau cek `docker compose logs api`.
- **Tampilan tidak berubah:** jalankan `docker compose up -d --build`, lalu `Ctrl + F5`.
- **Login Adminer gagal:** pilih sistem **PostgreSQL**, server `db`.

## Referensi

- Alur pemesanan terinspirasi dari antarmuka GoWork (https://app.go-work.com). Kode dan desain dibuat sendiri oleh tim.
- Konsep sewa gedung dan pencegahan jadwal bentrok: sistem penyewaan Gedung Graha Mustika (https://eprints.umk.ac.id/24802/2/Bab%201%20TA.pdf) dan sistem booking Mutia Wedding (https://jptam.org/index.php/jptam/article/download/16310/12124/29577).
- Dokumentasi Docker, Flask, React, dan PostgreSQL.

## Rencana Pengembangan

Paket tambahan dengan hitung biaya otomatis, upload bukti DP, kalender visual, laporan CSV, dan scale out service `api`.