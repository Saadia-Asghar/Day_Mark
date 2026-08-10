import { getAuth } from '@clerk/express';
import { eq } from 'drizzle-orm';
import { db, usersTable } from '@workspace/db';
import { type NextFunction, type Request, type Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      dbUser: typeof usersTable.$inferSelect;
    }
  }
}

/**
 * Clerk-backed auth guard + JIT user provisioning.
 *
 * 1. Reads the Clerk session from the request (populated by clerkMiddleware).
 * 2. Derives the bridge ID: sessionClaims.userId for migrated Replit Auth users
 *    (their legacy subject ID preserved as externalId in Clerk), or auth.userId
 *    for brand-new Clerk users.
 * 3. Looks up the local DB row; inserts one on first visit (JIT provisioning).
 * 4. Attaches the DB row to req.dbUser for downstream route handlers.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  // sessionClaims.userId = legacy Replit Auth subject (externalId) for migrated users,
  // or Clerk native ID for new users. Use this for local DB lookups.
  const userId =
    (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // JIT provisioning: find or create the local user row on first authenticated request
  let [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!dbUser) {
    const [inserted] = await db
      .insert(usersTable)
      .values({ id: userId })
      .onConflictDoNothing()
      .returning();
    if (inserted) {
      dbUser = inserted;
    } else {
      // Race condition: another request inserted first
      [dbUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
    }
  }

  if (!dbUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.dbUser = dbUser;
  next();
}
