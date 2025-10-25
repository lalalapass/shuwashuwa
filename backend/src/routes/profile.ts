import { Router, type Response } from "express";
import { PrismaClient, $Enums } from "@prisma/client";
import { requireAuth, type AuthedRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Helper functions for enum normalization
const normalizeSign = (level: string): $Enums.SignLanguageLevel | undefined => {
  switch (level) {
    case "初級":
    case "BEGINNER":
      return $Enums.SignLanguageLevel.BEGINNER;
    case "中級":
    case "INTERMEDIATE":
      return $Enums.SignLanguageLevel.INTERMEDIATE;
    case "上級":
    case "ADVANCED":
      return $Enums.SignLanguageLevel.ADVANCED;
    default:
      return undefined;
  }
};

const normalizeFirst = (lang: string): $Enums.FirstLanguage | undefined => {
  switch (lang) {
    case "音声言語":
    case "SPOKEN":
      return $Enums.FirstLanguage.SPOKEN;
    case "手話":
    case "SIGN":
      return $Enums.FirstLanguage.SIGN;
    default:
      return undefined;
  }
};

const normalizeGender = (gender: string): $Enums.Gender | undefined => {
  switch (gender) {
    case "男性":
    case "MALE":
      return $Enums.Gender.MALE;
    case "女性":
    case "FEMALE":
      return $Enums.Gender.FEMALE;
    case "その他":
    case "OTHER":
      return $Enums.Gender.OTHER;
    case "未回答":
    case "UNSPECIFIED":
      return $Enums.Gender.UNSPECIFIED;
    default:
      return undefined;
  }
};

const normalizeAgeGroup = (ageGroup: string): $Enums.AgeGroup | undefined => {
  switch (ageGroup) {
    case "10代":
    case "TEENS":
      return $Enums.AgeGroup.TEENS;
    case "20代":
    case "TWENTIES":
      return $Enums.AgeGroup.TWENTIES;
    case "30代":
    case "THIRTIES":
      return $Enums.AgeGroup.THIRTIES;
    case "40代":
    case "FORTIES":
      return $Enums.AgeGroup.FORTIES;
    case "50代":
    case "FIFTIES":
      return $Enums.AgeGroup.FIFTIES;
    case "60代以上":
    case "SIXTIES_PLUS":
      return $Enums.AgeGroup.SIXTIES_PLUS;
    default:
      return undefined;
  }
};

// Get user profile by ID (public profile)
router.get("/:userId", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = Number(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
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
        // Include some stats
        _count: {
          select: {
            posts: true,
            sentRequests: {
              where: { status: "accepted" }
            }
          }
        }
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      profile: {
        id: Number(user.id),
        username: user.username,
        signLanguageLevel: user.signLanguageLevel,
        firstLanguage: user.firstLanguage,
        profileText: user.profileText,
        gender: user.gender,
        ageGroup: user.ageGroup,
        iconUrl: user.iconUrl,
        createdAt: user.createdAt,
        postCount: user._count.posts,
        friendCount: user._count.sentRequests,
      },
    });
  } catch (err) {
    console.error("GET /api/profile/:userId failed", err);
    return res
      .status(500)
      .json({ message: "internal error", detail: (err as Error).message });
  }
});

// Get current user's profile
router.get("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId as number;

    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
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
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      profile: {
        id: Number(user.id),
        username: user.username,
        signLanguageLevel: user.signLanguageLevel,
        firstLanguage: user.firstLanguage,
        profileText: user.profileText,
        gender: user.gender,
        ageGroup: user.ageGroup,
        iconUrl: user.iconUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("GET /api/profile failed", err);
    return res
      .status(500)
      .json({ message: "internal error", detail: (err as Error).message });
  }
});

// Update user's profile
router.put("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const {
      signLanguageLevel,
      firstLanguage,
      profileText,
      gender,
      ageGroup,
      iconUrl,
    } = req.body ?? {};

    // Validate and normalize enum values
    const updateData: any = {};

    if (signLanguageLevel !== undefined) {
      const normalizedSign = normalizeSign(signLanguageLevel);
      if (!normalizedSign) {
        return res.status(400).json({ message: "Invalid signLanguageLevel" });
      }
      updateData.signLanguageLevel = normalizedSign;
    }

    if (firstLanguage !== undefined) {
      const normalizedFirst = normalizeFirst(firstLanguage);
      if (!normalizedFirst) {
        return res.status(400).json({ message: "Invalid firstLanguage" });
      }
      updateData.firstLanguage = normalizedFirst;
    }

    if (gender !== undefined) {
      const normalizedGender = normalizeGender(gender);
      if (!normalizedGender) {
        return res.status(400).json({ message: "Invalid gender" });
      }
      updateData.gender = normalizedGender;
    }

    if (ageGroup !== undefined) {
      const normalizedAgeGroup = normalizeAgeGroup(ageGroup);
      if (!normalizedAgeGroup) {
        return res.status(400).json({ message: "Invalid ageGroup" });
      }
      updateData.ageGroup = normalizedAgeGroup;
    }

    if (profileText !== undefined) {
      updateData.profileText = profileText || null;
    }

    if (iconUrl !== undefined) {
      updateData.iconUrl = iconUrl || null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: updateData,
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
    });

    return res.json({
      profile: {
        id: Number(updatedUser.id),
        username: updatedUser.username,
        signLanguageLevel: updatedUser.signLanguageLevel,
        firstLanguage: updatedUser.firstLanguage,
        profileText: updatedUser.profileText,
        gender: updatedUser.gender,
        ageGroup: updatedUser.ageGroup,
        iconUrl: updatedUser.iconUrl,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (err) {
    console.error("PUT /api/profile failed", err);
    return res
      .status(500)
      .json({ message: "internal error", detail: (err as Error).message });
  }
});

export default router;
