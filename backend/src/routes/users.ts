import { Router, type Request, type Response } from "express";
import { PrismaClient, $Enums } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Search users with filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const { signLanguageLevel, firstLanguage, search, gender, ageGroup } = req.query;

    const where: any = {};
    
    if (signLanguageLevel && typeof signLanguageLevel === "string") {
      const normalized = signLanguageLevel.toLowerCase();
      if (normalized.includes("begin") || signLanguageLevel === "初級") {
        where.signLanguageLevel = "BEGINNER";
      } else if (normalized.includes("inter") || signLanguageLevel === "中級") {
        where.signLanguageLevel = "INTERMEDIATE";
      } else if (normalized.includes("advan") || signLanguageLevel === "上級") {
        where.signLanguageLevel = "ADVANCED";
      }
    }

    if (firstLanguage && typeof firstLanguage === "string") {
      const normalized = firstLanguage.toLowerCase();
      if (normalized.includes("spok") || firstLanguage === "音声言語") {
        where.firstLanguage = "SPOKEN";
      } else if (normalized.includes("sign") || firstLanguage === "手話") {
        where.firstLanguage = "SIGN";
      }
    }

    if (search && typeof search === "string") {
      where.username = { contains: search, mode: "insensitive" };
    }

    if (gender && typeof gender === "string") {
      const normalized = gender.toLowerCase();
      if (normalized.includes("male") || gender === "男性") {
        where.gender = "MALE";
      } else if (normalized.includes("female") || gender === "女性") {
        where.gender = "FEMALE";
      } else if (normalized.includes("other") || gender === "その他") {
        where.gender = "OTHER";
      } else if (normalized.includes("unspecified") || gender === "未回答") {
        where.gender = "UNSPECIFIED";
      }
    }

    if (ageGroup && typeof ageGroup === "string") {
      const normalized = ageGroup.toLowerCase();
      if (normalized.includes("teen") || ageGroup === "10代") {
        where.ageGroup = "TEENS";
      } else if (normalized.includes("twenties") || ageGroup === "20代") {
        where.ageGroup = "TWENTIES";
      } else if (normalized.includes("thirties") || ageGroup === "30代") {
        where.ageGroup = "THIRTIES";
      } else if (normalized.includes("forties") || ageGroup === "40代") {
        where.ageGroup = "FORTIES";
      } else if (normalized.includes("fifties") || ageGroup === "50代") {
        where.ageGroup = "FIFTIES";
      } else if (normalized.includes("sixties") || ageGroup === "60代以上") {
        where.ageGroup = "SIXTIES_PLUS";
      }
    }

    const users = await prisma.user.findMany({
      where,
      take: 50,
      select: {
        id: true,
        username: true,
        signLanguageLevel: true,
        firstLanguage: true,
        profileText: true,
        gender: true,
        ageGroup: true,
        iconUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const result = users.map((u) => ({
      id: Number(u.id),
      username: u.username,
      signLanguageLevel: u.signLanguageLevel,
      firstLanguage: u.firstLanguage,
      profileText: u.profileText,
      gender: u.gender,
      ageGroup: u.ageGroup,
      iconUrl: u.iconUrl,
      createdAt: u.createdAt,
    }));

    return res.json({ users: result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("GET /api/users failed", err);
    return res.status(500).json({ message: "internal error" });
  }
});

export default router;
