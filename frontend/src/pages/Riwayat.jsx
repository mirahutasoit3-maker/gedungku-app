import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, rp } from "../api.js";

export default function Riwayat({ user }) {
  const [rows, setRows] = useState([]);
  const load = () => api("/riwayat").then(setRows).catch(() => {});
  useEffect(() => { if (user) load(); }, [user]);

  if (!user) return <Navigate to="/login" />;

  const batal = async (id) => {
    await api(`/booking/${id}/batal`, "POST");
    load();
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
              <tr key={r.id}>
                <td>{r.gedung}</td><td>{r.jenis_acara}</td><td>{r.tanggal}</td><td>{r.sesi}</td>
                <td>{rp(r.total)}</td><td>{r.status}</td>
                <td>{r.status === "menunggu" && <a href="#batal" onClick={(e) => { e.preventDefault(); batal(r.id); }}>Batalkan</a>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="7">Belum ada pesanan.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
