const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   UPLOAD FOLDER
========================= */
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }
});

/* =========================
   TEST
========================= */
app.get("/", (req, res) => {
  res.send("✅ AI + AKILLI CV ANALIZ BACKEND ÇALIŞIYOR 🤖🧠🔥");
});

/* =========================
   RULE BASED ANALYSIS
========================= */
function ruleBasedAnalysis(text) {

  const lower = text.toLowerCase();

  /* ===== EDUCATION ===== */
  let educationScore = 0;
  const eduKeywords = ["üniversite", "fakülte", "lisans", "önlisans", "yüksek lisans", "mezun"];

  if (eduKeywords.some(k => lower.includes(k))) educationScore += 20;
  if (lower.match(/\b20\d{2}\b/)) educationScore += 10;
  if (educationScore > 30) educationScore = 30;

  /* ===== EXPERIENCE ===== */
  let experienceScore = 0;
  const expKeywords = ["deneyim", "çalıştı", "staj", "proje", "görev", "sorumlu"];

  expKeywords.forEach(k => {
    if (lower.includes(k)) experienceScore += 8;
  });
  if (experienceScore > 40) experienceScore = 40;

  /* ===== SKILLS ===== */
  let skillScore = 0;
  const skillKeywords = [
    "java", "kotlin", "python", "excel", "sql", "react", "node",
    "iletişim", "takım", "liderlik", "problem", "analiz"
  ];

  skillKeywords.forEach(k => {
    if (lower.includes(k)) skillScore += 5;
  });
  if (skillScore > 30) skillScore = 30;

  const totalScore = educationScore + experienceScore + skillScore;

  return {
    totalScore,
    educationScore,
    experienceScore,
    skillScore
  };
}

/* =========================
   SECTOR SCORES
========================= */
function calculateSectorScores(text) {

  const lower = text.toLowerCase();

  const sectors = {
    "Yazılım": ["java", "kotlin", "python", "api", "github", "react", "node"],
    "Satış": ["satış", "müşteri", "pazarlama", "ikna", "hedef"],
    "Ofis": ["excel", "rapor", "evrak", "sunum", "ofis"],
    "Sağlık": ["hasta", "klinik", "hemşire", "sağlık", "bakım"],
    "Üretim": ["makine", "vardiya", "üretim", "kalite", "operatör"]
  };

  const results = [];

  for (const [sector, keys] of Object.entries(sectors)) {
    let score = 0;
    keys.forEach(k => {
      if (lower.includes(k)) score += 20;
    });
    if (score > 100) score = 100;
    results.push({ sector, score });
  }

  return results;
}

/* =========================
   ANALYZE CV (PDF)
========================= */
app.post("/analyze", upload.single("cv"), async (req, res) => {
  let filePath;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "CV dosyası gelmedi" });
    }

    filePath = req.file.path;

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    if (!text || text.length < 50) {
      throw new Error("PDF text boş veya okunamadı");
    }

    const ruleResult = ruleBasedAnalysis(text);
    const sectorScores = calculateSectorScores(text);
    const aiComment = await analyzeWithAI(ruleResult);

    res.json({
      score: ruleResult.totalScore,
      pages: pdfData.numpages || 1,
      position: "Otomatik Analiz",
      suggestions: aiComment.suggestions,
      strengths: aiComment.strengths,
      sectorScores: sectorScores,
      careerNote: aiComment.careerNote
    });

  } catch (e) {
    console.error("❌ ANALYZE ERROR:", e);
    res.status(500).json({ error: "CV analiz hatası" });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

/* =========================
   ANALYZE FORM (JSON CV) ✅ YENİ
========================= */
app.post("/analyze-form", async (req, res) => {
  try {

    const cv = req.body;

    if (!cv) {
      return res.status(400).json({ error: "CV verisi gelmedi" });
    }

    // JSON CV'yi text gibi birleştiriyoruz ki
    // aynı analiz motoru çalışsın
    const text = JSON.stringify(cv).toLowerCase();

    const ruleResult = ruleBasedAnalysis(text);
    const sectorScores = calculateSectorScores(text);
    const aiComment = await analyzeWithAI(ruleResult);

    res.json({
      score: ruleResult.totalScore,
      pages: 1,
      position: "Form CV Analizi",
      suggestions: aiComment.suggestions,
      strengths: aiComment.strengths,
      sectorScores: sectorScores,
      careerNote: aiComment.careerNote
    });

  } catch (e) {
    console.error("❌ ANALYZE FORM ERROR:", e);
    res.status(500).json({ error: "Form CV analiz hatası" });
  }
});

/* =========================
   AI COMMENT ONLY
========================= */
async function analyzeWithAI(ruleResult) {

  const prompt = `
Bir CV analiz sistemi için yorum yazıyorsun.

Bilgiler:
Eğitim Skoru: ${ruleResult.educationScore}
Deneyim Skoru: ${ruleResult.experienceScore}
Skill Skoru: ${ruleResult.skillScore}

Görevlerin:
1. En fazla 5 geliştirme önerisi yaz
2. Güçlü yönleri listele
3. Kısa kariyer tavsiyesi yaz

Sadece JSON ver:

{
  "suggestions": ["..."],
  "strengths": ["..."],
  "careerNote": "string"
}
`;

  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.HF_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 500
    })
  });

  const data = await response.json();

  let content = data?.choices?.[0]?.message?.content || "";
  content = content.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(content);
  } catch (e) {
    console.error("❌ AI JSON PARSE ERROR:", content);
    return {
      suggestions: ["CV detaylarını daha açık belirt.", "Pozisyona uygun becerileri vurgula."],
      strengths: ["Öğrenmeye açık profil"],
      careerNote: "Mevcut profil geliştirildiğinde daha iyi fırsatlar yakalayabilirsin."
    };
  }
}

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🔥 AKILLI AI CV ANALIZ SERVER READY → PORT:", PORT);
});
