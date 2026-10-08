import { Fragment, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, rp } from "../api.js";
import { Bintang, PilihBintang } from "../Bintang.jsx"; // [ULASAN]

export default function Riwayat({ user }) {
  const [rows, setRows] = useState([]);
  const [buka, setBuka] = useState(null); // [ULASAN] id pesanan yang form ulasannya terbuka
  const [fu, setFu] = useState({ rating: 0, komentar: "" });
  const [msg, setMsg] = useState("");
  const load = () => api("/riwayat").then(setRows).catch(() => {});
  useEffect(() => { if (user) load(); }, [user]);

  if (!user) return <Navigate to="/login" />;

  const batal = async (id) => {
    await api(`/booking/${id}/batal`, "POST");
    load();
  };

  const kirimUlasan = async (e, id) => {
    e.preventDefault();
    if (!fu.rating) return setMsg("Pilih rating bintang terlebih dahulu.");
    try {
      await api(`/booking/${id}/ulasan`, "POST", fu);
      setBuka(null); setFu({ rating: 0, komentar: "" }); setMsg("");
      load();
    } catch (x) {
      setMsg(x.message);
    }
  };

  return (
    <>
      <h1>Pesanan saya</h1>
      <div className="tbl">
        <table>
          <thead>
            <tr><th>Gedung</th><th>Acara</th><th>Tanggal</th><th>Sesi</th><th>Total</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr>
                  <td>{r.gedung}</td><td>{r.jenis_acara}</td><td>{r.tanggal}</td><td>{r.sesi}</td>
                  <td>{rp(r.total)}</td><td>{r.status}</td>
                  <td>
                    {r.status === "menunggu" && <a href="#batal" onClick={(e) => { e.preventDefault(); batal(r.id); }}>Batalkan</a>}
                    {r.ulasan_id && <Bintang nilai={r.rating} />}
                    {r.bisa_ulas && !r.ulasan_id && (
                      <a href="#ulas" onClick={(e) => { e.preventDefault(); setMsg(""); setBuka(buka === r.id ? null : r.id); }}>Beri ulasan</a>
                    )}
                  </td>
                </tr>
                {buka === r.id && (
                  <tr>
                    <td colSpan="7">
                      <form onSubmit={(e) => kirimUlasan(e, r.id)}>
                        <b>Bagaimana pengalaman Anda di {r.gedung}?</b>
                        <PilihBintang value={fu.rating} onChange={(n) => setFu({ ...fu, rating: n })} />
                        <textarea rows="3" maxLength="1000" placeholder="Ceritakan pengalaman Anda (opsional)"
                          value={fu.komentar} onChange={(e) => setFu({ ...fu, komentar: e.target.value })} />
                        {msg && <div className="flash">{msg}</div>}
                        <button className="btn-gold">Kirim ulasan</button>
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {rows.length === 0 && <tr><td colSpan="7">Belum ada pesanan.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}