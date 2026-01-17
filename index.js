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
   UPLOAD
========================= */
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const upload = multer({ dest: UPLOAD_DIR });

/* =========================
   TEST
========================= */
app.get("/", (req, res) => {
  res.send("✅ CV ANALIZ HYBRID SERVER ÇALIŞIYOR");
});

/* =========================
   ANALYZE
========================= */
app.post("/analyze", upload.single("cv"), async (req, res) => {
  let filePath;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "CV gelmedi" });
    }

    filePath = req.file.path;
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text.toLowerCase();

    const ruleResult = ruleBasedAnalysis(text);
    const aiPart = await aiComment(text, ruleResult.position);

    res.json({
      ...ruleResult,
      ...aiPart
    });

  } catch (e) {
    console.error("❌ ANALYZE ERROR:", e);
    res.status(500).json({ error: "Analiz hatası" });
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

/* =========================
   RULE BASED
========================= */
function ruleBasedAnalysis(text) {

  let score = 30;
  let position = "Genel Başvuru";

  const hasUniversity = /üniversite|fakülte|mühendis/.test(text);
  const hasProduction = /bakım|üretim|tpm|kaizen|arıza|makine/.test(text);
  const hasSoftware = /yazılım|software|java|python|c\+\+|react/.test(text);
  const hasSales = /satış|pazarlama|müşteri/.test(text);
  const hasOffice = /ofis|excel|raporlama/.test(text);
  const hasHealth = /hastane|sağlık|klinik/.test(text);

  if (hasUniversity) score += 20;
  if (hasProduction) score += 20;
  if (hasSoftware) score += 15;
  if (hasSales) score += 10;
  if (hasOffice) score += 10;
  if (hasHealth) score += 10;

  if (hasUniversity && hasProduction) position = "Mühendis (Üretim/Bakım)";
  else if (hasSoftware) position = "Yazılım";
  else if (hasSales) position = "Satış";
  else if (hasOffice) position = "Ofis";
  else if (hasHealth) position = "Sağlık";

  if (score > 95) score = 95;

  const sectorScores = [
    { sector: "Yazılım", score: hasSoftware ? 70 : 20 },
    { sector: "Satış", score: hasSales ? 65 : 25 },
    { sector: "Ofis", score: hasOffice ? 60 : 30 },
    { sector: "Sağlık", score: hasHealth ? 65 : 20 },
    { sector: "Üretim", score: hasProduction ? 80 : 35 }
  ];

  return {
    score,
    pages: 1,
    position,
    sectorScores
  };
}

/* =========================
   AI COMMENT
========================= */
async function aiComment(text, position) {

  const prompt = `
Bu kişi için meslek alanı: ${position}

CV metni aşağıdadır.

Sadece aşağıdaki JSON formatında cevap ver:

{
 "suggestions": ["..."],
 "strengths": ["..."],
 "careerNote": "..."
}

CV:
"""${text.slice(0, 4000)}"""
`;

  try {
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
        max_tokens: 600
      })
    });

    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content || "";

    content = content.replace(/```json|```/g, "").trim();
    return JSON.parse(content);

  } catch (e) {
    console.error("❌ AI ERROR:", e);
    return {
      suggestions: ["CV'de güçlü alanları daha net vurgula.", "Pozisyona özel teknik becerileri ön plana çıkar."],
      strengths: ["Teknik altyapı", "Saha deneyimi"],
      careerNote: "Profil geliştikçe daha iyi fırsatlar yakalayabilirsin."
    };
  }
}

/* =========================
   START
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🔥 HYBRID CV ANALIZ SERVER READY:", PORT);
});
