const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const path = require("path");

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

    /* =========================
       RULE BASED ANALYSIS
    ========================= */

    let score = 30;
    let position = "Genel Başvuru";

    const hasUniversity =
      text.includes("üniversite") ||
      text.includes("fakülte") ||
      text.includes("lisans");

    const isEngineer =
      text.includes("mühendis") ||
      text.includes("engineering");

    if (hasUniversity) score += 20;

    if (isEngineer) {
      position = "Mühendis";
      score += 15;
    }

    // sektör kelimeleri
    const softwareWords = ["yazılım", "software", "java", "python", "c++", "c#"];
    const salesWords = ["satış", "pazarlama", "müşteri"];
    const officeWords = ["ofis", "sekreter", "evrak", "rapor"];
    const healthWords = ["sağlık", "hemşire", "hasta", "klinik"];
    const productionWords = ["üretim", "fabrika", "makine", "operatör"];

    function countMatches(words) {
      let count = 0;
      words.forEach(w => {
        if (text.includes(w)) count++;
      });
      return count * 20;
    }

    const sectorScores = [
      { sector: "Yazılım", score: countMatches(softwareWords) },
      { sector: "Satış", score: countMatches(salesWords) },
      { sector: "Ofis", score: countMatches(officeWords) },
      { sector: "Sağlık", score: countMatches(healthWords) },
      { sector: "Üretim", score: countMatches(productionWords) }
    ];

    /* =========================
       BASİT AI YORUM (FALLBACK)
    ========================= */

    const suggestions = [];
    if (!hasUniversity) suggestions.push("Eğitim bilgilerini daha açık belirt.");
    if (sectorScores.every(s => s.score === 0))
      suggestions.push("Pozisyona uygun teknik beceriler ekle.");
    if (suggestions.length === 0)
      suggestions.push("CV yapısı genel olarak iyi, deneyim detaylarını artırabilirsin.");

    const strengths = [];
    if (hasUniversity) strengths.push("Akademik altyapı");
    if (isEngineer) strengths.push("Teknik profil");
    if (strengths.length === 0) strengths.push("Öğrenmeye açık profil");

    res.json({
      score: Math.min(score, 95),
      pages: 1,
      position,
      suggestions,
      strengths,
      sectorScores,
      careerNote: "Profil geliştirildikçe daha iyi iş fırsatları yakalayabilirsin."
    });

  } catch (e) {
    console.error("❌ ANALYZE ERROR:", e);
    res.status(500).json({ error: "Analiz hatası" });
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

/* =========================
   START
========================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🔥 CV ANALIZ SERVER READY →", PORT);
});
