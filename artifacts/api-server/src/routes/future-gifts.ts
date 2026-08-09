import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, futureGiftsTable } from "@workspace/db";
import {
  ListFutureGiftsResponse,
  CreateFutureGiftBody,
  CreateFutureGiftResponse,
  GetFutureGiftParams,
  GetFutureGiftResponse,
} from "@workspace/api-zod";
import { emitToUser } from "./events";

const router: IRouter = Router();

function isLocked(unlockDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const unlock = new Date(unlockDate);
  unlock.setHours(0, 0, 0, 0);
  return unlock > today;
}

router.get("/future-gifts", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const gifts = await db
    .select()
    .from(futureGiftsTable)
    .where(eq(futureGiftsTable.userId, req.user.id));

  const result = gifts.map((g) => ({
    id: g.id,
    title: g.title,
    recipientName: g.recipientName,
    unlockDate: g.unlockDate,
    isLocked: isLocked(g.unlockDate),
    message: isLocked(g.unlockDate) ? null : (g.message ?? null),
    photoUrls: isLocked(g.unlockDate) ? [] : g.photoUrls,
    createdAt: g.createdAt,
  }));

  res.json(ListFutureGiftsResponse.parse(result));
});

router.post("/future-gifts", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateFutureGiftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [gift] = await db
    .insert(futureGiftsTable)
    .values({
      ...parsed.data,
      userId: req.user.id,
      photoUrls: parsed.data.photoUrls || [],
    })
    .returning();

  emitToUser(req.user.id, "futureGift.created", { id: gift.id });

  res.status(201).json(
    CreateFutureGiftResponse.parse({
      ...gift,
      isLocked: isLocked(gift.unlockDate),
      message: gift.message ?? null,
    })
  );
});

router.get("/future-gifts/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetFutureGiftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const gift = await db.query.futureGiftsTable.findFirst({
    where: and(eq(futureGiftsTable.id, params.data.id), eq(futureGiftsTable.userId, req.user.id)),
  });

  if (!gift) {
    res.status(404).json({ error: "Future gift not found" });
    return;
  }

  const locked = isLocked(gift.unlockDate);

  res.json(
    GetFutureGiftResponse.parse({
      id: gift.id,
      title: gift.title,
      recipientName: gift.recipientName,
      unlockDate: gift.unlockDate,
      isLocked: locked,
      message: locked ? null : (gift.message ?? null),
      photoUrls: locked ? [] : gift.photoUrls,
      createdAt: gift.createdAt,
    })
  );
});

export default router;
