import express, { type Express } from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import router from './routes';
import { logger } from './lib/logger';

const app: Express = express();

// Trust the first hop of X-Forwarded-For from the Replit reverse proxy.
// Without this, express-rate-limit sees the proxy IP for every request and
// cannot rate-limit per real client IP.
app.set('trust proxy', 1);

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

// credentials: true + origin: true allows the browser to send the sb-token cookie
// cross-origin via the Replit proxy.
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ────────────────────────────────────────────────────────────
// Broad API limit — 300 req/min per real client IP (trust proxy must be set above)
app.use('/api', rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
}));

// Tight limit for auth-adjacent + write-heavy endpoints (20 req/min)
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

// Auth profile writes — prevent rapid credential-change attempts
app.use('/api/auth/profile', rateLimit({ windowMs: 60_000, max: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Rate limit exceeded.' } }));

app.use('/api/users/search', rateLimit({ windowMs: 60_000, max: 40, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/globe/reactions', rateLimit({ windowMs: 60_000, max: 30, standardHeaders: 'draft-7', legacyHeaders: false }));

app.use('/api', router);

export default app;
