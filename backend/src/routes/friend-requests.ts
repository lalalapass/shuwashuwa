import { Router, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, type AuthedRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Send friend request
router.post("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const senderId = req.userId as number;
    const { receiverId, message } = req.body ?? {};

    if (!receiverId) {
      return res.status(400).json({ message: "receiverId required" });
    }

    // Check if request already exists
    const existing = await prisma.friendRequest.findFirst({
      where: {
        senderId: BigInt(senderId),
        receiverId: BigInt(receiverId),
        status: "pending",
      },
    });

    if (existing) {
      return res.status(409).json({ message: "request already sent" });
    }

    // Check if they are the same user
    if (senderId === Number(receiverId)) {
      return res.status(400).json({ message: "cannot send request to yourself" });
    }

    const created = await prisma.friendRequest.create({
      data: {
        senderId: BigInt(senderId),
        receiverId: BigInt(receiverId),
        message: message ?? null,
        status: "pending",
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        message: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      request: {
        id: Number(created.id),
        senderId: Number(created.senderId),
        receiverId: Number(created.receiverId),
        message: created.message,
        status: created.status,
        createdAt: created.createdAt,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("POST /api/friend-requests failed", err);
    return res.status(500).json({ message: "internal error" });
  }
});

// Get received friend requests
router.get("/received", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId as number;

    const requests = await prisma.friendRequest.findMany({
      where: {
        receiverId: BigInt(userId),
        status: "pending",
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        message: true,
        status: true,
        createdAt: true,
        sender: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = requests.map((r) => ({
      id: Number(r.id),
      senderId: Number(r.senderId),
      senderUsername: r.sender.username,
      receiverId: Number(r.receiverId),
      message: r.message,
      status: r.status,
      createdAt: r.createdAt,
    }));

    return res.json({ requests: result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("GET /api/friend-requests/received failed", err);
    return res.status(500).json({ message: "internal error" });
  }
});

// Accept or reject friend request
router.put("/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const requestId = Number(req.params.id);
    const { action } = req.body ?? {}; // "accept" or "reject"

    if (!action || !["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "action must be 'accept' or 'reject'" });
    }

    const request = await prisma.friendRequest.findUnique({
      where: { id: BigInt(requestId) },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        status: true,
      },
    });

    if (!request) {
      return res.status(404).json({ message: "request not found" });
    }

    if (Number(request.receiverId) !== userId) {
      return res.status(403).json({ message: "not authorized" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "request already processed" });
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";

    // Update request status
    await prisma.friendRequest.update({
      where: { id: BigInt(requestId) },
      data: { status: newStatus },
    });

    // If accepted, create chat room
    let chatRoomId = null;
    if (action === "accept") {
      const chatRoom = await prisma.chatRoom.create({
        data: {
          user1Id: request.senderId,
          user2Id: request.receiverId,
        },
        select: { id: true },
      });
      chatRoomId = Number(chatRoom.id);
    }

    return res.json({
      status: newStatus,
      chatRoomId,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("PUT /api/friend-requests/:id failed", err);
    return res.status(500).json({ message: "internal error" });
  }
});

export default router;
