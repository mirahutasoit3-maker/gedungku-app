import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, rp } from "../api.js";
import { Bintang } from "../Bintang.jsx"; // [ULASAN]

export default function Admin({ user }) {
  const [d, setD] = useState(null);
  const load = () => api("/admin/summary").then(setD).catch(() => {});
  useEffect(() => { if (user?.role === "admin") load(); }, [user]);

  if (!user || user.role !== "admin") return <Navigate to="/login" />;
  if (!d) return <p>Memuat...</p>;

  const aksi = async (id, a) => { await api(`/admin/booking/${id}/${a}`, "POST"); load(); };
  const hapus = async (id) => {
    if (!confirm("Hapus gedung ini?")) return;
    await api("/admin/gedung/" + id, "DELETE");
    load();
  };
  // [ULASAN] moderasi
  const sembunyi = async (id) => { await api(`/admin/ulasan/${id}/sembunyikan`, "POST"); load(); };
  const balas = async (id, lama) => {
    const t = prompt("Tulis balasan untuk ulasan ini:", lama || "");
    if (t === null) return;
    await api(`/admin/ulasan/${id}/balas`, "POST", { balasan: t });
    load();
  };

  return (
    <>
      <h1>Dashboard admin</h1>
      <div className="stats">
        <div className="card">Gedung<h2>{d.stats.gedung}</h2></div>
        <div className="card">Menunggu persetujuan<h2>{d.stats.menunggu}</h2></div>
        <div className="card">Pendapatan disetujui<h2>{rp(d.stats.omzet)}</h2></div>
      </div>

      <h2>Pesanan</h2>
      <div className="tbl">
        <table>
          <thead><tr><th>Pemesan</th><th>Gedung</th><th>Tanggal</th><th>Sesi</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {d.booking.map((r) => (
              <tr key={r.id}>
                <td>{r.pemesan}</td><td>{r.gedung}</td><td>{r.tanggal}</td><td>{r.sesi}</td><td>{r.status}</td>
                <td>
                  {r.status === "menunggu" && (
                    <>
                      <a href="#setujui" onClick={(e) => { e.preventDefault(); aksi(r.id, "setujui"); }}>Setujui</a>
                      {" | "}
                      <a href="#tolak" onClick={(e) => { e.preventDefault(); aksi(r.id, "tolak"); }}>Tolak</a>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {d.booking.length === 0 && <tr><td colSpan="6">Belum ada pesanan.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* [ULASAN] tabel moderasi ulasan */}
      <h2>Ulasan</h2>
      <div className="tbl">
        <table>
          <thead><tr><th>Gedung</th><th>Pemesan</th><th>Rating</th><th>Komentar</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {(d.ulasan || []).map((u) => (
              <tr key={u.id}>
                <td>{u.gedung}</td><td>{u.pemesan}</td><td><Bintang nilai={u.rating} /></td>
                <td>{u.komentar}{u.balasan && <><br /><small>↳ Balasan: {u.balasan}</small></>}</td>
                <td>{u.tersembunyi ? "Disembunyikan" : "Tampil"}</td>
                <td>
                  <a href="#balas" onClick={(e) => { e.preventDefault(); balas(u.id, u.balasan); }}>Balas</a>
                  {" | "}
                  <a href="#sembunyi" onClick={(e) => { e.preventDefault(); sembunyi(u.id); }}>{u.tersembunyi ? "Tampilkan" : "Sembunyikan"}</a>
                </td>
              </tr>
            ))}
            {(d.ulasan || []).length === 0 && <tr><td colSpan="6">Belum ada ulasan.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2>Gedung</h2>
      <div className="tbl">
        <table>
          <thead><tr><th>Nama</th><th>Kapasitas</th><th>Harga</th><th></th></tr></thead>
          <tbody>
            {d.gedung.map((x) => (
              <tr key={x.id}>
                <td>{x.nama}</td><td>{x.kapasitas}</td><td>{rp(x.harga_sesi)}</td>
                <td>
                  <Link to={"/admin/gedung/" + x.id}>Ubah</Link>
                  {" | "}
                  <a href="#hapus" onClick={(e) => { e.preventDefault(); hapus(x.id); }}>Hapus</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p><Link className="btn alt" to="/admin/gedung/0">Tambah gedung</Link></p>
    </>
  );
}