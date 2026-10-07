import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, rp } from "../api.js";

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
