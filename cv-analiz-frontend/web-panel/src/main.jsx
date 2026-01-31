import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./Layout";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import Login from "./pages/Login";
import Register from "./pages/Register";   // 👈 EKLENDİ

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>

        {/* ===== PUBLIC ROUTES ===== */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />   {/* 👈 EKLENDİ */}

        {/* ===== PANEL (LAYOUT İÇİNDE) ===== */}
        <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />

        <Route path="/applications" element={<Applications />} />   {/* 👈 EKLENDİ */}
        <Route path="/applications/:positionId" element={<Applications />} />
      </Route>

      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
