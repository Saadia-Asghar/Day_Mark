import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, dailyPromptsTable, promptResponsesTable, memoriesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { emitToUser } from "./events";

const router: IRouter = Router();

/**
 * GET /api/prompts/today
 * Returns the active prompt for today + the current user's response if they've answered.
 */
router.get("/prompts/today", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser.id;
  const todayStr = new Date().toISOString().slice(0, 10);

  const prompt = await db.query.dailyPromptsTable.findFirst({
    where: eq(dailyPromptsTable.activeDate, todayStr),
  });

  if (!prompt) {
    // No prompt seeded for today — return a fallback
    res.json({
      prompt: null,
      response: null,
    });
    return;
  }

  const existing = await db.query.promptResponsesTable.findFirst({
    where: and(
      eq(promptResponsesTable.promptId, prompt.id),
      eq(promptResponsesTable.userId, userId)
    ),
  });

  res.json({
    prompt: { id: prompt.id, text: prompt.text, category: prompt.category, activeDate: prompt.activeDate },
    response: existing
      ? { id: existing.id, responseText: existing.responseText, memoryId: existing.memoryId }
      : null,
  });
});

/**
 * POST /api/prompts/:id/respond
 * Body: { responseText, mode: "private" | "memory" | "shared", sharedWithUserId? }
 * "memory" mode creates a memory from the response.
 * "shared" mode marks it as shared with a connection (can qualify for Daylink).
 */
router.post("/prompts/:id/respond", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser.id;
  const promptId = Number(req.params.id);
  const { responseText, mode = "private", sharedWithUserId } = req.body as {
    responseText?: string;
    mode?: "private" | "memory" | "shared";
    sharedWithUserId?: string;
  };

  if (!responseText?.trim()) {
    res.status(400).json({ error: "responseText is required" });
    return;
  }

  const prompt = await db.query.dailyPromptsTable.findFirst({
    where: eq(dailyPromptsTable.id, promptId),
  });
  if (!prompt) {
    res.status(404).json({ error: "Prompt not found" });
    return;
  }

  // Check if already responded today
  const existing = await db.query.promptResponsesTable.findFirst({
    where: and(
      eq(promptResponsesTable.promptId, promptId),
      eq(promptResponsesTable.userId, userId)
    ),
  });
  if (existing) {
    res.status(409).json({ error: "Already responded to this prompt" });
    return;
  }

  let memoryId: number | null = null;

  if (mode === "memory") {
    // Create a memory from the response
    const [memory] = await db
      .insert(memoriesTable)
      .values({
        userId,
        title: prompt.text,
        story: responseText,
        date: prompt.activeDate ?? new Date().toISOString().slice(0, 10),
        giftColor: "#6847F5",
        giftWrap: "ribbon",
        mood: "reflective",
      } as any)
      .returning();
    memoryId = memory.id;
  }

  const [response] = await db
    .insert(promptResponsesTable)
    .values({
      promptId,
      userId,
      responseText,
      sharedWithUserId: mode === "shared" ? sharedWithUserId ?? null : null,
      memoryId,
    })
    .returning();

  // If shared with a connection, notify them (qualifies for Daylink via shared prompt answer)
  if (mode === "shared" && sharedWithUserId) {
    try {
      await emitToUser(sharedWithUserId, { type: "notification.created", data: { type: "prompt_shared" } });
    } catch (_) {}
  }

  res.status(201).json({ response, memoryId });
});

export default router;
