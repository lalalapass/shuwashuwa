import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient, $Enums } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const {
      username,
      password,
      signLanguageLevel,
      firstLanguage,
      profileText,
      gender,
      ageGroup,
      iconUrl,
    } = req.body ?? {};

    if (!username || !password || !signLanguageLevel || !firstLanguage) {
      return res.status(400).json({ message: "required fields missing" });
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return res.status(409).json({ message: "username taken" });

    const passwordHash = await bcrypt.hash(String(password), 10);

    const normalize = (v?: string) => String(v ?? "").trim();
    const normalizeSign = (v: string): $Enums.SignLanguageLevel => {
      const s = normalize(v);
      const sl = s.toLowerCase();
      if (s === "初級" || sl.includes("begin" ) || sl.startsWith("b")) return "BEGINNER" as $Enums.SignLanguageLevel;
      if (s === "中級" || sl.includes("inter" ) || sl.startsWith("i")) return "INTERMEDIATE" as $Enums.SignLanguageLevel;
      if (s === "上級" || sl.includes("advan" ) || sl.startsWith("a")) return "ADVANCED" as $Enums.SignLanguageLevel;
      return "BEGINNER" as $Enums.SignLanguageLevel; // フォールバック
    };
    const normalizeFirst = (v: string): $Enums.FirstLanguage => {
      const s = normalize(v);
      const sl = s.toLowerCase();
      if (s === "音声言語" || sl.includes("spok") ) return "SPOKEN" as $Enums.FirstLanguage;
      if (s === "手話" || sl.includes("sign") ) return "SIGN" as $Enums.FirstLanguage;
      return "SPOKEN" as $Enums.FirstLanguage; // フォールバック
    };

    const created = await prisma.user.create({
      data: {
        username,
        passwordHash,
        signLanguageLevel: normalizeSign(signLanguageLevel),
        firstLanguage: normalizeFirst(firstLanguage),
        profileText: profileText ?? null,
        gender: gender ?? null,
        ageGroup: ageGroup ?? null,
        iconUrl: iconUrl ?? null,
      },
      select: { id: true, username: true },
    });
    const user = { id: Number(created.id), username: created.username };
    return res.status(201).json({ user });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("/api/auth/register failed", err);
    const anyErr = err as { code?: string; message?: string };
    if (anyErr?.code === "P2002") {
      return res.status(409).json({ message: "username taken" });
    }
    return res.status(500).json({ message: "internal error", detail: anyErr?.message });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ message: "required fields missing" });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ message: "invalid credentials" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ message: "invalid credentials" });

    const secret = process.env.JWT_SECRET ?? "dev-secret";
    const token = jwt.sign({ sub: String(user.id) }, secret, { expiresIn: "7d" });

    return res.json({ 
      token,
      user: { id: Number(user.id), username: user.username }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("/api/auth/login failed", err);
    const anyErr = err as { message?: string };
    return res.status(500).json({ message: "internal error", detail: anyErr?.message });
  }
});

export default router;


