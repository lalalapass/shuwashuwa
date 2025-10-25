import { Router, type Response } from "express";
import { PrismaClient, $Enums } from "@prisma/client";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const prisma = new PrismaClient();

// Create a video call schedule proposal
router.post("/schedule", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const { chatRoomId, title, description, proposedAt } = req.body ?? {};

    if (!chatRoomId || !title || !proposedAt) {
      return res.status(400).json({ message: "chatRoomId, title, and proposedAt are required" });
    }

    // Verify user has access to this chat room
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: BigInt(chatRoomId) },
    });

    if (!chatRoom || (Number(chatRoom.user1Id) !== userId && Number(chatRoom.user2Id) !== userId)) {
      return res.status(403).json({ message: "unauthorized access to chat room" });
    }

    const schedule = await prisma.videoCallSchedule.create({
      data: {
        chatRoomId: BigInt(chatRoomId),
        proposerId: BigInt(userId),
        title,
        description: description || null,
        proposedAt: new Date(proposedAt),
        status: $Enums.ScheduleStatus.pending,
      },
      include: {
        proposer: {
          select: { username: true },
        },
      },
    });

    return res.status(201).json({
      schedule: {
        id: Number(schedule.id),
        chatRoomId: Number(schedule.chatRoomId),
        proposerId: Number(schedule.proposerId),
        proposerUsername: schedule.proposer.username,
        title: schedule.title,
        description: schedule.description,
        proposedAt: schedule.proposedAt,
        status: schedule.status,
        createdAt: schedule.createdAt,
      },
    });
  } catch (err) {
    console.error("POST /api/video-call/schedule failed", err);
    return res
      .status(500)
      .json({ message: "internal error", detail: (err as Error).message });
  }
});

// Get schedules for a chat room
router.get("/schedule/:chatRoomId", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const chatRoomId = Number(req.params.chatRoomId);

    // Verify user has access to this chat room
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: BigInt(chatRoomId) },
    });

    if (!chatRoom || (Number(chatRoom.user1Id) !== userId && Number(chatRoom.user2Id) !== userId)) {
      return res.status(403).json({ message: "unauthorized access to chat room" });
    }

    const schedules = await prisma.videoCallSchedule.findMany({
      where: { chatRoomId: BigInt(chatRoomId) },
      include: {
        proposer: {
          select: { username: true },
        },
      },
      orderBy: { proposedAt: "asc" },
    });

    return res.json({
      schedules: schedules.map((schedule) => ({
        id: Number(schedule.id),
        chatRoomId: Number(schedule.chatRoomId),
        proposerId: Number(schedule.proposerId),
        proposerUsername: schedule.proposer.username,
        title: schedule.title,
        description: schedule.description,
        proposedAt: schedule.proposedAt,
        status: schedule.status,
        createdAt: schedule.createdAt,
      })),
    });
  } catch (err) {
    console.error("GET /api/video-call/schedule/:chatRoomId failed", err);
    return res
      .status(500)
      .json({ message: "internal error", detail: (err as Error).message });
  }
});

// Respond to a schedule proposal
router.put("/schedule/:scheduleId", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const scheduleId = Number(req.params.scheduleId);
    const { action } = req.body ?? {}; // "accept" or "reject"

    if (!action || (action !== "accept" && action !== "reject")) {
      return res.status(400).json({ message: "invalid action" });
    }

    const schedule = await prisma.videoCallSchedule.findUnique({
      where: { id: BigInt(scheduleId) },
      include: {
        chatRoom: true,
      },
    });

    if (!schedule) {
      return res.status(404).json({ message: "schedule not found" });
    }

    // Verify user has access to this chat room and is not the proposer
    const chatRoom = schedule.chatRoom;
    if (
      (Number(chatRoom.user1Id) !== userId && Number(chatRoom.user2Id) !== userId) ||
      Number(schedule.proposerId) === userId
    ) {
      return res.status(403).json({ message: "unauthorized" });
    }

    const updatedSchedule = await prisma.videoCallSchedule.update({
      where: { id: BigInt(scheduleId) },
      data: {
        status: action === "accept" ? $Enums.ScheduleStatus.accepted : $Enums.ScheduleStatus.rejected,
      },
      include: {
        proposer: {
          select: { username: true },
        },
      },
    });

    return res.json({
      schedule: {
        id: Number(updatedSchedule.id),
        chatRoomId: Number(updatedSchedule.chatRoomId),
        proposerId: Number(updatedSchedule.proposerId),
        proposerUsername: updatedSchedule.proposer.username,
        title: updatedSchedule.title,
        description: updatedSchedule.description,
        proposedAt: updatedSchedule.proposedAt,
        status: updatedSchedule.status,
        createdAt: updatedSchedule.createdAt,
      },
    });
  } catch (err) {
    console.error("PUT /api/video-call/schedule/:scheduleId failed", err);
    return res
      .status(500)
      .json({ message: "internal error", detail: (err as Error).message });
  }
});

// Start a video call session
router.post("/session", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const { chatRoomId } = req.body ?? {};

    if (!chatRoomId) {
      return res.status(400).json({ message: "chatRoomId is required" });
    }

    // Verify user has access to this chat room
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: BigInt(chatRoomId) },
    });

    if (!chatRoom || (Number(chatRoom.user1Id) !== userId && Number(chatRoom.user2Id) !== userId)) {
      return res.status(403).json({ message: "unauthorized access to chat room" });
    }

    // Check if there's already an active session
    const existingSession = await prisma.videoCallSession.findFirst({
      where: {
        chatRoomId: BigInt(chatRoomId),
        isActive: true,
      },
    });

    if (existingSession) {
      return res.json({
        session: {
          id: Number(existingSession.id),
          chatRoomId: Number(existingSession.chatRoomId),
          starterId: Number(existingSession.starterId),
          roomId: existingSession.roomId,
          isActive: existingSession.isActive,
          startedAt: existingSession.startedAt,
        },
      });
    }

    // Create new session
    const roomId = uuidv4();
    const session = await prisma.videoCallSession.create({
      data: {
        chatRoomId: BigInt(chatRoomId),
        starterId: BigInt(userId),
        roomId,
        isActive: true,
      },
    });

    return res.status(201).json({
      session: {
        id: Number(session.id),
        chatRoomId: Number(session.chatRoomId),
        starterId: Number(session.starterId),
        roomId: session.roomId,
        isActive: session.isActive,
        startedAt: session.startedAt,
      },
    });
  } catch (err) {
    console.error("POST /api/video-call/session failed", err);
    return res
      .status(500)
      .json({ message: "internal error", detail: (err as Error).message });
  }
});

// End a video call session
router.put("/session/:sessionId/end", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const sessionId = Number(req.params.sessionId);

    const session = await prisma.videoCallSession.findUnique({
      where: { id: BigInt(sessionId) },
      include: {
        chatRoom: true,
      },
    });

    if (!session) {
      return res.status(404).json({ message: "session not found" });
    }

    // Verify user has access to this chat room
    const chatRoom = session.chatRoom;
    if (Number(chatRoom.user1Id) !== userId && Number(chatRoom.user2Id) !== userId) {
      return res.status(403).json({ message: "unauthorized" });
    }

    const updatedSession = await prisma.videoCallSession.update({
      where: { id: BigInt(sessionId) },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });

    return res.json({
      session: {
        id: Number(updatedSession.id),
        chatRoomId: Number(updatedSession.chatRoomId),
        starterId: Number(updatedSession.starterId),
        roomId: updatedSession.roomId,
        isActive: updatedSession.isActive,
        startedAt: updatedSession.startedAt,
        endedAt: updatedSession.endedAt,
      },
    });
  } catch (err) {
    console.error("PUT /api/video-call/session/:sessionId/end failed", err);
    return res
      .status(500)
      .json({ message: "internal error", detail: (err as Error).message });
  }
});

// Get active session for a chat room
router.get("/session/:chatRoomId", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const chatRoomId = Number(req.params.chatRoomId);

    // Verify user has access to this chat room
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: BigInt(chatRoomId) },
    });

    if (!chatRoom || (Number(chatRoom.user1Id) !== userId && Number(chatRoom.user2Id) !== userId)) {
      return res.status(403).json({ message: "unauthorized access to chat room" });
    }

    const session = await prisma.videoCallSession.findFirst({
      where: {
        chatRoomId: BigInt(chatRoomId),
        isActive: true,
      },
    });

    if (!session) {
      return res.json({ session: null });
    }

    return res.json({
      session: {
        id: Number(session.id),
        chatRoomId: Number(session.chatRoomId),
        starterId: Number(session.starterId),
        roomId: session.roomId,
        isActive: session.isActive,
        startedAt: session.startedAt,
      },
    });
  } catch (err) {
    console.error("GET /api/video-call/session/:chatRoomId failed", err);
    return res
      .status(500)
      .json({ message: "internal error", detail: (err as Error).message });
  }
});

export default router;
