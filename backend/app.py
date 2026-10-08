import os, time
from datetime import date
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, g, jsonify, request, session
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.environ["SECRET_KEY"]
SESI = ["pagi", "siang", "malam"]
KATEGORI = ("pernikahan", "adat", "ulang_tahun")
AKTIF = "status IN ('menunggu','disetujui')"

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
ALTER TABLE booking ADD COLUMN IF NOT EXISTS alasan TEXT;
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
            c.commit(); c.close(); return
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
        f"AND b.tanggal=%s AND b.{AKTIF}) AS sisa_sesi FROM gedung g "
        "WHERE (%s='' OR g.kategori=%s) AND (g.nama ILIKE %s OR g.kota ILIKE %s) ORDER BY g.nama",
        (tgl, kat, kat, cari, cari)))

@app.get("/api/gedung/<int:gid>")
def get_gedung(gid):
    g_ = q("SELECT * FROM gedung WHERE id=%s", (gid,), one=True)
    if not g_: return err("Gedung tidak ditemukan.", 404)
    terisi = q(f"SELECT tanggal::text tanggal, sesi FROM booking WHERE gedung_id=%s AND tanggal>=CURRENT_DATE AND {AKTIF} ORDER BY tanggal", (gid,))
    return jsonify(gedung=g_, terisi=terisi)

@app.post("/api/gedung/<int:gid>/booking")
def buat_booking(gid):
    if (e := need()): return e
    g_ = q("SELECT * FROM gedung WHERE id=%s", (gid,), one=True)
    if not g_: return err("Gedung tidak ditemukan.", 404)
    d = request.get_json() or {}
    try:
        tgl = date.fromisoformat(d.get("tanggal", ""))
    except ValueError:
        return err("Tanggal tidak valid.")
    if d.get("sesi") not in SESI or tgl < date.today():
        return err("Tanggal atau sesi tidak valid.")
    if q(f"SELECT 1 FROM booking WHERE gedung_id=%s AND tanggal=%s AND sesi=%s AND {AKTIF}", (gid, tgl, d["sesi"]), one=True):
        return err("Sesi ini sudah dipesan. Pilih tanggal atau sesi lain.", 409)
    try:
        q("INSERT INTO booking(user_id,gedung_id,jenis_acara,tanggal,sesi,total) VALUES(%s,%s,%s,%s,%s,%s)",
          (session["uid"], gid, d.get("jenis_acara", "Lainnya"), tgl, d["sesi"], g_["harga_sesi"]))
    except psycopg2.IntegrityError:
        db().rollback(); return err("Sesi ini baru saja dipesan orang lain.", 409)
    return jsonify(ok=True)

@app.get("/api/riwayat")
def riwayat():
    if (e := need()): return e
    return jsonify(q("SELECT b.id, b.jenis_acara, b.tanggal::text tanggal, b.sesi, b.total, b.status, b.alasan, g.nama gedung "
                     "FROM booking b JOIN gedung g ON g.id=b.gedung_id WHERE b.user_id=%s ORDER BY b.id DESC", (session["uid"],)))

@app.post("/api/booking/<int:bid>/batal")
def batal(bid):
    if (e := need()): return e
    q("UPDATE booking SET status='dibatalkan' WHERE id=%s AND user_id=%s AND status='menunggu'", (bid, session["uid"]))
    return jsonify(ok=True)

# ---------- Admin ----------
@app.get("/api/admin/summary")
def admin_summary():
    if (e := need(True)): return e
    s = q("SELECT (SELECT count(*) FROM gedung) gedung, (SELECT count(*) FROM booking WHERE status='menunggu') menunggu, "
          "(SELECT coalesce(sum(total),0)::bigint FROM booking WHERE status='disetujui') omzet", one=True)
    rows = q("SELECT b.id, b.jenis_acara, b.tanggal::text tanggal, b.sesi, b.total, b.status, b.alasan, g.nama gedung, u.nama pemesan, u.email pemesan_email "
             "FROM booking b JOIN gedung g ON g.id=b.gedung_id JOIN users u ON u.id=b.user_id ORDER BY b.id DESC")
    return jsonify(stats=s, booking=rows, gedung=q("SELECT * FROM gedung ORDER BY id"))

def gedung_values(d):
    return (d.get("nama"), d.get("kota"), d.get("alamat"), int(d.get("kapasitas") or 0),
            int(d.get("harga_sesi") or 0), d.get("fasilitas"), d.get("foto_url"),
            d.get("kategori") if d.get("kategori") in KATEGORI else "pernikahan")

@app.post("/api/admin/gedung")
def tambah_gedung():
    if (e := need(True)): return e
    q("INSERT INTO gedung(nama,kota,alamat,kapasitas,harga_sesi,fasilitas,foto_url,kategori) VALUES(%s,%s,%s,%s,%s,%s,%s,%s)",
      gedung_values(request.get_json() or {}))
    return jsonify(ok=True)

@app.put("/api/admin/gedung/<int:gid>")
def ubah_gedung(gid):
    if (e := need(True)): return e
    q("UPDATE gedung SET nama=%s,kota=%s,alamat=%s,kapasitas=%s,harga_sesi=%s,fasilitas=%s,foto_url=%s,kategori=%s WHERE id=%s",
      gedung_values(request.get_json() or {}) + (gid,))
    return jsonify(ok=True)

@app.delete("/api/admin/gedung/<int:gid>")
def hapus_gedung(gid):
    if (e := need(True)): return e
    q("DELETE FROM gedung WHERE id=%s", (gid,)); return jsonify(ok=True)

@app.post("/api/admin/booking/<int:bid>/<aksi>")
def aksi_booking(bid, aksi):
    if (e := need(True)): return e
    st = {"setujui": "disetujui", "tolak": "ditolak"}.get(aksi)
    if not st: return err("Aksi tidak dikenal.", 404)
    alasan = None
    if aksi == "tolak":
        alasan = ((request.get_json(silent=True) or {}).get("alasan") or "").strip()[:300] or None
    q("UPDATE booking SET status=%s, alasan=%s WHERE id=%s", (st, alasan, bid)); return jsonify(ok=True)

init_db()