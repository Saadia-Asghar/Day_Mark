import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { db, usersTable, pool } from '@workspace/db';
import { type NextFunction, type Request, type Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      dbUser: typeof usersTable.$inferSelect;
    }
  }
}

// Admin client used solely to verify user tokens — service role never leaves the server.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * Extract the raw access token from the incoming request.
 * Checks: 1. Authorization: Bearer <token>  2. sb-token cookie (set by the SPA)
 */
function getTokenString(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)sb-token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Verify the token with Supabase and return { sub, email } — or null on failure.
 * Uses supabase.auth.getUser() so the algorithm and secret are handled by Supabase itself.
 */
async function verifyToken(req: Request): Promise<{ sub: string; email?: string } | null> {
  const token = getTokenString(req);
  if (!token) {
    console.warn('[requireAuth] no token found (no Bearer header, no sb-token cookie)');
    return null;
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    console.warn('[requireAuth] token verification failed:', error?.message ?? 'no user returned');
    return null;
  }
  return { sub: data.user.id, email: data.user.email };
}

/**
 * Resolve a Supabase UUID to a local DB user row.
 *
 * Strategy (no PK mutation — all FK constraints remain intact):
 *  1. Look up by supabase_id  → fast path for returning users
 *  2. If not found, look up by email and SET supabase_id on that row
 *     → legacy users (e.g. Clerk) get their supabase_id stamped in place;
 *        their `id` and all FK-referenced child rows are untouched.
 *  3. If still not found, insert a brand-new row
 *     (id = supabaseUuid, supabase_id = supabaseUuid).
 */
async function resolveUser(
  supabaseUuid: string,
  email: string | undefined,
): Promise<typeof usersTable.$inferSelect | null> {
  // 1. Fast path
  let [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.supabaseId, supabaseUuid))
    .limit(1);
  if (dbUser) return dbUser;

  // 2. Email bridge — stamp supabase_id on legacy row (safe: no PK change)
  if (email) {
    const result = await pool.query<typeof usersTable.$inferSelect>(
      `UPDATE users SET supabase_id = $1
       WHERE email = $2 AND supabase_id IS NULL
       RETURNING *`,
      [supabaseUuid, email],
    );
    if (result.rows.length > 0) return result.rows[0];
  }

  // 3. Brand-new user
  const [inserted] = await db
    .insert(usersTable)
    .values({ id: supabaseUuid, supabaseId: supabaseUuid, email })
    .onConflictDoNothing()
    .returning();

  if (inserted) return inserted;

  // Race condition: another request inserted first — re-fetch
  const [refetched] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.supabaseId, supabaseUuid))
    .limit(1);
  return refetched ?? null;
}

/**
 * requireAuth — Express middleware.
 *
 * Verifies the Supabase token (via supabase.auth.getUser), resolves (or
 * provisions) the local DB user row, and attaches it to req.dbUser.
 * Returns 401 if authentication fails.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const decoded = await verifyToken(req);
  if (!decoded) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const dbUser = await resolveUser(decoded.sub, decoded.email);
  if (!dbUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.dbUser = dbUser;
  next();
}

/**
 * optionalAuth — like requireAuth but never sends 401.
 *
 * Attaches req.dbUser when a valid token is present; otherwise leaves it unset.
 * Use for routes that serve both authenticated and anonymous clients.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const decoded = await verifyToken(req);
  if (decoded) {
    const dbUser = await resolveUser(decoded.sub, decoded.email);
    if (dbUser) req.dbUser = dbUser;
  }
  next();
}
