import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function Applications() {
  const { positionId } = useParams();
  const navigate = useNavigate();

  const [apps, setApps] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("companyToken");
    if (!token) {
      navigate("/login");
      return;
    }
    load();
  }, [positionId]);

  const load = () => {
    const token = localStorage.getItem("companyToken");

    let url = "http://localhost:3000/api/applications";

    if (positionId) {
      url = `http://localhost:3000/api/application/${positionId}`;
    }

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        console.log("APPLICATIONS:", data);
        setApps(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .catch(console.error);
  };

  // ✅✅✅ STATUS BACKEND'E GİDİYOR
  const setStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("companyToken");

      await fetch(`http://localhost:3000/api/application/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      load(); // tekrar çek → UI güncellensin
    } catch (err) {
      console.error(err);
      alert("Durum güncellenemedi");
    }
  };

  return (
    <div style={page}>
      {/* LEFT LIST */}
      <div style={left}>
        <div style={leftHeader}>
          <button onClick={() => navigate("/")} style={backBtn}>
            ← Dashboard
          </button>
          <h3>Başvurular</h3>
        </div>

        {apps.map((a) => (
          <div
            key={a.id}
            style={{
              ...card,
              borderLeft:
                selected?.id === a.id
                  ? "4px solid #4f46e5"
                  : "4px solid transparent",
            }}
          >
            <div onClick={() => setSelected(a)} style={{ cursor: "pointer" }}>
              <b>{a.name || "Aday"}</b>
              <small>{new Date(a.createdAt).toLocaleDateString("tr-TR")}</small>
            </div>

            <div style={miniBtns}>
              <button style={eyeBtn} onClick={() => setSelected(a)}>👁</button>
              <button style={redBtn} onClick={() => setStatus(a.id, "red")}>🔴</button>
              <button style={yellowBtn} onClick={() => setStatus(a.id, "review")}>🟡</button>
              <button style={greenBtn} onClick={() => setStatus(a.id, "invite")}>🟢</button>
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT DETAIL */}
      <div style={right}>
        {!selected ? (
          <h3>Başvuru seçiniz</h3>
        ) : (
          <>
            <div style={detailHeader}>
              <div>
                <h2>{selected.name || "Aday"}</h2>
                <small>
                  Başvuru Tarihi:{" "}
                  {new Date(selected.createdAt).toLocaleDateString("tr-TR")}
                </small>
              </div>

              <div style={bigScore(selected.score)}>
                {selected.score ?? "—"}
              </div>
            </div>

            {/* BÜYÜK BUTONLAR DA BACKEND'E BAĞLI */}
            <div style={actionRow}>
              <button style={redBig} onClick={() => setStatus(selected.id, "red")}>🔴 Red</button>
              <button style={yellowBig} onClick={() => setStatus(selected.id, "review")}>🟡 Tekrar İncele</button>
              <button style={greenBig} onClick={() => setStatus(selected.id, "invite")}>🟢 Davet Et</button>
            </div>

            <div style={cvBox}>
              <iframe
                src={`http://localhost:3000${selected.cv.fileUrl}#toolbar=0&navpanes=0`}
                title="cv"
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ===== STYLES ===== */

const page = {
  display: "flex",
  height: "calc(100vh - 120px)",
  gap: 20,
};

const left = {
  width: 320,
  background: "#fff",
  borderRadius: 16,
  padding: 12,
  overflowY: "auto",
};

const leftHeader = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginBottom: 10,
};

const right = {
  flex: 1,
  background: "#fff",
  borderRadius: 18,
  padding: 20,
  display: "flex",
  flexDirection: "column",
};

const backBtn = {
  background: "#4f46e5",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: 8,
  cursor: "pointer",
};

const card = {
  background: "#f9fafb",
  borderRadius: 14,
  padding: 12,
  marginBottom: 10,
  boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const miniBtns = {
  display: "flex",
  gap: 6,
};

const eyeBtn = {
  background: "#e0e7ff",
  border: "none",
  borderRadius: 8,
  padding: "4px 8px",
  cursor: "pointer",
};

const redBtn = {
  background: "#fee2e2",
  border: "1px solid #ef4444",
  borderRadius: 8,
  padding: "4px 8px",
  cursor: "pointer",
};

const yellowBtn = {
  background: "#fef3c7",
  border: "1px solid #facc15",
  borderRadius: 8,
  padding: "4px 8px",
  cursor: "pointer",
};

const greenBtn = {
  background: "#dcfce7",
  border: "1px solid #22c55e",
  borderRadius: 8,
  padding: "4px 8px",
  cursor: "pointer",
};

const detailHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
};

const bigScore = (s) => ({
  width: 70,
  height: 70,
  borderRadius: "50%",
  background:
    s >= 80 ? "#16a34a" : s >= 60 ? "#facc15" : "#ef4444",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  fontWeight: "bold",
});

const actionRow = {
  display: "flex",
  gap: 10,
  marginBottom: 12,
};

const redBig = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  padding: "8px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const yellowBig = {
  background: "#facc15",
  color: "#000",
  border: "none",
  padding: "8px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const greenBig = {
  background: "#22c55e",
  color: "#fff",
  border: "none",
  padding: "8px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const cvBox = {
  flex: 1,
  border: "1px solid #ddd",
  borderRadius: 14,
  overflow: "hidden",
};
