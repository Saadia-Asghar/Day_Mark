/**
 * Server-Sent Events endpoint for real-time updates.
 * Authenticated users subscribe here; the server pushes events via emitToUser().
 * Falls back gracefully to REST polling if the connection is lost.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Map of userId -> set of SSE response objects
const clients = new Map<string, Set<Response>>();

export type SSEEventName =
  | "memory.created"
  | "memory.updated"
  | "memory.deleted"
  | "sharedMemory.updated"
  | "futureGift.created"
  | "futureGift.unlocked"
  | "notification.created"
  | "person.updated"
  | "connection.requested"
  | "connection.accepted"
  | "memoryDrop.created"
  | "daylink.updated"
  | "scheduledMessage.received"
  | "ping";

export function emitToUser(userId: string, event: SSEEventName, data: unknown) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of userClients) {
    try {
      res.write(payload);
    } catch {
      // client disconnected — cleanup handled below
    }
  }
}

export function emitToAll(event: SSEEventName, data: unknown) {
  for (const userId of clients.keys()) {
    emitToUser(userId, event, data);
  }
}

router.get("/events", requireAuth, (req: Request, res: Response) => {
  const userId = req.dbUser.id;

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable Nginx buffering
  res.flushHeaders();

  // Register client
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(res);

  // Initial ping so the browser knows the stream is live
  res.write(`event: ping\ndata: {"ts":${Date.now()}}\n\n`);

  // Keep-alive heartbeat every 25 s
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: ping\ndata: {"ts":${Date.now()}}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    const set = clients.get(userId);
    if (set) {
      set.delete(res);
      if (set.size === 0) clients.delete(userId);
    }
  });
});

export default router;
