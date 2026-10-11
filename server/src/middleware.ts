import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { User } from "./auth.js";

export function requireAuth(
  secret: string,
  findUserById: (id: string) => Promise<User | null>,
): RequestHandler {
  return async (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Please sign in." });
      return;
    }

    const token = authorization.slice(7).trim();

    let subject: string;
    try {
      const payload = jwt.verify(token, secret, {
        algorithms: ["HS256"],
      });

      if (typeof payload === "string" || !payload.sub) {
        res.status(401).json({ message: "Invalid session." });
        return;
      }

      subject = payload.sub;
    } catch {
      res.status(401).json({
        message: "Your session has expired or is invalid. Please sign in.",
      });
      return;
    }

    try {
      const user = await findUserById(subject);
      if (!user) {
        res.status(401).json({ message: "User not found." });
        return;
      }
      res.locals.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
