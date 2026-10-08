import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, rp } from "../api.js";
import { TABS, DEFAULT_IMG } from "../config.js";

const namaKategori = (id) => TABS.find((t) => t.id === id)?.label || id;
const STATUS = ["menunggu", "disetujui", "ditolak", "dibatalkan"];
const huruf = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const urutan = (s) => (s === "menunggu" ? 0 : 1);

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const tgl = (s) => {
  const [y, m, d] = String(s).split("-");
  return BULAN[Number(m) - 1] ? `${d} ${BULAN[Number(m) - 1]} ${y}` : s;
};
const JAM = { pagi: "08.00-12.00", siang: "13.00-17.00", malam: "19.00-23.00" };

export default function Admin({ user }) {
  const [d, setD] = useState(null);
  const [fStatus, setFStatus] = useState("semua");
  const [fKategori, setFKategori] = useState("semua");
  const [cari, setCari] = useState("");
  const [cariGedung, setCariGedung] = useState("");
  const [batas, setBatas] = useState(10);
  const [notif, setNotif] = useState(null);

  const load = () => api("/admin/summary").then(setD).catch(() => {});
  useEffect(() => { if (user?.role === "admin") load(); }, [user]);
  useEffect(() => {
    if (!notif) return;
    const t = setTimeout(() => setNotif(null), 4000);
    return () => clearTimeout(t);
  }, [notif]);

  if (!user || user.role !== "admin") return <Navigate to="/login" />;
  if (!d) return <p>Memuat...</p>;

  const tampilNotif = (teks, jenis = "ok") => setNotif({ teks, jenis });
  const ubahStatus = (v) => { setFStatus(v); setBatas(10); };
  const ubahKategori = (v) => { setFKategori(v); setBatas(10); };
  const ubahCari = (v) => { setCari(v); setBatas(10); };

  const aksi = async (r, a, alasan) => {
    try {
      await api(`/admin/booking/${r.id}/${a}`, "POST", a === "tolak" ? { alasan } : undefined);
      tampilNotif(`Pesanan ${r.pemesan} ${a === "setujui" ? "disetujui" : "ditolak"}.`);
      load();
    } catch (e) {
      tampilNotif(e.message || "Gagal memproses pesanan.", "gagal");
    }
  };
  const proses = (r, a) => {
    const info = `pesanan ${r.pemesan} untuk ${r.gedung} (${tgl(r.tanggal)}, sesi ${r.sesi})`;
    if (a === "setujui") {
      if (!confirm(`Setujui ${info}?`)) return;
      return aksi(r, a);
    }
    const alasan = prompt(`Tolak ${info}.\n\nTulis alasan penolakan (boleh dikosongkan). Alasan ini akan terlihat oleh pemesan:`);
    if (alasan === null) return; // admin menekan Cancel
    aksi(r, a, alasan);
  };
  const hapus = async (x) => {
    const terkait = d.booking.filter((r) => r.gedung === x.nama);
    const disetujui = terkait.filter((r) => r.status === "disetujui").length;
    const pesan = terkait.length === 0
      ? `Hapus gedung "${x.nama}"?`
      : `Gedung "${x.nama}" punya ${terkait.length} pesanan (${disetujui} disetujui). ` +
        `Menghapus gedung ini akan menghapus SEMUA pesanan tersebut secara permanen. Lanjutkan?`;
    if (!confirm(pesan)) return;
    try {
      await api("/admin/gedung/" + x.id, "DELETE");
      tampilNotif(`Gedung "${x.nama}" dihapus.`);
      load();
    } catch (e) {
      tampilNotif(e.message || "Gagal menghapus gedung.", "gagal");
    }
  };

  const idKategori = (namaGedung) => d.gedung.find((g) => g.nama === namaGedung)?.kategori;
  const kategoriDari = (namaGedung) => namaKategori(idKategori(namaGedung));

  // Statistik tambahan (dihitung dari data pesanan yang sudah ada)
  const perStatus = STATUS.reduce(
    (o, s) => ({ ...o, [s]: d.booking.filter((r) => r.status === s).length }), {});
  const perKategori = TABS.map((t) => {
    const rows = d.booking.filter((r) => idKategori(r.gedung) === t.id);
    const omzet = rows.filter((r) => r.status === "disetujui")
      .reduce((a, r) => a + Number(r.total), 0);
    return { ...t, jumlah: rows.length, omzet };
  });

  // Filter pesanan, pesanan "menunggu" selalu di paling atas
  const kata = cari.trim().toLowerCase();
  const tampil = d.booking
    .filter((r) =>
      (fStatus === "semua" || r.status === fStatus) &&
      (fKategori === "semua" || idKategori(r.gedung) === fKategori) &&
      (!kata || (r.pemesan || "").toLowerCase().includes(kata) || (r.pemesan_email || "").toLowerCase().includes(kata) || (r.gedung || "").toLowerCase().includes(kata)))
    .sort((a, b) => urutan(a.status) - urutan(b.status));
  const terlihat = tampil.slice(0, batas);

  // Pencarian gedung
  const kg = cariGedung.trim().toLowerCase();
  const gedungTampil = d.gedung.filter((x) =>
    !kg || [x.nama, x.kota, namaKategori(x.kategori)].some((v) => (v || "").toLowerCase().includes(kg)));

  return (
    <>
      {notif && <div className={"toast " + notif.jenis} role="status">{notif.teks}</div>}
      <div className="lebar">
        <h1>Dashboard admin</h1>
        <div className="stats">
          <div className="card">Gedung<h2>{d.stats.gedung}</h2></div>
          <div
            className={"card klik" + (d.stats.menunggu > 0 ? " perhatian" : "")}
            onClick={() => ubahStatus("menunggu")}
            title="Klik untuk menampilkan pesanan yang menunggu"
          >
            Menunggu persetujuan<h2>{d.stats.menunggu}</h2>
          </div>
          <div className="card">Pendapatan disetujui<h2>{rp(d.stats.omzet)}</h2></div>
        </div>
        <div className="stats">
          <div className="card">Disetujui<h2>{perStatus.disetujui}</h2></div>
          <div className="card">Ditolak<h2>{perStatus.ditolak}</h2></div>
          <div className="card">Dibatalkan<h2>{perStatus.dibatalkan}</h2></div>
        </div>

        <h3>Ringkasan per kategori</h3>
        <div className="stats">
          {perKategori.map((k) => (
            <div className="card" key={k.id}>
              {k.icon} {k.label}
              <h2>{k.jumlah} pesanan</h2>
              <small>Pendapatan {rp(k.omzet)}</small>
            </div>
          ))}
        </div>

        <h2>Pesanan</h2>
        <div className="filter">
          <input placeholder="Cari pemesan, email, atau gedung..." value={cari}
            onChange={(e) => ubahCari(e.target.value)} />
          <select value={fStatus} onChange={(e) => ubahStatus(e.target.value)}>
            <option value="semua">Semua status</option>
            {STATUS.map((s) => <option key={s} value={s}>{huruf(s)}</option>)}
          </select>
          <select value={fKategori} onChange={(e) => ubahKategori(e.target.value)}>
            <option value="semua">Semua kategori</option>
            {TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <p className="hasil">
          Menampilkan {terlihat.length} dari {tampil.length} pesanan
          {tampil.length !== d.booking.length ? ` (total ${d.booking.length})` : ""}
        </p>

        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>Pemesan</th><th>Gedung</th><th>Kategori</th><th>Acara</th>
                <th>Tanggal</th><th>Sesi</th><th>Total</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {terlihat.map((r) => (
                <tr key={r.id} className={r.status === "menunggu" ? "menunggu-row" : ""}>
                  <td>{r.pemesan}<small className="kontak">{r.pemesan_email}</small></td>
                  <td>{r.gedung}</td>
                  <td>{kategoriDari(r.gedung)}</td>
                  <td>{r.jenis_acara}</td>
                  <td>{tgl(r.tanggal)}</td>
                  <td>{huruf(r.sesi)}<small className="jam">{JAM[r.sesi]}</small></td>
                  <td>{rp(r.total)}</td>
                  <td>
                    <span className={"badge " + r.status}>{r.status}</span>
                    {r.status === "ditolak" && r.alasan && <small className="kontak">Alasan: {r.alasan}</small>}
                  </td>
                  <td className="aksi">
                    {r.status === "menunggu" && (
                      <>
                        <button className="aksi-ok" onClick={() => proses(r, "setujui")}>Setujui</button>
                        <button className="aksi-no" onClick={() => proses(r, "tolak")}>Tolak</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {tampil.length === 0 && (
                <tr><td colSpan="9">{d.booking.length === 0 ? "Belum ada pesanan." : "Tidak ada pesanan yang cocok dengan filter."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {tampil.length > batas && (
          <p><button className="btn alt" onClick={() => setBatas(batas + 10)}>
            Tampilkan lebih banyak ({tampil.length - batas} lagi)
          </button></p>
        )}

        <h2>Gedung</h2>
        <div className="filter">
          <input placeholder="Cari nama, kota, atau kategori gedung..." value={cariGedung}
            onChange={(e) => setCariGedung(e.target.value)} />
        </div>
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Foto</th><th>Nama</th><th>Kategori</th><th>Kota</th><th>Kapasitas</th><th>Harga</th><th></th></tr>
            </thead>
            <tbody>
              {gedungTampil.map((x) => (
                <tr key={x.id}>
                  <td><img className="thumb" src={x.foto_url || DEFAULT_IMG} alt={x.nama} /></td>
                  <td>{x.nama}</td>
                  <td>{namaKategori(x.kategori)}</td>
                  <td>{x.kota}</td>
                  <td>{x.kapasitas}</td>
                  <td>{rp(x.harga_sesi)}</td>
                  <td className="aksi">
                    <Link className="aksi-edit" to={"/admin/gedung/" + x.id}>Ubah</Link>
                    <button className="aksi-no" onClick={() => hapus(x)}>Hapus</button>
                  </td>
                </tr>
              ))}
              {gedungTampil.length === 0 && <tr><td colSpan="7">Tidak ada gedung yang cocok.</td></tr>}
            </tbody>
          </table>
        </div>
        <p><Link className="btn alt" to="/admin/gedung/0">Tambah gedung</Link></p>
      </div>
    </>
  );
}