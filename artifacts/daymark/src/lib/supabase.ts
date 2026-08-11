import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY (or their VITE_ equivalents).',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'daymark-auth',
  },
});

/**
 * Sync the Supabase access token into a first-party cookie.
 * This lets existing `fetch(..., { credentials: 'include' })` calls reach the
 * Express API server without changing every call site.
 *
 * Cookie flags:
 * - SameSite=Lax  (not Strict) — Strict breaks top-level navigations from
 *   external origins such as email verification/reset links. Lax allows
 *   cross-site GET navigations while still blocking cross-site POST/AJAX.
 * - Secure         — set automatically on HTTPS (required for deployed app).
 * - path=/         — all API routes share the same cookie.
 * Note: this cookie cannot be HttpOnly because it is written by JS. The API
 * also accepts the Bearer token directly, so the cookie is a convenience layer.
 */
export function syncAuthCookie(accessToken: string | null, expiresIn?: number): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  if (accessToken) {
    const maxAge = expiresIn ?? 3600;
    document.cookie = `sb-token=${encodeURIComponent(accessToken)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
  } else {
    document.cookie = `sb-token=; path=/; max-age=0; SameSite=Lax${secure}`;
  }
}

/**
 * authFetch — wraps fetch() with the current Supabase Bearer token.
 * Use this for one-off fetch calls in pages that aren't using api-client-react hooks.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers(init?.headers);
  if (session?.access_token && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${session.access_token}`);
  }
  return fetch(input, { credentials: 'include', ...init, headers });
}
