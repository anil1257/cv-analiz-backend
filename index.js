const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const pdfParse = require("pdf-parse");

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

/* =========================
   TEST ENDPOINT (ÇOK ÖNEMLİ)
========================= */
app.get("/", (req, res) => {
  res.send("CV Analiz Backend ÇALIŞIYOR 💪");
});

/* =========================
   ANALYZE CV ENDPOINT
========================= */
app.post("/analyze", upload.single("cv"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "CV dosyası gelmedi" });
    }

    const filePath = req.file.path;
    const position = (req.body.position || "").toLowerCase();

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text.toLowerCase();

    const selectedCategory = detectCategory(position);

    const base = analyzeGeneral(text);
    const role = analyzeByCategory(selectedCategory, text);
    const career = detectCareerFields(text);

    const sectorScores = calculateSectorScores(text);
    const strengths = extractStrengths(text);

    const result = buildFinalResult(
      base,
      role,
      career,
      selectedCategory,
      sectorScores,
      strengths
    );

    fs.unlinkSync(filePath);

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "CV analiz hatası" });
  }
});

/* =========================
   CATEGORY DETECT
========================= */
function detectCategory(position) {
  if (position.includes("android") || position.includes("developer") || position.includes("yazılım")) return "software";
  if (position.includes("mühendis")) return "engineering";
  if (position.includes("hemşire") || position.includes("sağlık")) return "health";
  if (position.includes("öğretmen")) return "education";
  if (position.includes("temizlik")) return "cleaning";
  if (position.includes("garson") || position.includes("kasiyer")) return "service";
  return "office";
}

/* =========================
   GENERAL ANALYSIS
========================= */
function analyzeGeneral(text) {
  let score = 0;
  const suggestions = [];

  if (text.includes("@")) score += 5;
  else suggestions.push("İletişim için e-posta adresini mutlaka eklemelisin.");

  if (text.includes("üniversite") || text.includes("lisans")) score += 15;
  else suggestions.push("Eğitim bilgilerini açık ve detaylı yazmalısın.");

  if (text.length > 1500) score += 10;
  else suggestions.push("CV kısa, daha fazla deneyim ekleyebilirsin.");

  return { baseScore: score, baseSuggestions: suggestions };
}

/* =========================
   ROLE ANALYSIS
========================= */
function analyzeByCategory(cat, text) {
  switch (cat) {
    case "software": return analyzeSoftware(text);
    case "engineering": return analyzeEngineering(text);
    case "health": return analyzeHealth(text);
    case "education": return analyzeEducation(text);
    case "cleaning": return analyzeCleaning(text);
    case "service": return analyzeService(text);
    default: return analyzeOffice(text);
  }
}

function roleResult(score, suggestions, eduBase) {
  return {
    roleScore: score,
    roleSuggestions: suggestions,
    parts: {
      education: eduBase,
      experience: score,
      projects: score,
      skills: score,
      quality: 20,
    },
  };
}

/* ===== SOFTWARE ===== */
function analyzeSoftware(text) {
  let s = 0, sug = [];
  if (text.includes("kotlin") || text.includes("java")) s += 15; else sug.push("Kotlin / Java eklemelisin.");
  if (text.includes("mvvm")) s += 10; else sug.push("MVVM mimarisi belirtmelisin.");
  if (text.includes("github")) s += 10; else sug.push("GitHub linki ekle.");
  return roleResult(s, sug, 30);
}

/* ===== DİĞERLERİ AYNEN KALDI ===== */

function detectCareerFields(text) {
  const fields = [];
  if (text.includes("github")) fields.push("Yazılım Stajyeri");
  if (text.includes("excel")) fields.push("Ofis Personeli");
  return [...new Set(fields)];
}

function calculateSectorScores(text) {
  const sectors = {
    Yazilim: ["java","kotlin","android","node"],
    Satis: ["satış","müşteri"],
  };

  return Object.keys(sectors).map(sec => ({
    sector: sec,
    score: sectors[sec].filter(w => text.includes(w)).length * 10
  }));
}

function extractStrengths(text) {
  const map = {
    "Takım Çalışması": ["takım","ekip"],
    "İletişim": ["iletişim","müşteri"]
  };

  return Object.keys(map).filter(k =>
    map[k].some(w => text.includes(w))
  );
}

function buildFinalResult(base, role, career, selectedCategory, sectorScores, strengths) {
  const total = Math.min(100, base.baseScore + role.roleScore);

  return {
    score: total,
    pages: Math.max(1, Math.floor(total / 25)),
    suggestions: [...base.baseSuggestions, ...role.roleSuggestions],
    careerNote: career.join(", "),
    recommendedFields: career,
    sectorScores,
    strengths
  };
}

app.listen(3000, () => {
  console.log("🔥 CV ANALIZ SERVER READY → http://localhost:3000");
});
