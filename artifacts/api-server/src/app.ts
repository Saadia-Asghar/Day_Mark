import express, { type Express } from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import { clerkMiddleware } from '@clerk/express';
import { publishableKeyFromHost } from '@clerk/shared/keys';
import router from './routes';
import { logger } from './lib/logger';
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from './middlewares/clerkProxyMiddleware';

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split('?')[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Clerk proxy must be mounted BEFORE body parsers (streams raw bytes)
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// credentials: true + origin: true allows browser to send Clerk session cookies cross-origin via Replit proxy
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Resolve publishable key from the incoming request host so the same server
// can serve multiple Clerk custom domains. Falls back to CLERK_PUBLISHABLE_KEY.
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? '',
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

// ── Rate limiting ────────────────────────────────────────────────────────────
// Broad API limit — 300 req/min per IP
app.use('/api', rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
}));

// Tight limit for auth-adjacent + write-heavy endpoints
const strictLimit = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded.' },
});
app.use('/api/connections', strictLimit);
app.use('/api/invites', strictLimit);
app.use('/api/drops', strictLimit);
app.use('/api/auth/account', strictLimit);
app.use('/api/users/search', rateLimit({ windowMs: 60_000, max: 40, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/globe/reactions', rateLimit({ windowMs: 60_000, max: 30, standardHeaders: 'draft-7', legacyHeaders: false }));

app.use('/api', router);

export default app;
