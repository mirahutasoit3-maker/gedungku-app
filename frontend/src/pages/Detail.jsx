import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api, rp } from "../api.js";
import { DEFAULT_IMG, TABS } from "../config.js";

const SESI = [["pagi", "Pagi (08.00 - 12.00)"], ["siang", "Siang (13.00 - 17.00)"], ["malam", "Malam (19.00 - 23.00)"]];

export default function Detail({ user }) {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ jenis_acara: "", tanggal: sp.get("tanggal") || "", sesi: "pagi" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const load = () => api("/gedung/" + id).then((r) => {
    setD(r);
    const acara = (TABS.find((t) => t.id === r.gedung.kategori) || TABS[0]).acara;
    setF((p) => ({ ...p, jenis_acara: p.jenis_acara || acara[0] }));
  }).catch((x) => setMsg(x.message));
  useEffect(() => { load(); }, [id]);

  const kirim = async (e) => {
    e.preventDefault();
    if (!user) return nav("/login");
    try {
      await api(`/gedung/${id}/booking`, "POST", f);
      nav("/riwayat");
    } catch (x) {
      setMsg(x.message);
      load();
    }
  };

  if (!d) return <p>{msg || "Memuat..."}</p>;
  const g = d.gedung;
  const acara = (TABS.find((t) => t.id === g.kategori) || TABS[0]).acara;

  return (
    <>
      <img className="cover" src={g.foto_url || DEFAULT_IMG} alt={g.nama} />
      <h1>{g.nama}</h1>
      <p>{g.alamat}, {g.kota} · {g.kapasitas} tamu</p>
      <p>Fasilitas: {g.fasilitas}</p>
      <p className="price">{rp(g.harga_sesi)} / sesi</p>
      {msg && <div className="flash">{msg}</div>}
      <div className="grid">
        <div className="card">
          <h3>Pesan gedung</h3>
          <form onSubmit={kirim}>
            <label>Jenis acara
              <select value={f.jenis_acara} onChange={set("jenis_acara")}>
                {acara.map((a) => <option key={a}>{a}</option>)}
              </select>
            </label>
            <label>Tanggal
              <input type="date" min={today} value={f.tanggal} onChange={set("tanggal")} required />
            </label>
            <label>Sesi
              <select value={f.sesi} onChange={set("sesi")}>
                {SESI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <button className="btn-gold">Kirim pesanan</button>
          </form>
        </div>
        <div className="card">
          <h3>Sudah dipesan</h3>
          {d.terisi.map((t, i) => <p key={i}>{t.tanggal} · sesi {t.sesi}</p>)}
          {d.terisi.length === 0 && <p>Belum ada jadwal terisi.</p>}
        </div>
      </div>
    </>
  );
}
