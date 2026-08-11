import { getAuth, clerkClient } from '@clerk/express';
import { eq, and, or } from 'drizzle-orm';
import {
  db, usersTable,
  memoriesTable, peopleTable, connectionsTable, notificationsTable,
  scheduledMessagesTable, futureGiftsTable, relationshipEventsTable,
  calendarEventsTable, memoryDropsTable, memoryShareLinksTable,
  birthdayWishesTable, invitesTable, monthlyCapsulesTable,
} from '@workspace/db';
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

    // Extended privacy fields
    const {
      allowConnectionRequests,
      birthdayVisibility,
      allowBirthdayWishesFromConnections,
      allowBirthdayWishesFromGlobe,
      defaultMemoryVisibility,
      defaultGlobeIdentity,
      defaultGlobeLocation,
      showPublicProfile,
    } = req.body as Record<string, unknown>;
    if (allowConnectionRequests !== undefined) updates.allowConnectionRequests = allowConnectionRequests;
    if (birthdayVisibility !== undefined) updates.birthdayVisibility = birthdayVisibility;
    if (allowBirthdayWishesFromConnections !== undefined) updates.allowBirthdayWishesFromConnections = allowBirthdayWishesFromConnections;
    if (allowBirthdayWishesFromGlobe !== undefined) updates.allowBirthdayWishesFromGlobe = allowBirthdayWishesFromGlobe;
    if (defaultMemoryVisibility !== undefined) updates.defaultMemoryVisibility = defaultMemoryVisibility;
    if (defaultGlobeIdentity !== undefined) updates.defaultGlobeIdentity = defaultGlobeIdentity;
    if (defaultGlobeLocation !== undefined) updates.defaultGlobeLocation = defaultGlobeLocation;
    if (showPublicProfile !== undefined) updates.showPublicProfile = showPublicProfile;

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

/**
 * PATCH /auth/notification-settings
 * Persist notification preference toggles to the DB.
 * Body: Record<string, boolean> — keys match frontend NotifKey enum.
 */
router.patch(
  '/auth/notification-settings',
  requireAuth,
  async (req: Request, res: Response) => {
    const settings = req.body as Record<string, boolean>;
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'Invalid settings payload' });
      return;
    }
    const [updated] = await db
      .update(usersTable)
      .set({ notificationSettings: settings, updatedAt: new Date() } as any)
      .where(eq(usersTable.id, req.dbUser.id))
      .returning();
    res.json({ user: updated });
  },
);

/**
 * DELETE /auth/account
 * Permanently deletes the user's account and all associated data.
 * Requires confirmation header: X-Confirm-Delete: yes
 */
router.delete(
  '/auth/account',
  requireAuth,
  async (req: Request, res: Response) => {
    if (req.headers['x-confirm-delete'] !== 'yes') {
      res.status(400).json({ error: 'Missing confirmation header' });
      return;
    }
    const userId = req.dbUser.id;
    try {
      // Cascade delete in dependency order (children first)
      await db.delete(birthdayWishesTable).where(
        or(eq(birthdayWishesTable.senderUserId, userId), eq(birthdayWishesTable.recipientUserId, userId))
      );
      await db.delete(memoryShareLinksTable).where(eq(memoryShareLinksTable.ownerUserId, userId));
      await db.delete(memoryDropsTable).where(
        or(eq(memoryDropsTable.senderUserId, userId), eq(memoryDropsTable.recipientUserId, userId))
      );
      await db.delete(scheduledMessagesTable).where(
        or(eq(scheduledMessagesTable.senderUserId, userId), eq(scheduledMessagesTable.recipientUserId, userId))
      );
      await db.delete(futureGiftsTable).where(eq(futureGiftsTable.userId, userId));
      await db.delete(calendarEventsTable).where(eq(calendarEventsTable.userId, userId));
      await db.delete(relationshipEventsTable).where(eq(relationshipEventsTable.ownerUserId, userId));
      await db.delete(notificationsTable).where(eq(notificationsTable.userId, userId));
      await db.delete(connectionsTable).where(
        or(eq(connectionsTable.requesterUserId, userId), eq(connectionsTable.recipientUserId, userId))
      );
      await db.delete(invitesTable).where(eq(invitesTable.inviterUserId, userId));
      await db.delete(monthlyCapsulesTable).where(eq(monthlyCapsulesTable.userId, userId));
      await db.delete(peopleTable).where(eq(peopleTable.userId, userId));
      await db.delete(memoriesTable).where(eq(memoriesTable.userId, userId));
      await db.delete(usersTable).where(eq(usersTable.id, userId));

      // Delete Clerk user after DB records (don't rollback on Clerk failure)
      try {
        await clerkClient.users.deleteUser(userId);
      } catch (clerkErr) {
        console.error('[auth/delete] Clerk user deletion failed:', clerkErr);
      }

      res.json({ deleted: true });
    } catch (err) {
      console.error('[auth/delete] Error:', err);
      res.status(500).json({ error: 'Account deletion failed' });
    }
  },
);

/**
 * GET /auth/export
 * Returns a JSON export of the user's own data.
 * Does NOT include other users' private data.
 */
router.get(
  '/auth/export',
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.dbUser.id;
    const [profile, memories, people, connections, messages, gifts] = await Promise.all([
      db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) }),
      db.query.memoriesTable.findMany({ where: eq(memoriesTable.userId, userId) }),
      db.query.peopleTable.findMany({ where: eq(peopleTable.userId, userId) }),
      db.query.connectionsTable.findMany({
        where: or(eq(connectionsTable.requesterUserId, userId), eq(connectionsTable.recipientUserId, userId)),
      }),
      db.query.scheduledMessagesTable.findMany({ where: eq(scheduledMessagesTable.senderUserId, userId) }),
      db.query.futureGiftsTable.findMany({ where: eq(futureGiftsTable.userId, userId) }),
    ]);

    // Strip sensitive metadata from connected user data
    const safeConnections = connections.map((c) => ({
      connectedUserId: c.requesterUserId === userId ? c.recipientUserId : c.requesterUserId,
      status: c.status,
      createdAt: c.createdAt,
    }));

    const safeMessages = messages.map(({ senderUserId: _, ...m }) => m);

    res.setHeader('Content-Disposition', `attachment; filename="daymark-export-${Date.now()}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      profile: {
        id: profile?.id,
        username: profile?.username,
        displayName: profile?.displayName,
        bio: profile?.bio,
        city: profile?.city,
        timezone: profile?.timezone,
        createdAt: profile?.createdAt,
      },
      memories: memories.map(({ userId: _, ...m }) => m),
      people: people.map(({ userId: _, ...p }) => p),
      connections: safeConnections,
      scheduledMessages: safeMessages,
      futureGifts: gifts.map(({ userId: _, ...g }) => g),
    });
  },
);

export default router;
