import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [positions, setPositions] = useState([]);
  const [title, setTitle] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = () => {
    fetch("http://localhost:3000/api/position")
      .then((r) => r.json())
      .then(setPositions)
      .catch(console.error);
  };

  const savePosition = async () => {
    if (!title) return;

    await fetch("http://localhost:3000/api/position", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, companyId: 1 }),
    });

    setTitle("");
    loadPositions();
  };

  const cancelPosition = async (id) => {
    if (!window.confirm("İlan iptal edilsin mi?")) return;
    alert("Şimdilik sadece UI 😄 backend'e bağlarız");
  };

  return (
    <div style={page}>
      {/* STATS */}
      <div style={statsGrid}>
        <StatBox title="Pozisyon" value={positions.length} color="#ff5252" />
        <StatBox title="Başvuru" value="0" color="#03a9f4" />
        <StatBox title="Ortalama Skor" value="—" color="#8bc34a" />
        <StatBox title="Aktif İlan" value={positions.length} color="#9c27b0" />
      </div>

      {/* CREATE */}
      <div style={createBox}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Yeni ilan aç"
          style={input}
        />
        <button onClick={savePosition} style={btn}>
          Kaydet
        </button>
      </div>

      <h3 style={{ color: "#fff", marginBottom: 12 }}>Açık Pozisyonlar</h3>

      <div style={posGrid}>
        {positions.map((p) => (
          <div key={p.id} style={card}>
            <h4 style={{ marginBottom: 6 }}>{p.title}</h4>
            <small style={{ opacity: 0.7 }}>
              {new Date(p.createdAt).toLocaleDateString("tr-TR")}
            </small>

            <div style={cardBtns}>
              <button
                style={viewBtn}
                onClick={() => navigate(`/applications/${p.id}`)}
              >
                Başvurular
              </button>

              <button style={cancelBtn} onClick={() => cancelPosition(p.id)}>
                İptal Et
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBox({ title, value, color }) {
  return (
    <div style={{ ...statBox, background: color }}>
      <h4>{title}</h4>
      <b style={{ fontSize: 26 }}>{value}</b>
    </div>
  );
}

/* ===== STYLES ===== */

const page = {
  minHeight: "100%",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4,1fr)",
  gap: 20,
  marginBottom: 22,
};

const statBox = {
  color: "#fff",
  padding: 22,
  borderRadius: 18,
};

const createBox = {
  display: "flex",
  gap: 12,
  marginBottom: 26,
};

const input = {
  width: "50%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  outline: "none",
  background: "rgba(0,0,0,0.35)",
  color: "#fff",
};

const btn = {
  background: "linear-gradient(135deg, #4f46e5, #22c55e)",
  color: "#fff",
  border: "none",
  padding: "12px 20px",
  borderRadius: 14,
  cursor: "pointer",
};

const posGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
  gap: 18,
};

const card = {
  background: "rgba(17,24,39,0.85)",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: 16,
  borderRadius: 18,
  color: "#fff",
};

const cardBtns = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 14,
};

const viewBtn = {
  background: "linear-gradient(135deg, #6366f1, #22c55e)",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: 10,
  cursor: "pointer",
};

const cancelBtn = {
  background: "rgba(239,68,68,0.15)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#fecaca",
  padding: "6px 12px",
  borderRadius: 10,
  cursor: "pointer",
};
