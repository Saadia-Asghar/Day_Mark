import { getAuth } from '@clerk/express';
import { eq } from 'drizzle-orm';
import { db, usersTable } from '@workspace/db';
import { Router, type IRouter, type Request, type Response } from 'express';
import { requireAuth } from '../middlewares/requireAuth';

const router: IRouter = Router();

/**
 * GET /auth/user
 *
 * Returns the local DB user row for the currently signed-in Clerk user.
 * Used by the frontend to fetch app-specific data (onboardingCompleted).
 * Returns { user: null } for unauthenticated requests.
 */
router.get('/auth/user', async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const userId =
    (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;

  if (!userId) {
    res.json({ user: null });
    return;
  }

  const dbUser = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });

  res.json({ user: dbUser ?? null });
});

/**
 * PATCH /auth/profile
 *
 * Update local profile fields for the current user.
 * Accepts both basic identity fields and extended social/discovery fields.
 * Requires authentication.
 */
router.patch(
  '/auth/profile',
  requireAuth,
  async (req: Request, res: Response) => {
    const {
      firstName,
      lastName,
      profileImageUrl,
      username,
      displayName,
      bio,
      birthday,
      timezone,
      city,
      discoverableByUsername,
      discoverableByEmail,
    } = req.body as {
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
      username?: string;
      displayName?: string;
      bio?: string;
      birthday?: string;
      timezone?: string;
      city?: string;
      discoverableByUsername?: boolean;
      discoverableByEmail?: boolean;
    };

    // Validate username format if provided
    if (username !== undefined) {
      if (!/^[a-z0-9_]{3,24}$/.test(username)) {
        res
          .status(400)
          .json({ error: 'Username must be 3-24 chars: letters, numbers, and underscores only' });
        return;
      }
      // Check uniqueness against other users
      const taken = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .then((all: { id: string }[]) =>
          all.find((u) => (u as any).username === username && u.id !== req.dbUser.id),
        );
      if (taken) {
        res.status(409).json({ error: 'Username already taken' });
        return;
      }
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (profileImageUrl !== undefined) updates.profileImageUrl = profileImageUrl;
    if (username !== undefined) updates.username = username;
    if (displayName !== undefined) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (birthday !== undefined) updates.birthday = birthday;
    if (timezone !== undefined) updates.timezone = timezone;
    if (city !== undefined) updates.city = city;
    if (discoverableByUsername !== undefined) updates.discoverableByUsername = discoverableByUsername;
    if (discoverableByEmail !== undefined) updates.discoverableByEmail = discoverableByEmail;

    const [updated] = await db
      .update(usersTable)
      .set(updates as any)
      .where(eq(usersTable.id, req.dbUser.id))
      .returning();
    res.json({ user: updated });
  },
);

/**
 * POST /auth/onboarding/complete
 *
 * Mark onboarding as completed for the current user.
 * Requires authentication.
 */
router.post(
  '/auth/onboarding/complete',
  requireAuth,
  async (req: Request, res: Response) => {
    const [updated] = await db
      .update(usersTable)
      .set({ onboardingCompleted: true, updatedAt: new Date() })
      .where(eq(usersTable.id, req.dbUser.id))
      .returning();
    res.json({ user: updated });
  },
);

export default router;
