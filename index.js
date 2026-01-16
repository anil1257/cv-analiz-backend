const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const pdfParse = require("pdf-parse");

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

/* =========================
   ANALYZE CV ENDPOINT
========================= */
app.post("/analyze-cv", upload.single("cv"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const position = (req.body.position || "").toLowerCase();

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text.toLowerCase();

    const selectedCategory = detectCategory(position);

    const base = analyzeGeneral(text);
    const role = analyzeByCategory(selectedCategory, text);
    const career = detectCareerFields(text);

    // ✅ YENİ
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
  else suggestions.push("CV kısa, daha fazla deneyim ve bilgi ekleyebilirsin.");

  return { baseScore: score, baseSuggestions: suggestions };
}

/* =========================
   ROLE BASED ANALYSIS
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

/* ===== SOFTWARE ===== */
function analyzeSoftware(text) {
  let s = 0, sug = [];
  if (text.includes("kotlin") || text.includes("java")) s += 15; else sug.push("Programlama dillerini (Kotlin, Java vb) yazmalısın.");
  if (text.includes("mvvm") || text.includes("clean")) s += 10; else sug.push("Projelerde mimari yapı (MVVM, Clean Architecture) belirtmelisin.");
  if (text.includes("github")) s += 10; else sug.push("GitHub profil linkini mutlaka CV'ne ekle.");
  if (text.includes("firebase") || text.includes("api")) s += 10; else sug.push("Backend veya servis entegrasyonlarını belirtmelisin.");
  return roleResult(s, sug, 30);
}

/* ===== ENGINEERING ===== */
function analyzeEngineering(text) {
  let s = 0, sug = [];
  if (text.includes("proje")) s += 15; else sug.push("Katıldığın mühendislik projelerini detaylandırmalısın.");
  if (text.includes("autocad") || text.includes("solid")) s += 10; else sug.push("Teknik yazılım bilgilerini (AutoCAD, SolidWorks vb) yazmalısın.");
  if (text.includes("saha")) s += 10; else sug.push("Saha deneyimin varsa mutlaka belirtmelisin.");
  return roleResult(s, sug, 35);
}

/* ===== HEALTH ===== */
function analyzeHealth(text) {
  let s = 0, sug = [];
  if (text.includes("hasta")) s += 15; else sug.push("Hasta bakım deneyimini yazmalısın.");
  if (text.includes("acil") || text.includes("yoğun")) s += 10; else sug.push("Acil servis veya yoğun bakım deneyimi varsa eklemelisin.");
  if (text.includes("sertifika")) s += 10; else sug.push("Sahip olduğun sağlık sertifikalarını eklemelisin.");
  return roleResult(s, sug, 40);
}

/* ===== EDUCATION ===== */
function analyzeEducation(text) {
  let s = 0, sug = [];
  if (text.includes("öğrenci")) s += 15; else sug.push("Öğrencilerle çalışma deneyimini yazmalısın.");
  if (text.includes("ders")) s += 10; else sug.push("Verdiğin dersler veya branşını belirtmelisin.");
  return roleResult(s, sug, 40);
}

/* ===== CLEANING ===== */
function analyzeCleaning(text) {
  let s = 0, sug = [];
  if (text.includes("hijyen")) s += 10; else sug.push("Hijyen ve temizlik deneyimini belirtmelisin.");
  if (text.includes("vardiya")) s += 10; else sug.push("Vardiyalı çalışmaya uygunluğunu yazmalısın.");
  if (text.includes("otel") || text.includes("hastane")) s += 10; else sug.push("Çalıştığın alanları (otel, hastane vb) belirtmelisin.");
  return roleResult(s, sug, 25);
}

/* ===== SERVICE ===== */
function analyzeService(text) {
  let s = 0, sug = [];
  if (text.includes("müşteri")) s += 10; else sug.push("Müşteri ile birebir çalışma deneyimini yazmalısın.");
  if (text.includes("kasa")) s += 10; else sug.push("Kasa veya ödeme alma deneyimini belirtmelisin.");
  return roleResult(s, sug, 25);
}

/* ===== OFFICE ===== */
function analyzeOffice(text) {
  let s = 0, sug = [];
  if (text.includes("excel") || text.includes("office")) s += 15; else sug.push("Office programları bilginizi yazmalısınız.");
  if (text.includes("rapor")) s += 10; else sug.push("Raporlama ve dokümantasyon deneyimini eklemelisin.");
  return roleResult(s, sug, 30);
}

/* =========================
   CAREER FIELD DETECT
========================= */
function detectCareerFields(text) {
  const fields = [];

  if (text.includes("excel") || text.includes("office")) fields.push("Ofis Personeli");
  if (text.includes("müşteri")) fields.push("Müşteri Temsilcisi");
  if (text.includes("bilgisayar")) fields.push("Veri Giriş Elemanı");
  if (text.includes("github") || text.includes("kod")) fields.push("Yazılım Stajyeri");
  if (text.includes("rapor")) fields.push("Operasyon Destek");
  if (text.includes("proje")) fields.push("Proje Asistanı");

  return [...new Set(fields)];
}

/* =========================
   ✅ ALTERNATİF SEKTÖR SKORLAMA
========================= */
function calculateSectorScores(text) {

  const sectors = {
    Yazilim: ["java","kotlin","python","api","backend","android","react","node"],
    Satis: ["satış","müşteri","ikna","hedef","pazarlama","portföy"],
    Muhasebe: ["muhasebe","fatura","excel","finans","bilanço","rapor"],
    IK: ["insan kaynakları","işe alım","mülakat","bordro","personel"],
    Lojistik: ["lojistik","depo","sevkiyat","stok","tedarik"]
  };

  const results = [];

  for (const sector in sectors) {
    let score = 0;

    sectors[sector].forEach(word => {
      if (text.includes(word)) score += 10;
    });

    results.push({
      sector: sector,
      score: Math.min(score, 100)
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

/* =========================
   ✅ GÜÇLÜ YÖN ANALİZİ
========================= */
function extractStrengths(text) {

  const strengthsMap = {
    "Takım Çalışması": ["takım","ekip","birlikte","koordinasyon"],
    "Liderlik": ["lider","yönetim","sorumlu","organizasyon"],
    "Analitik Düşünme": ["analiz","problem","çözüm","optimizasyon"],
    "İletişim": ["iletişim","müşteri","sunum","raporlama"],
    "Disiplin": ["planlı","düzenli","takip","zamanında"]
  };

  const strengths = [];

  for (const key in strengthsMap) {
    strengthsMap[key].forEach(word => {
      if (text.includes(word)) strengths.push(key);
    });
  }

  return [...new Set(strengths)];
}

/* =========================
   FINAL MERGE
========================= */
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

function buildFinalResult(base, role, career, selectedCategory, sectorScores, strengths) {
  const total = Math.min(100, base.baseScore + role.roleScore);

  let careerNote = null;
  if (career.length > 0) {
    careerNote =
      "CV içeriğine göre şu alanlarda da iş bulma şansın yüksek: " +
      career.join(", ") +
      ". Başvuru alanını genişletmen iş bulma süreni kısaltabilir.";
  }

  return {
    score: total,
    pages: Math.max(1, Math.floor(total / 25)),
    suggestions: JSON.stringify([...base.baseSuggestions, ...role.roleSuggestions]),
    education: role.parts.education,
    experience: role.parts.experience,
    projects: role.parts.projects,
    skills: role.parts.skills,
    quality: role.parts.quality,
    careerNote: careerNote,
    recommendedFields: career,

    // ✅ YENİ ALANLAR
    sectorScores: sectorScores,
    strengths: strengths
  };
}

app.listen(3000, () => {
  console.log("🔥 CV ANALIZ SERVER READY → http://localhost:3000");
});
