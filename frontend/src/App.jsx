import { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { api } from "./api.js";
import Home from "./pages/Home.jsx";
import Auth from "./pages/Auth.jsx";
import Detail from "./pages/Detail.jsx";
import Riwayat from "./pages/Riwayat.jsx";
import Admin from "./pages/Admin.jsx";
import GedungForm from "./pages/GedungForm.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const nav = useNavigate();
  const { pathname } = useLocation();
  const home = pathname === "/";
  const auth = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    api("/me").then((d) => setUser(d.user)).catch(() => {}).finally(() => setReady(true));
  }, []);

  const logout = async () => {
    await api("/logout", "POST");
    setUser(null);
    nav("/");
  };

  if (!ready) return null;

  const bar = (
      <nav>
        <Link className="brand" to="/">Gedung<b>Ku</b></Link>
        {user ? (
          <>
            {user.role === "admin" ? <Link to="/admin">Dashboard admin</Link> : <Link to="/riwayat">Pesanan saya</Link>}
            <span className="akun">Halo, {user.nama}</span>
            <a href="#keluar" onClick={(e) => { e.preventDefault(); logout(); }}>Keluar</a>
          </>
        ) : (
          <>
            <Link to="/login">Masuk</Link>
            <Link to="/register">Daftar</Link>
          </>
        )}
      </nav>
  );

  return (
    <>
      {!auth && (home ? (
        <header className="hero">
          {bar}
          <div className="hero-text">
            <h1>Sewa gedung untuk setiap momen berharga</h1>
            <p>Pernikahan, upacara adat dan duka, hingga pesta ulang tahun. Pilih gedung, cek jadwal, dan pesan tanpa bentrok.</p>
          </div>
        </header>
      ) : bar)}
      <main className={home || auth ? "" : "wrap"}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Auth mode="login" setUser={setUser} />} />
          <Route path="/register" element={<Auth mode="register" setUser={setUser} />} />
          <Route path="/gedung/:id" element={<Detail user={user} />} />
          <Route path="/riwayat" element={<Riwayat user={user} />} />
          <Route path="/admin" element={<Admin user={user} />} />
          <Route path="/admin/gedung/:id" element={<GedungForm user={user} />} />
        </Routes>
      </main>
    </>
  );
}
