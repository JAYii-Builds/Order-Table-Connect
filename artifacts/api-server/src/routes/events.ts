import { Router, type IRouter } from "express";
import { verifyToken } from "../lib/jwt";
import { addClient } from "../lib/sse";

const router: IRouter = Router();

router.get("/events", (req, res): void => {
  const token = req.query["token"] as string | undefined;

  if (!token) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  try {
    verifyToken(token);
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write("event: ping\ndata: {}\n\n");

  const remove = addClient(res);

  const heartbeat = setInterval(() => {
    try {
      res.write("event: ping\ndata: {}\n\n");
    } catch {
      clearInterval(heartbeat);
      remove();
    }
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    remove();
  });
});

export default router;
