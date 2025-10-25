import { Router, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, type AuthedRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Check if user has access to chat room
async function hasRoomAccess(userId: number, roomId: number): Promise<boolean> {
  const room = await prisma.chatRoom.findUnique({
    where: { id: BigInt(roomId) },
    select: { user1Id: true, user2Id: true },
  });
  
  if (!room) return false;
  
  return Number(room.user1Id) === userId || Number(room.user2Id) === userId;
}

// Get chat messages
router.get("/:roomId/messages", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const roomId = Number(req.params.roomId);

    if (!await hasRoomAccess(userId, roomId)) {
      return res.status(403).json({ message: "access denied" });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { chatRoomId: BigInt(roomId) },
      select: {
        id: true,
        chatRoomId: true,
        senderId: true,
        messageText: true,
        videoUrl: true,
        createdAt: true,
        sender: { select: { username: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    const result = messages.map((m) => ({
      id: Number(m.id),
      chatRoomId: Number(m.chatRoomId),
      senderId: Number(m.senderId),
      senderUsername: m.sender.username,
      messageText: m.messageText,
      videoUrl: m.videoUrl,
      createdAt: m.createdAt,
    }));

    return res.json({ messages: result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("GET /api/chat/:roomId/messages failed", err);
    return res.status(500).json({ message: "internal error" });
  }
});

// Send chat message
router.post("/:roomId/messages", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const roomId = Number(req.params.roomId);
    const { messageText, videoUrl } = req.body ?? {};

    if (!await hasRoomAccess(userId, roomId)) {
      return res.status(403).json({ message: "access denied" });
    }

    if (!messageText && !videoUrl) {
      return res.status(400).json({ message: "messageText or videoUrl required" });
    }

    const created = await prisma.chatMessage.create({
      data: {
        chatRoomId: BigInt(roomId),
        senderId: BigInt(userId),
        messageText: messageText ?? null,
        videoUrl: videoUrl ?? null,
      },
      select: {
        id: true,
        chatRoomId: true,
        senderId: true,
        messageText: true,
        videoUrl: true,
        createdAt: true,
        sender: { select: { username: true } },
      },
    });

    return res.status(201).json({
      message: {
        id: Number(created.id),
        chatRoomId: Number(created.chatRoomId),
        senderId: Number(created.senderId),
        senderUsername: created.sender.username,
        messageText: created.messageText,
        videoUrl: created.videoUrl,
        createdAt: created.createdAt,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("POST /api/chat/:roomId/messages failed", err);
    return res.status(500).json({ message: "internal error" });
  }
});

// Get user's chat rooms
router.get("/rooms", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId as number;

    const rooms = await prisma.chatRoom.findMany({
      where: {
        OR: [
          { user1Id: BigInt(userId) },
          { user2Id: BigInt(userId) },
        ],
      },
      select: {
        id: true,
        user1Id: true,
        user2Id: true,
        createdAt: true,
        user1: { select: { username: true } },
        user2: { select: { username: true } },
        messages: {
          select: { messageText: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const result = rooms.map((r) => {
      const otherUser = Number(r.user1Id) === userId ? r.user2 : r.user1;
      const lastMessage = r.messages[0];
      
      return {
        id: Number(r.id),
        otherUserId: Number(r.user1Id) === userId ? Number(r.user2Id) : Number(r.user1Id),
        otherUsername: otherUser.username,
        lastMessage: lastMessage?.messageText ?? null,
        lastMessageAt: lastMessage?.createdAt ?? r.createdAt,
        createdAt: r.createdAt,
      };
    });

    return res.json({ rooms: result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("GET /api/chat/rooms failed", err);
    return res.status(500).json({ message: "internal error" });
  }
});

export default router;
