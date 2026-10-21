# GedungKu

**Sistem Reservasi Sewa Gedung untuk Pernikahan, Adat & Duka, dan Ulang Tahun**

Aplikasi web *three-tier* untuk mengelola penyewaan gedung, dijalankan sepenuhnya di dalam container Docker. Dibuat untuk Tugas Kelompok-1 MID.

## 🔗 Tautan Penting

| Komponen | Tautan |
|---|---|
| Repositori GitHub | [gedungku-app](https://github.com/mirahutasoit3-maker/gedungku-app) |
| Image Backend (Docker Hub) | [mirawatihutasoit/gedungku-api](https://hub.docker.com/r/mirawatihutasoit/gedungku-api) |
| Image Frontend (Docker Hub) | [mirawatihutasoit/gedungku-frontend](https://hub.docker.com/r/mirawatihutasoit/gedungku-frontend) |


## ✨ Ringkasan Aplikasi

GedungKu memungkinkan pengguna mencari gedung berdasarkan kategori acara (**Pernikahan**, **Adat & Duka**, **Ulang Tahun**), melihat ketersediaan sesi pada tanggal tertentu, lalu memesan. Admin mengelola data gedung, menyetujui atau menolak pesanan, dan memoderasi ulasan.

**Fitur pengguna**
*   Registrasi dan login (kata sandi disimpan sebagai hash, sesi memakai cookie bertanda tangan).
*   Cari gedung per kategori, nama, atau kota; tampil sisa sesi pada tanggal yang dipilih (3 sesi per hari: pagi 08.00-12.00, siang 13.00-17.00, malam 19.00-23.00).
*   Pesan gedung dengan jenis acara, tanggal, dan sesi. Pesanan baru berstatus `menunggu`.
*   Riwayat pesanan, serta pembatalan selama status masih `menunggu`.
*   Ulasan dan rating 1-5 bintang, hanya untuk pesanan `disetujui` yang sesinya sudah berakhir (waktu WIB), satu ulasan per pesanan.

**Fitur admin** (`/admin`)
*   Ringkasan: jumlah gedung, pesanan menunggu, total pendapatan dari pesanan disetujui.
*   Setujui atau tolak pesanan.
*   Tambah, ubah, dan hapus gedung.
*   Balas dan sembunyikan atau tampilkan ulasan.

**Pencegahan bentrok jadwal** dilakukan dua lapis: pengecekan di kode backend, dan *partial unique index* `uq_slot` di PostgreSQL pada `(gedung_id, tanggal, sesi)` untuk pesanan berstatus `menunggu` atau `disetujui`.

---

## 🛠️ Arsitektur Kontainer (Docker Compose)

Aplikasi berjalan pada **4 container** di dalam satu jaringan bridge bernama `gedungku_net`.

```
Browser --:80--> gedungku_nginx --/api/*--> gedungku_api:5000 --> gedungku_db:5432
                                                                  ^
                                          gedungku_adminer:8081 --+
```

| Container | Image | Port host | Fungsi |
|---|---|---|---|
| `gedungku_nginx` | build dari `./frontend` (tag `gedungku/frontend:1.0`) | 80 | Menyajikan hasil build **React 18** dan meneruskan `/api/*` ke `api:5000` |
| `gedungku_api` | build dari `./backend` (tag `gedungku/api:1.0`) | tidak dibuka (internal) | Backend **Flask 3** dijalankan **Gunicorn** (2 worker) |
| `gedungku_db` | `postgres:16-alpine` | tidak dibuka (internal) | Database **PostgreSQL 16** |
| `gedungku_adminer` | `adminer` | 8081 | GUI web untuk melihat dan mengelola database |

### Konsep container yang diterapkan

| Konsep | Penerapan di proyek ini |
|---|---|
| **Image dasar (OS + library)** | Backend `python:3.12-slim` (Debian), tahap build frontend `node:20-alpine`, penyaji frontend `nginx:alpine` |
| **Multi-stage build** | **Hanya image frontend.** Tahap 1 (`node`) menjalankan `npm install` dan `npm run build`. Tahap 2 (`nginx`) hanya menyalin folder `dist`, sehingga Node.js dan source tidak ikut ke image akhir. Image backend dibuat satu tahap. |
| **Non-root user** | Image backend membuat `appuser` dan menjalankan Gunicorn dengan `USER appuser` |
| **Healthcheck** | Pada container `db` (`pg_isready`, interval 5 detik, 10 kali percobaan). Container `api` memakai `depends_on` dengan `condition: service_healthy`, sehingga baru start setelah database sehat |
| **Urutan start** | `db` (sehat) → `api` → `nginx`. Adminer menunggu `db` mulai. `nginx` menunggu `api` mulai |
| **Konfigurasi lewat environment** | Kredensial dibaca dari file `.env` (`env_file`) dan tidak ikut ke image maupun Git (ada di `.gitignore` dan `.dockerignore`). `DB_HOST=db` ditetapkan di `docker-compose.yml` |
| **Persistensi data** | Named volume `db_data` dipasang ke `/var/lib/postgresql/data` |
| **Jaringan** | Jaringan `gedungku_net`; antar container saling menemukan lewat nama service (`db`, `api`). Backend dan database tidak dibuka ke host |
| **Reverse proxy** | `nginx.conf` meneruskan `/api/` ke `http://api:5000`, dan memakai `try_files` agar rute React (`/admin`, `/riwayat`) tidak 404 saat di-refresh |
| **Restart policy** | `restart: unless-stopped` pada semua container |
| **Inisialisasi otomatis** | Saat backend start, tabel dibuat (`CREATE TABLE IF NOT EXISTS`), akun admin dibuat dari `.env`, dan data contoh gedung diisi bila masih kosong. Kunci `pg_advisory_xact_lock` mencegah 2 worker Gunicorn saling bentrok |

---

## 📋 Alur Pengerjaan

1. **Menentukan aplikasi:** sistem reservasi gedung dengan fitur CRUD dan database PostgreSQL.
2. **Membuat container image**
    *   `backend/Dockerfile`: mulai dari `python:3.12-slim`, salin `requirements.txt` lebih dulu (agar layer dependency ter-cache), `pip install`, salin kode, buat `appuser`, jalankan Gunicorn.
    *   `frontend/Dockerfile`: build React di `node:20-alpine`, hasilnya disalin ke `nginx:alpine` beserta `nginx.conf`.
3. **Memasang aplikasi ke image:** kode backend (`app.py`) dan hasil build frontend (`dist`) disalin ke dalam image masing-masing.
4. **Merangkai semua service** di `docker-compose.yml` (db, api, nginx, adminer) lengkap dengan network, volume, healthcheck, dan dependensi.
5. **Uji coba:** lihat bagian *Pengujian* di bawah.
6. **Otomatisasi CI/CD:** GitHub Actions menguji build dan menjalankan seluruh container pada setiap perubahan, lalu mempublikasikan image ke Docker Hub saat rilis diberi tag versi. Lihat bagian *CI/CD*.

---

## 🚀 Cara Menjalankan Aplikasi

Prasyarat: Docker dan Docker Compose v2.

### 1. Clone & Setup Environment
```bash
git clone https://github.com/mirahutasoit3-maker/gedungku-app.git
cd gedungku-app
```
Salin `.env.example` menjadi `.env`, lalu sesuaikan nilainya:
```bash
# Windows
copy .env.example .env

# Linux / Mac
cp .env.example .env
```

| Variabel | Fungsi |
|---|---|
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Nama database, pengguna, dan kata sandi PostgreSQL |
| `SECRET_KEY` | Kunci penanda tangan cookie sesi Flask (isi string acak panjang) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Akun admin yang dibuat otomatis saat pertama kali jalan |

### 2. Jalankan Docker Stack
```bash
docker compose up -d --build
```

### 3. Alamat Akses Layanan

| Fitur | URL | Kredensial |
|---|---|---|
| **Aplikasi Utama** | `http://localhost` | Registrasi mandiri lewat menu **Daftar** |
| **Panel Admin** | `http://localhost/admin` | `ADMIN_EMAIL` dan `ADMIN_PASSWORD` dari `.env` |
| **Adminer** | `http://localhost:8081` | Sistem: PostgreSQL, Server: `db`, User: `DB_USER`, Sandi: `DB_PASSWORD`, Database: `DB_NAME` |

### 4. Menghentikan
```bash
docker compose down        # hentikan container, data database tetap aman
docker compose down -v     # hentikan dan HAPUS data database (volume db_data)
```

---

## 🧪 Pengujian

| Tujuan | Perintah | Hasil yang diharapkan |
|---|---|---|
| Status container | `docker compose ps` | 4 container `Up`, `gedungku_db` berstatus `healthy` |
| Log backend | `docker compose logs api` | Gunicorn berjalan di `0.0.0.0:5000` |
| Backend non-root | `docker exec gedungku_api whoami` | `appuser` |
| API lewat Nginx | `curl http://localhost/api/me` | `{"user":null}` |
| Data contoh terisi | `curl http://localhost/api/gedung` | JSON berisi 6 gedung (2 per kategori) |
| Jaringan | `docker network ls` | Ada jaringan `<nama-folder>_gedungku_net` |
| Volume | `docker volume ls` | Ada volume `<nama-folder>_db_data` |
| Persistensi | Tambah data, `docker compose down`, `docker compose up -d`, cek lagi | Data masih ada |
| Image | `docker image ls` | Ada `gedungku/api:1.0` dan `gedungku/frontend:1.0` |

---

## 🔁 CI/CD dengan GitHub Actions

Pipeline didefinisikan di `.github/workflows/ci.yml` dengan nama **CI/CD & Quality Control GedungKu**. Hasil setiap run dapat dilihat di tab **Actions** pada repositori GitHub.

**Pemicu**

| Kejadian | Tahap yang berjalan |
|---|---|
| `push` ke branch `main` | `lint` → `build-test` |
| `pull request` ke `main` | `lint` → `build-test` |
| `push` tag berawalan `v` (contoh `v1.0.3`) | `lint` → `build-test` → `publish` |

**Tahap pipeline**

```
lint  -->  build-test  -->  publish (hanya untuk tag v*)
```

| Tahap | Isi |
|---|---|
| **1. `lint`** (Lint code base) | Menjalankan **Super-Linter v4** untuk memeriksa kerapian kode. Opsi `DISABLE_ERRORS: true` membuat temuan lint hanya ditampilkan di log dan **tidak menggagalkan pipeline** |
| **2. `build-test`** (Build and Test Application) | Menunggu `lint` selesai. Menyalin `.env.example` menjadi `.env`, menjalankan `docker compose up -d --build` (membangun dan menjalankan keempat container), lalu menguji `curl -f --retry 20 --retry-delay 3 http://localhost/api/gedung` (API lewat Nginx) dan `curl -f http://localhost/` (halaman frontend). Jika gagal, log container ditampilkan. Container selalu dimatikan di akhir dengan `docker compose down -v` |
| **3. `publish`** (Publish to Docker Hub) | Menunggu `build-test` sukses dan hanya berjalan untuk tag `v*`. Nomor versi diambil dari nama tag (tag `v1.0.3` menjadi versi `1.0.3`). Login ke Docker Hub memakai secret `DOCKERHUB_TOKEN`, lalu membangun dan mengunggah dua image dengan tag versi dan `latest` |

**Image hasil publikasi**

| Image | Tag |
|---|---|
| `mirawatihutasoit/gedungku-api` | `<versi>` dan `latest` |
| `mirawatihutasoit/gedungku-frontend` | `<versi>` dan `latest` |

Image di Docker Hub dibangun oleh tahap `publish` dari folder `./backend` dan `./frontend`, sedangkan `docker-compose.yml` menamai hasil build lokal `gedungku/api:1.0` dan `gedungku/frontend:1.0`. Keduanya dibangun dari Dockerfile yang sama.

**Cara merilis versi baru**
```bash
git tag v1.0.4
git push origin v1.0.4
```
Setelah tag dikirim, buka tab **Actions**: tiga tahap harus berstatus hijau, lalu tag baru muncul di halaman Docker Hub.

**Prasyarat di GitHub:** buat secret `DOCKERHUB_TOKEN` (Docker Hub *access token*) di **Settings → Secrets and variables → Actions**. Tanpa secret ini, tahap `publish` gagal.

**Menjalankan image dari Docker Hub secara manual** (opsional):
```bash
docker pull mirawatihutasoit/gedungku-api:latest
docker pull mirawatihutasoit/gedungku-frontend:latest
```

---

## 🔄 Penerapan CRUD

Entitas utama: **gedung**. Semua operasi CRUD tersedia lewat panel admin.

| Operasi | Endpoint | Halaman |
|---|---|---|
| **Create** gedung | `POST /api/admin/gedung` | Admin → Tambah gedung |
| **Read** gedung | `GET /api/gedung`, `GET /api/gedung/<id>` | Beranda dan Detail |
| **Update** gedung | `PUT /api/admin/gedung/<id>` | Admin → Ubah |
| **Delete** gedung | `DELETE /api/admin/gedung/<id>` | Admin → Hapus |

Endpoint lain:

| Entitas | Endpoint |
|---|---|
| Akun | `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/me` |
| Pesanan | `POST /api/gedung/<id>/booking`, `GET /api/riwayat`, `POST /api/booking/<id>/batal`, `POST /api/admin/booking/<id>/setujui` atau `/tolak` |
| Ulasan | `POST /api/booking/<id>/ulasan`, `POST /api/admin/ulasan/<id>/balas`, `POST /api/admin/ulasan/<id>/sembunyikan` |
| Admin | `GET /api/admin/summary` |

Endpoint `/api/admin/*` hanya dapat diakses akun dengan role `admin` (selain itu dijawab 403).

---

## 💾 Skema Database (PostgreSQL)

*   **`users`:** `id`, `nama`, `email` (unik), `password` (hash), `role` (`admin` atau `user`, default `user`).
*   **`gedung`:** `id`, `nama`, `kota`, `alamat`, `kapasitas`, `harga_sesi`, `fasilitas`, `foto_url`, `kategori` (`pernikahan`, `adat`, `ulang_tahun`).
*   **`booking`:** `id`, `user_id` → users, `gedung_id` → gedung, `jenis_acara`, `tanggal`, `sesi` (`pagi`, `siang`, `malam`), `total`, `status` (`menunggu`, `disetujui`, `ditolak`, `dibatalkan`), `dibuat`. Index unik parsial `uq_slot` mencegah dua pesanan aktif pada gedung, tanggal, dan sesi yang sama.
*   **`ulasan`:** `id`, `booking_id` (unik) → booking, `user_id` → users, `gedung_id` → gedung, `rating` (1-5), `komentar`, `balasan`, `tersembunyi`, `dibuat`.

Relasi memakai `ON DELETE CASCADE`: menghapus gedung ikut menghapus pesanan dan ulasannya.

---

## 📁 Struktur Proyek

```
gedungku-app/
├── docker-compose.yml        # definisi 4 service, network, volume
├── .github/workflows/ci.yml  # pipeline CI/CD (lint, build-test, publish)
├── .env.example              # contoh variabel environment
├── adminer/adminer.css       # tema Adminer (dipasang read-only)
├── backend/
│   ├── Dockerfile            # image Flask + Gunicorn (non-root)
│   ├── app.py                # API, skema DB, seed data
│   └── requirements.txt      # Flask, gunicorn, psycopg2-binary
└── frontend/
    ├── Dockerfile            # multi-stage: Node (build) → Nginx (serve)
    ├── nginx.conf            # reverse proxy /api dan fallback SPA
    ├── package.json
    └── src/                  # React: App, pages (Home, Detail, Riwayat, Admin, ...)
```

*Teknologi: React 18, Vite 5, React Router 6, Flask 3.0, Gunicorn 22, psycopg2, PostgreSQL 16, Nginx, Docker Compose, GitHub Actions.*