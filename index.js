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
  res.send("✅ CV ANALIZ AI SERVER AKTIF");
});

/* =========================
   ANALYZE
========================= */
app.post("/analyze", upload.single("cv"), async (req, res) => {
  let filePath;

  try {
    if (!req.file) return res.status(400).json({ error: "CV gelmedi" });

    filePath = req.file.path;

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text.toLowerCase();

    // =========================
    // RULE BASED ANALYSIS
    // =========================

    let score = 30;
    let educationScore = 0;
    let position = "Genel Başvuru";

    const hasUniversity =
      text.includes("üniversite") ||
      text.includes("fakülte") ||
      text.includes("lisans");

    const isEngineer =
      text.includes("mühendis") ||
      text.includes("engineering");

    if (hasUniversity) educationScore += 20;
    if (isEngineer) {
      position = "Mühendis";
      score += 15;
    }

    score += educationScore;

    // sektör kelimeleri
    const softwareWords = ["yazılım", "software", "java", "python", "c++"];
    const salesWords = ["satış", "pazarlama", "müşteri"];
    const officeWords = ["ofis", "sekreter", "evrak", "rapor"];
    const healthWords = ["sağlık", "hemşire", "hasta", "klinik"];
    const productionWords = ["üretim", "fabrika", "makine", "operatör"];

    function countMatches(words) {
      return words.filter(w => text.includes(w)).length * 10;
    }

    const sectorScores = [
      { sector: "Yazılım", score: countMatches(softwareWords) },
      { sector: "Satış", score: countMatches(salesWords) },
      { sector: "Ofis", score: countMatches(officeWords) },
      { sector: "Sağlık", score: countMatches(healthWords) },
      { sector: "Üretim", score: countMatches(productionWords) }
    ];

    // =========================
    // AI YORUM
    // =========================

    const aiComment = await getAIComment(text);

    res.json({
      score: Math.min(score, 95),
      pages: 1,
      position,
      suggestions: aiComment.suggestions,
      strengths: aiComment.strengths,
      sectorScores,
      careerNote: aiComment.careerNote
    });

  } catch (e) {
    console.error("❌ ANALYZE ERROR:", e);
    res.status(500).json({ error: "Analiz hatası" });
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

/* =========================
   AI COMMENT
========================= */
async function getAIComment(cvText) {
  try {
    const prompt = `
Bu CV için kısa öneriler ve güçlü yönler yaz.
Sadece JSON döndür:

{
 "suggestions": ["..."],
 "strengths": ["..."],
 "careerNote": "..."
}

CV:
"""${cvText.slice(0, 4000)}"""
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
        max_tokens: 400
      })
    });

    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content || "";
    content = content.replace(/```json|```/g, "").trim();
    return JSON.parse(content);

  } catch (e) {
    return {
      suggestions: ["CV detaylarını artır.", "Teknik becerileri net yaz."],
      strengths: ["Öğrenmeye açık profil"],
      careerNote: "Profil geliştirildiğinde daha iyi fırsatlar yakalanabilir."
    };
  }
}

/* =========================
   START
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🔥 CV ANALIZ SERVER READY →", PORT);
});
