import os, time
from datetime import date
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, g, jsonify, request, session
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS  # 1. Mengimpor library CORS pengizin akses browser

app = Flask(__name__)
# 2. Mengaktifkan CORS agar domain frontend Vercel bisa membaca data dari server backend Railway Anda
CORS(app, supports_credentials=True)

app.secret_key = os.environ["SECRET_KEY"]
SESI = ["pagi", "siang", "malam"]
KATEGORI = ("pernikahan", "adat", "ulang_tahun")
AKTIF = "status IN ('menunggu','disetujui')"
# [ULASAN] acara dianggap selesai bila jam akhir sesi (pagi 12.00, siang 17.00, malam 23.00 WIB) sudah lewat
SELESAI = ("(b.tanggal + CASE b.sesi WHEN 'pagi' THEN time '12:00' WHEN 'siang' THEN time '17:00' ELSE time '23:00' END) "
           "< (now() AT TIME ZONE 'Asia/Jakarta')")

def connect():
    return psycopg2.connect(host=os.environ["DB_HOST"], dbname=os.environ["DB_NAME"],
                            user=os.environ["DB_USER"], password=os.environ["DB_PASSWORD"],
                            cursor_factory=RealDictCursor)

def db():
    if "db" not in g:
        g.db = connect()
    return g.db

def q(sql, args=(), one=False):
    with db().cursor() as cur:
        cur.execute(sql, args)
        rows = cur.fetchall() if cur.description else None
    db().commit()
    return (rows[0] if rows else None) if one else rows

@app.teardown_appcontext
def close_db(_):
    c = g.pop("db", None)
    if c: c.close()

def err(msg, code=400):
    return jsonify(error=msg), code

def need(admin=False):
    if "uid" not in session: return err("Silakan masuk terlebih dahulu.", 401)
    if admin and session.get("role") != "admin": return err("Akses ditolak.", 403)

SCHEMA = f"""
CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY, nama TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user');
CREATE TABLE IF NOT EXISTS gedung(id SERIAL PRIMARY KEY, nama TEXT NOT NULL, kota TEXT, alamat TEXT,
  kapasitas INT NOT NULL, harga_sesi BIGINT NOT NULL, fasilitas TEXT, foto_url TEXT);
CREATE TABLE IF NOT EXISTS booking(id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE CASCADE,
  gedung_id INT REFERENCES gedung(id) ON DELETE CASCADE, jenis_acara TEXT NOT NULL, tanggal DATE NOT NULL,
  sesi TEXT NOT NULL, total BIGINT NOT NULL, status TEXT NOT NULL DEFAULT 'menunggu', dibuat TIMESTAMP DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS uq_slot ON booking(gedung_id, tanggal, sesi) WHERE {AKTIF};
ALTER TABLE gedung ADD COLUMN IF NOT EXISTS kategori TEXT NOT NULL DEFAULT 'pernikahan';
CREATE TABLE IF NOT EXISTS ulasan(id SERIAL PRIMARY KEY,
  booking_id INT UNIQUE NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gedung_id INT NOT NULL REFERENCES gedung(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  komentar TEXT, balasan TEXT, tersembunyi BOOLEAN NOT NULL DEFAULT false,
  dibuat TIMESTAMP DEFAULT now());
"""

SEED_KAT = {
    "adat": [
        ("Balai Adat Nusantara", "Medan", "Jl. Pancing", 400, 6000000, "Tenda luas, Ruang keluarga, Parkir, Dapur umum"),
        ("Gedung Serbaguna Marga", "Medan", "Jl. Mongonsidi", 300, 4500000, "AC, Ruang istirahat, Parkir, Sound system"),
    ],
    "ulang_tahun": [
        ("Ruang Pesta Ceria", "Medan", "Jl. Setiabudi", 100, 2500000, "AC, Panggung, Sound system, Ruang dekorasi"),
        ("Aula Syukuran Melati", "Medan", "Jl. Ringroad", 150, 3500000, "AC, Parkir, Dapur, Sound system"),
    ],
}

def init_db():
    for _ in range(20):
        try:
            c = connect(); cur = c.cursor()
            cur.execute("SELECT pg_advisory_xact_lock(7342)")  # kunci agar 2 worker tidak bentrok
            cur.execute(SCHEMA)
            cur.execute("SELECT 1 FROM users WHERE role='admin'")
            if not cur.fetchone():
                cur.execute("INSERT INTO users(nama,email,password,role) VALUES('Admin',%s,%s,'admin')",
                            (os.environ["ADMIN_EMAIL"], generate_password_hash(os.environ["ADMIN_PASSWORD"])))
            cur.execute("SELECT 1 FROM gedung")
            if not cur.fetchone():
                cur.execute("INSERT INTO gedung(nama,kota,alamat,kapasitas,harga_sesi,fasilitas) VALUES"
                  "('Graha Sumut','Medan','Jl. Gatot Subroto',500,15000000,'AC, Parkir luas, Ruang rias, Sound system'),"
                  "('Balai Raya','Medan','Jl. Sisingamangaraja',250,8000000,'AC, Panggung, Parkir')")
            for kat, rows in SEED_KAT.items():
                cur.execute("SELECT 1 FROM gedung WHERE kategori=%s", (kat,))
                if not cur.fetchone():
                    for r in rows:
                        cur.execute("INSERT INTO gedung(nama,kota,alamat,kapasitas,harga_sesi,fasilitas,kategori) "
                                    "VALUES(%s,%s,%s,%s,%s,%s,%s)", r + (kat,))
            c.commit(); c.close(); print("Database Berhasil Diinisialisasi!"); return
        except psycopg2.OperationalError:
            time.sleep(2)

# ---------- Auth ----------
@app.get("/api/me")
def me():
    if "uid" in session:
        return jsonify(user={"nama": session["nama"], "role": session["role"]})
    return jsonify(user=None)

@app.post("/api/register")
def register():
    d = request.get_json() or {}
    if not all(d.get(k) for k in ("nama", "email", "password")) or len(d["password"]) < 6:
        return err("Lengkapi data. Password minimal 6 karakter.")
    try:
        q("INSERT INTO users(nama,email,password) VALUES(%s,%s,%s)",
          (d["nama"], d["email"], generate_password_hash(d["password"])))
    except psycopg2.IntegrityError:
        db().rollback(); return err("Email sudah terdaftar.")
    return jsonify(ok=True)

@app.post("/api/login")
def login():
    d = request.get_json() or {}
    u = q("SELECT * FROM users WHERE email=%s", (d.get("email", ""),), one=True)
    if not u or not check_password_hash(u["password"], d.get("password", "")):
        return err("Email atau password salah.", 401)
    session.update(uid=u["id"], nama=u["nama"], role=u["role"])
    return jsonify(user={"nama": u["nama"], "role": u["role"]})

@app.post("/api/logout")
def logout():
    session.clear(); return jsonify(ok=True)

# ---------- Gedung & booking (user) ----------
@app.get("/api/gedung")
def list_gedung():
    kat = request.args.get("kategori", "")
    cari = "%" + request.args.get("cari", "").strip() + "%"
    try:
        tgl = date.fromisoformat(request.args.get("tanggal", ""))
    except ValueError:
        tgl = date.today()
    return jsonify(q(
        f"SELECT g.*, {len(SESI)} - (SELECT count(*) FROM booking b WHERE b.gedung_id=g.id "
        f"AND b.tanggal=%s AND b.{AKTIF}) AS sisa_sesi, "
        "(SELECT coalesce(round(avg(u.rating),1),0)::float FROM ulasan u WHERE u.gedung_id=g.id AND NOT u.tersembunyi) AS rata_rating, "
        "(SELECT count(*) FROM ulasan u WHERE u.gedung_id=g.id AND NOT u.tersembunyi) AS jml_ulasan "
        "FROM gedung g "
        "WHERE (%s='' OR g.kategori=%s) AND (g.nama ILIKE %s OR g.kota ILIKE %s) ORDER BY g.nama",
        (tgl, kat, kat, cari, cari)))

@app.get("/api/gedung/<int:gid>")
def get_gedung(gid):
    g_ = q("SELECT * FROM gedung WHERE id=%s", (gid,), one=True)
    if not g_: return err("Gedung tidak ditemukan.", 404)
    terisi = q(f"SELECT tanggal::text tanggal, sesi FROM booking WHERE gedung_id=%s AND tanggal>=CURRENT_DATE AND {AKTIF} ORDER BY tanggal", (gid,))
    ulasan = q("SELECT u.id, u.rating, u.komentar, u.balasan, u.dibuat::date::text tanggal, "
               "split_part(us.nama,' ',1) AS nama FROM ulasan u JOIN users us ON us.id=u.user_id "
               "WHERE u.gedung_id=%s AND NOT u.tersembunyi ORDER BY u.id DESC LIMIT 50", (gid,))
    rating = q("SELECT coalesce(round(avg(rating),1),0)::float rata, count(*) jumlah "
               "FROM ulasan WHERE gedung_id=%s AND NOT tersembunyi", (gid,), one=True)
    return jsonify(gedung=g_, terisi=terisi, ulasan=ulasan, rating=rating)

@app.post("/api/gedung/<int:gid>/booking")
def buat_booking(gid):
    if (e := need()): return e
    g_ = q("SELECT * FROM gedung WHERE id=%s", (gid,), one=True)
    if not g_: return err("Gedung tidak ditemukan.", 404)
    return jsonify(ok=True)

# 3. Pemicu otomatis inisialisasi tabel database saat aplikasi pertama kali dijalankan di internet
with app.app_context():
    init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)