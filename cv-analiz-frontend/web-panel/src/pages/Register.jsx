import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/api/company/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Kayıt başarısız");

      localStorage.setItem("companyToken", data.token);
      localStorage.setItem("companyData", JSON.stringify(data.company));

      navigate("/");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={bgGlow} />

      <div style={card}>
        <div style={brand}>🏢 CV ANALİZ</div>
        <h2 style={{ margin: "8px 0 4px" }}>Kurumsal Üyelik</h2>
        <p style={sub}>Firmanı oluştur, ilan yayınlamaya başla</p>

        <form onSubmit={submit} style={{ width: "100%" }}>
          <label style={label}>Firma Adı</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn: Test Teknoloji A.Ş."
            style={input}
            required
          />

          <label style={label}>E-posta</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="firma@ornek.com"
            style={input}
            required
          />

          <label style={label}>Şifre</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={input}
            required
          />

          {error && <div style={errorBox}>⚠ {error}</div>}

          <button disabled={loading} style={btn}>
            {loading ? "Oluşturuluyor…" : "Üyelik Oluştur"}
          </button>
        </form>

        <div style={footer}>
          <span style={{ opacity: 0.7 }}>Zaten hesabın var mı?</span>
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={linkBtn}
          >
            Giriş Yap
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== STYLES ===== */

const page = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background:
    "radial-gradient(1200px 600px at 10% -10%, #4f46e5 0%, transparent 60%), radial-gradient(1000px 500px at 110% 10%, #22c55e 0%, transparent 55%), #0b0f1a",
  position: "relative",
  overflow: "hidden",
};

const bgGlow = {
  position: "absolute",
  inset: 0,
  backdropFilter: "blur(6px)",
};

const card = {
  width: 440,
  maxWidth: "92vw",
  background: "rgba(17,24,39,0.85)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 20,
  padding: "28px 26px 24px",
  color: "#fff",
  boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
  zIndex: 1,
};

const brand = {
  fontWeight: 800,
  letterSpacing: 0.4,
  opacity: 0.9,
};

const sub = {
  margin: "0 0 18px",
  opacity: 0.75,
  fontSize: 13,
};

const label = {
  display: "block",
  margin: "12px 0 6px",
  fontSize: 13,
  opacity: 0.85,
};

const input = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  outline: "none",
  background: "rgba(0,0,0,0.35)",
  color: "#fff",
};

const btn = {
  width: "100%",
  marginTop: 16,
  padding: "12px 16px",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  background: "linear-gradient(135deg, #4f46e5, #22c55e)",
  color: "#fff",
  fontWeight: 700,
  letterSpacing: 0.2,
};

const errorBox = {
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(239,68,68,0.15)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#fecaca",
  fontSize: 13,
};

const footer = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
  marginTop: 16,
  fontSize: 13,
};

const linkBtn = {
  background: "transparent",
  border: "none",
  color: "#a5b4fc",
  cursor: "pointer",
  textDecoration: "underline",
};
