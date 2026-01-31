import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

/*
  GET /api/application?positionId=123
*/
router.get("/", async (req, res) => {
  const { positionId } = req.query;

  try {
    const apps = await prisma.application.findMany({
      where: {
        positionId: Number(positionId),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(apps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Başvurular getirilemedi" });
  }
});

export default router;
