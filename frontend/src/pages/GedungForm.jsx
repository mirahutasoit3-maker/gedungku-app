import { useEffect, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { api } from "../api.js";
import { TABS } from "../config.js";

const FIELDS = [
  ["nama", "Nama", "text"], ["kota", "Kota", "text"], ["alamat", "Alamat", "text"],
  ["kapasitas", "Kapasitas", "number"], ["harga_sesi", "Harga per sesi (Rp)", "number"],
  ["fasilitas", "Fasilitas (pisahkan dengan koma)", "text"], ["foto_url", "URL foto", "text"],
];

export default function GedungForm({ user }) {
  const { id } = useParams();
  const nav = useNavigate();
  const baru = id === "0";
  const [f, setF] = useState({ kategori: "pernikahan" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!baru) api("/gedung/" + id).then((d) => setF(d.gedung)).catch((x) => setMsg(x.message));
  }, [id]);

  if (!user || user.role !== "admin") return <Navigate to="/login" />;

  const simpan = async (e) => {
    e.preventDefault();
    try {
      await (baru ? api("/admin/gedung", "POST", f) : api("/admin/gedung/" + id, "PUT", f));
      nav("/admin");
    } catch (x) {
      setMsg(x.message);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2>{baru ? "Tambah" : "Ubah"} gedung</h2>
      {msg && <div className="flash">{msg}</div>}
      <form onSubmit={simpan}>
        <label>Kategori acara
          <select value={f.kategori || "pernikahan"} onChange={(e) => setF({ ...f, kategori: e.target.value })}>
            {TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        {FIELDS.map(([k, label, type]) => (
          <label key={k}>{label}
            <input type={type} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })}
                   required={["nama", "kapasitas", "harga_sesi"].includes(k)} />
          </label>
        ))}
        <button className="btn-gold">Simpan gedung</button>
      </form>
    </div>
  );
}
