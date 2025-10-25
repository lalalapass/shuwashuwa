import { Router, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, type AuthedRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Create post
router.post("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const { contentText, contentVideoUrl } = req.body ?? {};

    const created = await prisma.post.create({
      data: {
        userId: BigInt(userId),
        contentText: contentText ?? null,
        contentVideoUrl: contentVideoUrl ?? null,
      },
      select: {
        id: true,
        userId: true,
        contentText: true,
        contentVideoUrl: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      post: {
        id: Number(created.id),
        userId: Number(created.userId),
        contentText: created.contentText,
        contentVideoUrl: created.contentVideoUrl,
        createdAt: created.createdAt,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("POST /api/posts failed", err);
    return res.status(500).json({ message: "internal error" });
  }
});

// Get latest posts
router.get("/", async (_req, res) => {
  try {
    const items = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        userId: true,
        contentText: true,
        contentVideoUrl: true,
        createdAt: true,
        user: { select: { username: true } },
        _count: { select: { likes: true } },
      },
    });

    const posts = items.map((p) => ({
      id: Number(p.id),
      userId: Number(p.userId),
      username: p.user.username,
      contentText: p.contentText,
      contentVideoUrl: p.contentVideoUrl,
      createdAt: p.createdAt,
      likeCount: p._count.likes,
    }));

    return res.json({ posts });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("GET /api/posts failed", err);
    return res.status(500).json({ message: "internal error" });
  }
});

// Like toggle
router.post("/:id/like", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const postId = Number(req.params.id);

    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId: BigInt(postId), userId: BigInt(userId) } },
    });

    if (existing) {
      await prisma.postLike.delete({ where: { postId_userId: { postId: BigInt(postId), userId: BigInt(userId) } } });
      return res.json({ liked: false });
    }

    await prisma.postLike.create({ data: { postId: BigInt(postId), userId: BigInt(userId) } });
    return res.json({ liked: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("POST /api/posts/:id/like failed", err);
    return res.status(500).json({ message: "internal error" });
  }
});

export default router;


