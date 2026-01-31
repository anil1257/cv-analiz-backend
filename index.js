require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const path = require("path");
const fetch = require("node-fetch");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ---- Crash yakala (debug) ----
process.on("uncaughtException", (err) => console.error("❌ UNCAUGHT:", err));
process.on("unhandledRejection", (err) => console.error("❌ UNHANDLED:", err));

const app = express();
app.use(cors());
app.use(express.json());

console.log("✅ INDEX.JS LOADED FROM:", __filename);

app.get("/api/ping", (req, res) => res.json({ ok: true, t: Date.now() }));

app.get("/debug/routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((m) => {
    if (m.route && m.route.path) {
      routes.push({ path: m.route.path, methods: m.route.methods });
    }
  });
  res.json(routes);
});

/* =========================
   UPLOAD FOLDER
========================= */
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

app.use("/uploads", express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname); // .pdf
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

/* =========================
   TEST
========================= */
app.get("/", (req, res) => {
  res.send("✅ AI + AKILLI CV ANALIZ BACKEND ÇALIŞIYOR 🤖🧠🔥");
});

/* =========================
   AUTH MIDDLEWARE
========================= */
function companyAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Token yok" });

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    req.companyId = decoded.companyId;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Geçersiz token" });
  }
}

/* =========================
   COMPANY REGISTER
========================= */
app.post("/api/company/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.company.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: "Bu email zaten kayıtlı" });

    const hash = await bcrypt.hash(password, 10);

    const company = await prisma.company.create({
      data: { name, email, password: hash },
    });

    const token = jwt.sign(
      { companyId: company.id },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "7d" }
    );

    res.json({ token, company });
  } catch (e) {
    console.error("REGISTER ERROR:", e);
    res.status(500).json({ message: "Register hatası" });
  }
});

/* =========================
   COMPANY LOGIN
========================= */
app.post("/api/company/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const company = await prisma.company.findUnique({ where: { email } });
    if (!company) return res.status(400).json({ message: "Firma bulunamadı" });

    const ok = await bcrypt.compare(password, company.password);
    if (!ok) return res.status(400).json({ message: "Şifre hatalı" });

    const token = jwt.sign(
      { companyId: company.id },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "7d" }
    );

    res.json({ token, company });
  } catch (e) {
    console.error("LOGIN ERROR:", e);
    res.status(500).json({ message: "Login hatası" });
  }
});

/* =========================
   STATUS NORMALIZER
========================= */
function normalizeStatus(s) {
  if (!s) return null;
  const status = String(s).toLowerCase().trim();
  const map = { red: "RED", review: "REVIEW", invite: "INVITE", new: "NEW" };
  return map[status] || status.toUpperCase();
}

/* =========================
   UPDATE APPLICATION STATUS + AUTO MESSAGE
========================= */
app.patch("/api/application/:id/status", companyAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const normalizedStatus = normalizeStatus(req.body.status);

    if (!normalizedStatus) return res.status(400).json({ message: "status gerekli" });

    const application = await prisma.application.findUnique({
      where: { id },
      select: { id: true, userId: true, companyId: true },
    });

    if (!application) return res.status(404).json({ message: "Başvuru bulunamadı" });

    // güvenlik: başka şirketin başvurusu mu?
    if (application.companyId !== req.companyId) {
      return res.status(403).json({ message: "Yetkisiz" });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status: normalizedStatus },
    });

    // ✅ STATUS'A GÖRE OTOMATİK MESAJ
    let title = "";
    let body = "";

    if (normalizedStatus === "RED") {
      title = "Başvuru Sonucu";
      body =
        "Başvurunuz değerlendirilmiştir. Şu an için olumlu sonuçlanmamıştır. İlginiz için teşekkür ederiz.";
    } else if (normalizedStatus === "REVIEW") {
      title = "Başvurunuz İncelemede";
      body =
        "Başvurunuz tekrar değerlendirme sürecine alınmıştır. En kısa sürede bilgilendirileceksiniz.";
    } else if (normalizedStatus === "INVITE") {
      title = "Mülakat Daveti";
      body = "Başvurunuz olumlu değerlendirilmiştir. En kısa sürede sizinle iletişime geçilecektir.";
    }

    if (title && body) {
      await prisma.message.create({
        data: {
          userId: application.userId,
          companyId: application.companyId,
          applicationId: application.id,
          title,
          body,
          type: "info",
        },
      });
    }

    res.json({ success: true, application: updated });
  } catch (err) {
    console.error("STATUS UPDATE ERROR:", err);
    res.status(500).json({ message: "Status güncellenemedi" });
  }
});

/* =========================
   SEND MANUAL MESSAGE (HR -> ADAY)
========================= */
app.post("/api/application/:id/send-message", companyAuth, async (req, res) => {
  try {
    const appId = Number(req.params.id);
    const { title, body } = req.body;

    if (!title || !body) return res.status(400).json({ message: "Başlık ve mesaj gerekli" });

    const application = await prisma.application.findUnique({
      where: { id: appId },
      select: { id: true, userId: true, companyId: true },
    });

    if (!application) return res.status(404).json({ message: "Başvuru bulunamadı" });

    if (application.companyId !== req.companyId) {
      return res.status(403).json({ message: "Yetkisiz" });
    }

    await prisma.message.create({
      data: {
        userId: application.userId,
        companyId: application.companyId,
        applicationId: application.id,
        title: title.trim(),
        body: body.trim(),
        type: "info",
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("SEND MESSAGE ERROR:", err);
    res.status(500).json({ message: "Mesaj gönderilemedi" });
  }
});

/* =========================
   RULE BASED ANALYSIS
========================= */
function ruleBasedAnalysis(text) {
  const lower = (text || "").toLowerCase();

  let educationScore = 0;
  const eduKeywords = ["üniversite", "fakülte", "lisans", "önlisans", "yüksek lisans", "mezun"];
  if (eduKeywords.some((k) => lower.includes(k))) educationScore += 20;
  if (lower.match(/\b20\d{2}\b/)) educationScore += 10;
  if (educationScore > 30) educationScore = 30;

  let experienceScore = 0;
  const expKeywords = ["deneyim", "çalıştı", "staj", "proje", "görev", "sorumlu"];
  expKeywords.forEach((k) => {
    if (lower.includes(k)) experienceScore += 8;
  });
  if (experienceScore > 40) experienceScore = 40;

  let skillScore = 0;
  const skillKeywords = [
    "java",
    "kotlin",
    "python",
    "excel",
    "sql",
    "react",
    "node",
    "iletişim",
    "takım",
    "liderlik",
    "problem",
    "analiz",
  ];
  skillKeywords.forEach((k) => {
    if (lower.includes(k)) skillScore += 5;
  });
  if (skillScore > 30) skillScore = 30;

  return {
    totalScore: educationScore + experienceScore + skillScore,
    educationScore,
    experienceScore,
    skillScore,
  };
}

/* =========================
   SECTOR SCORES
========================= */
function calculateSectorScores(text) {
  const lower = (text || "").toLowerCase();

  const sectors = {
    Yazılım: ["java", "kotlin", "python", "api", "github", "react", "node"],
    Satış: ["satış", "müşteri", "pazarlama", "ikna", "hedef"],
    Ofis: ["excel", "rapor", "evrak", "sunum", "ofis"],
    Sağlık: ["hasta", "klinik", "hemşire", "sağlık", "bakım"],
    Üretim: ["makine", "vardiya", "üretim", "kalite", "operatör"],
  };

  const results = [];
  for (const [sector, keys] of Object.entries(sectors)) {
    let score = 0;
    keys.forEach((k) => {
      if (lower.includes(k)) score += 20;
    });
    if (score > 100) score = 100;
    results.push({ sector, score });
  }

  return results;
}

/* =========================
   AI COMMENT ONLY
========================= */
async function analyzeWithAI(ruleResult) {
  // HF_TOKEN yoksa fallback dön (crash olmasın)
  if (!process.env.HF_TOKEN) {
    return {
      strengths: ["Öğrenmeye açık"],
      suggestions: ["CV detaylarını güçlendir"],
      careerNote: "Profil geliştirilebilir",
    };
  }

  const prompt = `
Bir CV analiz sistemi için yorum yazıyorsun.

Eğitim: ${ruleResult.educationScore}
Deneyim: ${ruleResult.experienceScore}
Skill: ${ruleResult.skillScore}

Sadece JSON ver:
{
  "suggestions": [],
  "strengths": [],
  "careerNote": ""
}`;

  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 400,
    }),
  });

  const data = await response.json();
  let content = data?.choices?.[0]?.message?.content || "";
  content = content.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(content);
  } catch {
    return {
      strengths: ["Öğrenmeye açık"],
      suggestions: ["CV detaylarını güçlendir"],
      careerNote: "Profil geliştirilebilir",
    };
  }
}

/* =========================
   ANALYZE CV (PDF)
========================= */
app.post("/analyze", upload.single("cv"), async (req, res) => {
  let filePath;

  try {
    if (!req.file) return res.status(400).json({ error: "CV dosyası gelmedi" });

    filePath = req.file.path;

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    if (!text || text.length < 50) throw new Error("PDF text boş veya okunamadı");

    const ruleResult = ruleBasedAnalysis(text);
    const sectorScores = calculateSectorScores(text);
    const aiComment = await analyzeWithAI(ruleResult);

    res.json({
      score: ruleResult.totalScore,
      pages: pdfData.numpages || 1,
      position: "Otomatik Analiz",
      strengths: aiComment.strengths,
      suggestions: aiComment.suggestions,
      sectorScores,
      careerNote: aiComment.careerNote,
    });
  } catch (e) {
    console.error("ANALYZE ERROR:", e);
    res.status(500).json({ error: "CV analiz hatası" });
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

/* =========================
   ANALYZE FORM (JSON CV)
========================= */
app.post("/analyze-form", async (req, res) => {
  try {
    const cv = req.body;
    if (!cv) return res.status(400).json({ error: "CV verisi gelmedi" });

    const text = JSON.stringify(cv).toLowerCase();

    const ruleResult = ruleBasedAnalysis(text);
    const sectorScores = calculateSectorScores(text);
    const aiComment = await analyzeWithAI(ruleResult);

    res.json({
      score: ruleResult.totalScore,
      pages: 1,
      position: "Form CV Analizi",
      strengths: aiComment.strengths,
      suggestions: aiComment.suggestions,
      sectorScores,
      careerNote: aiComment.careerNote,
    });
  } catch (e) {
    console.error("ANALYZE FORM ERROR:", e);
    res.status(500).json({ error: "Form CV analiz hatası" });
  }
});

/* =========================
   WEB PANEL API (ESKİ) - geri uyum
========================= */
app.post("/api/company", async (req, res) => {
  const { name, email, password } = req.body;
  const company = await prisma.company.create({ data: { name, email, password } });
  res.json(company);
});

app.get("/api/company", async (req, res) => {
  const list = await prisma.company.findMany();
  res.json(list);
});

app.post("/api/position", async (req, res) => {
  const { title, companyId } = req.body;
  const position = await prisma.position.create({
    data: { title, companyId: Number(companyId) },
  });
  res.json(position);
});

app.get("/api/position", async (req, res) => {
  const list = await prisma.position.findMany({ include: { company: true } });
  res.json(list);
});

/* =========================
   MOBILE - POSITIONS LIST
========================= */
app.get("/api/mobile/positions/:companyId", async (req, res) => {
  try {
    const companyId = Number(req.params.companyId);

    const list = await prisma.position.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    res.json(list);
  } catch (e) {
    console.error("MOBILE POSITION LIST ERROR:", e);
    res.status(500).json({ error: "Pozisyonlar alınamadı" });
  }
});

/* =========================
   MOBILE - APPLY GENERAL (TEK ROUTE)
========================= */
app.post("/api/mobile/apply/general", upload.single("cv"), async (req, res) => {
  try {
    const { companyId, positionId, note, userId } = req.body;
    const uid = Number(userId || 1);

    if (!req.file) return res.status(400).json({ error: "CV yok" });
    if (!companyId || !positionId) {
      return res.status(400).json({ error: "Firma ve pozisyon zorunlu" });
    }

    // CV kaydı
    const cv = await prisma.candidateCV.create({
      data: {
        fileUrl: `/uploads/${req.file.filename}`,
        source: "mobile-general",
      },
    });

    const appData = await prisma.application.create({
      data: {
        note: note || "Genel Başvuru",
        status: "NEW",
        company: { connect: { id: Number(companyId) } },
        position: { connect: { id: Number(positionId) } },
        cv: { connect: { id: cv.id } },
        user: { connect: { id: uid } },
      },
    });

    // ✅ Otomatik mesaj (applicationId bağla)
    await prisma.message.create({
      data: {
        userId: uid,
        companyId: Number(companyId),
        applicationId: appData.id,
        title: "Başvurunuz Alındı",
        body: "CV’niz ilgili firmaya iletilmiştir. En kısa sürede değerlendirmeye alınacaktır.",
        type: "info",
      },
    });

    res.json({ success: true, applicationId: appData.id });
  } catch (e) {
    console.error("MOBILE GENERAL ERROR:", e);
    res.status(500).json({ error: "Genel başvuru hatası" });
  }
});

/* =========================
   APPLICATION LIST (KORUMALI)
========================= */
app.get("/api/applications", companyAuth, async (req, res) => {
  const apps = await prisma.application.findMany({
    where: { companyId: req.companyId },
    include: { cv: true, position: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(apps);
});

/* =========================
   APPLICATION BY POSITION
========================= */
app.get("/api/application/:positionId", async (req, res) => {
  try {
    const positionId = Number(req.params.positionId);

    const apps = await prisma.application.findMany({
      where: { positionId },
      include: { cv: true, analysis: true },
      orderBy: { createdAt: "desc" },
    });

    const result = apps.map((a) => ({
      id: a.id,
      createdAt: a.createdAt,
      cvUrl: a.cv?.fileUrl || null,
      score: a.analysis?.totalScore || null,
      name: "Aday",
    }));

    res.json(result);
  } catch (e) {
    console.error("POSITION APPS ERROR:", e);
    res.status(500).json({ error: "Başvurular alınamadı" });
  }
});

/* =========================
   DASHBOARD STATS (KORUMALI)
========================= */
app.get("/api/dashboard/stats", companyAuth, async (req, res) => {
  const companyId = req.companyId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalToday = await prisma.application.count({
    where: { companyId, createdAt: { gte: today } },
  });

  const generalToday = await prisma.application.count({
    where: { companyId, positionId: null, createdAt: { gte: today } },
  });

  const positionToday = await prisma.application.count({
    where: { companyId, positionId: { not: null }, createdAt: { gte: today } },
  });

  res.json({ totalToday, generalToday, positionToday });
});

/* =========================
   MOBILE - GET USER MESSAGES (ANDROID FORMAT)
   GET /api/mobile/messages/:userId
========================= */
app.get("/api/mobile/messages/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    const messages = await prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { name: true } },
      },
    });

    const out = messages.map((m) => ({
      id: m.id,
      companyName: m.company?.name || "Firma",
      text: m.body || m.title || "",
      dateText: m.createdAt ? m.createdAt.toISOString() : "",
      isRead: !!m.isRead,
    }));

    res.json({ messages: out });
  } catch (err) {
    console.error("GET MESSAGES ERROR:", err);
    res.status(500).json({ message: "Mesajlar alınamadı" });
  }
});

/* =========================
   MOBILE - MARK MESSAGE AS READ
   PATCH /api/mobile/messages/:id/read
========================= */
app.patch("/api/mobile/messages/:id/read", async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.message.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("READ MESSAGE ERROR:", err);
    res.status(500).json({ message: "Mesaj okunamadı" });
  }
});

/* =========================
   DEV SEED (local test only)
========================= */
app.post("/api/dev/seed", async (req, res) => {
  try {
    const user = await prisma.user.upsert({
      where: { email: "demo@user.com" },
      update: {},
      create: { email: "demo@user.com", password: "123456", fullName: "Demo User" },
    });

    const company = await prisma.company.upsert({
      where: { email: "testfirma1@firma.com" },
      update: { name: "testfirma1" },
      create: { name: "testfirma1", email: "testfirma1@firma.com", password: "123456" },
    });

    let position = await prisma.position.findFirst({
      where: { companyId: company.id, title: "Genel Başvuru (Test)" },
      orderBy: { createdAt: "desc" },
    });

    if (!position) {
      position = await prisma.position.create({
        data: { title: "Genel Başvuru (Test)", companyId: company.id },
      });
    }

    res.json({ ok: true, userId: user.id, companyId: company.id, positionId: position.id });
  } catch (e) {
    console.error("SEED ERROR:", e);
    res.status(500).json({ ok: false, error: "seed failed" });
  }
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🔥 AKILLI AI CV ANALIZ SERVER READY → PORT:", PORT);
});

// Debug: server alive log
setInterval(() => {
  console.log("✅ server alive", new Date().toISOString());
}, 30000);
