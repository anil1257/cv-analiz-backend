const express = require("express");
const multer = require("multer");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

/* =========================
   FILE UPLOAD CONFIG
========================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const unique =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

/* =========================
   GENERAL APPLICATION
========================= */
// POST /api/apply/general

router.post("/general", upload.single("cv"), async (req, res) => {
  try {
    const companyId = Number(req.body.companyId);

    if (!req.file) return res.status(400).json({ error: "CV dosyası yok" });

    const cv = await prisma.candidateCV.create({
      data: {
        fileUrl: `/uploads/${req.file.filename}`,
        source: "mobile-general",
      },
    });

    const application = await prisma.application.create({
      data: {
        companyId,
        cvId: cv.id,
        status: "new",
      },
    });

    res.json({ success: true, applicationId: application.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Genel başvuru hatası" });
  }
});

/* =========================
   POSITION APPLICATION
========================= */
// POST /api/apply/position/:positionId

router.post("/position/:positionId", upload.single("cv"), async (req, res) => {
  try {
    const positionId = Number(req.params.positionId);
    const companyId = Number(req.body.companyId);

    if (!req.file) return res.status(400).json({ error: "CV dosyası yok" });

    const cv = await prisma.candidateCV.create({
      data: {
        fileUrl: `/uploads/${req.file.filename}`,
        source: "mobile-position",
      },
    });

    const application = await prisma.application.create({
      data: {
        companyId,
        positionId,
        cvId: cv.id,
        status: "new",
      },
    });

    res.json({ success: true, applicationId: application.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Pozisyon başvuru hatası" });
  }
});

module.exports = router;
