import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function Auth({ mode, setUser }) {
  const nav = useNavigate();
  const reg = mode === "register";
  const [f, setF] = useState({ depan: "", belakang: "", email: "", password: "" });
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (reg) {
        await api("/register", "POST", { nama: (f.depan + " " + f.belakang).trim(), email: f.email, password: f.password });
        return nav("/login");
      }
      const d = await api("/login", "POST", { email: f.email, password: f.password });
      setUser(d.user);
      nav(d.user.role === "admin" ? "/admin" : "/");
    } catch (x) {
      setMsg(x.message);
    }
  };

  return (
    <div className="auth">
      <Link to="/" className="auth-logo">Gedung<b>Ku</b></Link>
      <h2>{reg ? "Daftar" : "Masuk"}</h2>
      {msg && <div className="flash">{msg}</div>}
      <form className="line-form" onSubmit={submit}>
        {reg && (
          <>
            <h4>Siapa nama Anda?</h4>
            <input aria-label="Nama depan" placeholder="Nama depan" value={f.depan} onChange={set("depan")} required />
            <input aria-label="Nama belakang" placeholder="Nama belakang" value={f.belakang} onChange={set("belakang")} />
          </>
        )}
        <h4>Email Anda</h4>
        <input aria-label="Email" type="email" placeholder="Alamat email" value={f.email} onChange={set("email")} required />
        <h4>{reg ? "Buat kata sandi" : "Kata sandi"}</h4>
        <input aria-label="Kata sandi" type="password" placeholder="Kata sandi (minimal 6 karakter)" value={f.password} onChange={set("password")} required minLength={6} />
        <button className="btn-gold full">{reg ? "Daftar" : "Masuk"}</button>
      </form>
      <p className="auth-alt">
        {reg ? "Sudah punya akun? " : "Belum punya akun? "}
        <Link to={reg ? "/login" : "/register"}>{reg ? "Masuk" : "Daftar"}</Link>
      </p>
    </div>
  );
}
