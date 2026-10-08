import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, rp } from "../api.js";
import { DEFAULT_IMG, TABS } from "../config.js";

const ikon = (f) => {
  const s = f.toLowerCase();
  if (s.includes("ac")) return "❄️";
  if (s.includes("parkir")) return "🅿️";
  if (s.includes("sound")) return "🔊";
  if (s.includes("panggung")) return "🎤";
  if (s.includes("rias")) return "💄";
  if (s.includes("dapur")) return "🍽️";
  if (s.includes("tenda")) return "⛺";
  return "✔️";
};

export default function Home() {
  const hariIni = new Date().toISOString().slice(0, 10);
  const [kat, setKat] = useState("pernikahan");
  const [cari, setCari] = useState("");
  const [tanggal, setTanggal] = useState(hariIni);
  const [list, setList] = useState([]);

  useEffect(() => {
    const qs = new URLSearchParams({ kategori: kat, cari, tanggal });
    api("/gedung?" + qs).then(setList).catch(() => setList([]));
  }, [kat, cari, tanggal]);

  const tab = TABS.find((t) => t.id === kat);
  const label = new Date(tanggal + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <section className="panel">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={kat === t.id} className={"tab" + (kat === t.id ? " on" : "")} onClick={() => setKat(t.id)}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      <p className="tabdesc">{tab.desc}</p>

      <div className="search">
        <input aria-label="Cari gedung atau kota" placeholder="📍 Cari nama gedung atau kota" value={cari} onChange={(e) => setCari(e.target.value)} />
        <input aria-label="Tanggal acara" type="date" min={hariIni} value={tanggal} onChange={(e) => setTanggal(e.target.value || hariIni)} />
      </div>

      <div className="list">
        {list.map((x) => (
          <article className="gcard" key={x.id}>
            <img src={x.foto_url || DEFAULT_IMG} alt={x.nama} />
            <div className="gbody">
              <h3>{x.nama}</h3>
              {/* [ULASAN] rating rata-rata dan jumlah ulasan */}
              <div className="rate">
                {x.jml_ulasan > 0
                  ? <>⭐ <b>{Number(x.rata_rating).toLocaleString("id-ID", { minimumFractionDigits: 1 })}</b> ({x.jml_ulasan} ulasan)</>
                  : <small>Belum ada ulasan</small>}
              </div>
              <div className="meta">
                <span>📅 {label}</span>
                <span>🕗 08.00 - 23.00</span>
                <span>👥 {x.kapasitas} tamu</span>
                <span className={x.sisa_sesi > 0 ? "ok" : "penuh"}>
                  {x.sisa_sesi > 0 ? `${x.sisa_sesi} dari 3 sesi tersedia` : "Penuh"}
                </span>
              </div>
              <p className="addr">📍 {x.alamat}, {x.kota}</p>
              <hr className="dash" />
              <div className="fas">
                {(x.fasilitas || "").split(",").filter((f) => f.trim()).map((f) => (
                  <span className="chip" key={f}>{ikon(f)} {f.trim()}</span>
                ))}
              </div>
              <hr className="dash" />
              <div className="foot">
                <div>
                  <b className="harga">{rp(x.harga_sesi)}</b> / sesi
                  <small>*Belum termasuk PPN jika berlaku</small>
                </div>
                <Link className={"btn-gold" + (x.sisa_sesi > 0 ? "" : " off")} to={`/gedung/${x.id}?tanggal=${tanggal}`}>Pesan Gedung</Link>
              </div>
            </div>
          </article>
        ))}
        {list.length === 0 && <p>Belum ada gedung yang sesuai untuk kategori ini.</p>}
      </div>
    </section>
  );
}