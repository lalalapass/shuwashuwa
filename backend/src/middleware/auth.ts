import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthedRequest extends Request {
  userId?: number;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const auth = req.headers["authorization"] ?? req.headers["Authorization"];
    if (!auth || typeof auth !== "string" || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ message: "missing bearer token" });
    }
    const token = auth.slice("Bearer ".length).trim();
    const secret = process.env.JWT_SECRET ?? "dev-secret";
    const payload = jwt.verify(token, secret) as { sub?: string };
    const sub = payload?.sub;
    if (!sub) return res.status(401).json({ message: "invalid token" });
    req.userId = Number(sub);
    return next();
  } catch {
    return res.status(401).json({ message: "invalid token" });
  }
}


