import { Outlet, useNavigate } from "react-router-dom";

export default function Layout() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div style={wrap}>
      {/* SIDEBAR */}
      <aside style={sidebar}>
        <div>
          {/* LOGO + SUBTITLE */}
          <div style={{ marginBottom: 22 }}>
            <h2 style={logo}>🏢 CV ANALİZ</h2>
            <div style={subtitle}>Kurumsal Panel V1</div>
          </div>

          <nav style={menu}>
            <MenuBtn text="Dashboard" onClick={() => navigate("/")} />
            <MenuBtn text="Başvurular" onClick={() => navigate("/applications")} />
            <MenuBtn text="Pozisyonlar" onClick={() => navigate("/")} />
            <MenuBtn text="Ayarlar" onClick={() => alert("Yakında 😎")} />
          </nav>
        </div>

        {/* LOGOUT ALT SABİT */}
        <button onClick={logout} style={logoutBtn}>
          🚪 Çıkış Yap
        </button>
      </aside>

      {/* MAIN */}
      <main style={main}>
        <Outlet />
      </main>
    </div>
  );
}

/* UI */

function MenuBtn({ text, onClick }) {
  return (
    <button onClick={onClick} style={menuBtn}>
      {text}
    </button>
  );
}

/* STYLES */

const wrap = {
  minHeight: "100vh",
  display: "flex",
  background:
    "radial-gradient(1200px 600px at 0% -10%, #4f46e5 0%, transparent 60%), radial-gradient(1000px 500px at 110% 10%, #22c55e 0%, transparent 55%), #050914",
};

const sidebar = {
  width: 230,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const logo = {
  color: "#fff",
  marginBottom: 4,
};

const subtitle = {
  fontSize: 12,
  opacity: 0.7,
  color: "#c7d2fe",
};

const menu = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const menuBtn = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: 12,
  cursor: "pointer",
  textAlign: "left",
};

const logoutBtn = {
  background: "rgba(239,68,68,0.15)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#fecaca",
  padding: "10px",
  borderRadius: 12,
  cursor: "pointer",
};

const main = {
  flex: 1,
  padding: 24,
  overflowY: "auto",
};
