import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRouter from "./routes/auth";
import postsRouter from "./routes/posts";
import usersRouter from "./routes/users";
import friendRequestsRouter from "./routes/friend-requests";
import chatRouter from "./routes/chat";
import profileRouter from "./routes/profile";
import videoCallRouter from "./routes/video-call";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/posts", postsRouter);
app.use("/api/users", usersRouter);
app.use("/api/friend-requests", friendRequestsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/profile", profileRouter);
app.use("/api/video-call", videoCallRouter);

const port = Number(process.env.PORT ?? 3001);

if (require.main === module) {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`server started on http://localhost:${port}`);
  });
}

export default app;


