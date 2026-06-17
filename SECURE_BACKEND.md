# Secure & Scalable Backend API Checklist

> For TS/JS full-stack developers (Express / Next.js API routes / Hono)

---

## 1. CORS

- Restrict origins — never allow `*` in production
- Set `credentials: true` only if cookies/auth headers are needed
- Limit allowed methods (`GET, POST, PUT, PATCH, DELETE`)
- Limit allowed headers (`Content-Type, Authorization`)
- Handle preflight (`OPTIONS`) correctly

```ts
// express
app.use(cors({ origin: ['https://app.com'], credentials: true }));

// next.js (route handler or middleware)
export const config = { api: { externalResolver: true } };
```

---

## 2. Input Validation & Sanitization

- Validate **every** user input — body, query, params, headers
- Use a schema library: Zod (recommended), Yup, Joi
- Never trust `req.body` directly

```ts
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

const parsed = createUserSchema.parse(req.body);
```

- Sanitize free-text fields (strip HTML, control chars)
- Validate file uploads (type, size, name)

---

## 3. Authentication & Authorization

- Use bcrypt (or argon2) for passwords — never plaintext
- Use JWT with short expiry + refresh tokens
- Store tokens securely: `httpOnly` + `secure` + `sameSite: strict` cookies
- Implement role-based access control (RBAC) or attribute-based (ABAC)

```ts
// middleware pattern
function requireAuth(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  const payload = verify(token, process.env.JWT_SECRET);
  req.user = payload;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
```

---

## 4. Rate Limiting

- Protect routes from brute-force / DoS
- Use `express-rate-limit` (or `@upstash/ratelimit` for serverless)
- Different limits for auth vs. public endpoints

```ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/auth', limiter);
```

---

## 5. Security Headers (Helmet)

- Set `X-Content-Type-Options: nosniff`
- Set `X-Frame-Options: DENY`
- Set `Strict-Transport-Security` (HSTS)
- Set `Content-Security-Policy`
- Set `Referrer-Policy`

```ts
import helmet from 'helmet';
app.use(helmet());
```

---

## 6. Environment & Secrets

- Use `.env` files with `.env.example` as a template
- Never commit `.env` or secrets
- Use `zod` to validate `process.env` at startup (fail fast)

```ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().optional(),
});
const env = envSchema.parse(process.env);
```

---

## 7. Error Handling

- Global error handler — never leak stack traces in production
- Use typed error classes (e.g., `AppError` with status code)
- Always return consistent JSON: `{ error: string, code?: string }`
- Wrap all async route handlers to catch rejected promises

```ts
class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

// wraps async route handlers so thrown errors reach the error middleware
const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// global error middleware — single source of truth for every error
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // unknown error — log full details, return generic message
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong. Please try again later.' });
});
```

---

## 8. Logging

- Structured JSON logs (pino, winston)
- Log requests, errors, and slow operations
- Never log secrets, tokens, or PII

```ts
import pino from 'pino';
const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });
```

---

## 9. Database & ORM

- Use prepared statements / parameterized queries (Prisma, Drizzle, Knex)
- Never concatenate user input into SQL
- Connection pooling for scale
- Migrations in version control

---

## 10. CSRF Protection

- Required if using cookie-based auth (not needed for stateless JWT in `Authorization` header)
- Use `csrf-csrf` or `double-submit-cookie` pattern

---

## 11. Request Size Limiting

- Limit JSON body size to prevent memory exhaustion

```ts
app.use(express.json({ limit: '100kb' }));
```

- Limit file upload sizes via multer or busboy config

---

## 12. API Versioning

- Prefix routes: `/api/v1/resource`
- Allows breaking changes without breaking existing clients

---

## 13. Pagination & Filtering

- Always paginate list endpoints (cursor-based recommended for scale)
- Limit max page size
- Validate and sanitize filter/sort parameters
- Never expose internal field names directly

---

## 14. Dependency Security

- Run `npm audit` regularly
- Use `snyk` or `socket.dev` in CI
- Pin major versions, review lockfile changes

---

## 15. Testing

- Unit test validators, services, and middleware
- Integration test API endpoints
- Test failure paths (invalid tokens, missing fields, rate limits)

---

## 16. Scalability Patterns (Node.js)

- Stateless API — scale horizontally
- Offload heavy tasks to queues (Bull/BullMQ + Redis)
- Cache frequent reads (Redis, in-memory with TTL)
- Use compression (`compression` middleware)
- Serve static assets via CDN
- Use `asyncHandler` (from §7) to avoid uncaught promise rejections

---

## Tools & Libraries Summary

| Concern | Library |
|---|---|
| Validation | Zod |
| CORS | cors |
| Headers | helmet |
| Rate limit | express-rate-limit / @upstash/ratelimit |
| Auth | jsonwebtoken + bcrypt/argon2 |
| Logging | pino / winston |
| ORM | Prisma / Drizzle / Kysely |
| Queues | BullMQ |
| Testing | vitest / jest + supertest |

---

---

## 17. End-to-End Example — Meaningful Error Every Time

Every request follows the same pipeline so the client never gets a raw crash or timeout without a clear message.

```
Client Request
  │
  ├─ Rate Limiter         → 429 Too Many Requests
  ├─ CORS                 → 4xx if origin not allowed
  ├─ Auth Middleware      → 401 Unauthorized / 403 Forbidden
  ├─ Validation (Zod)    → 400 with field-level errors
  │
  ├─ Route Handler (asyncHandler wraps)
  │    ├─ Success         → 200 { data }
  │    └─ Business Error  → throw new AppError(400, 'Insufficient funds')
  │
  └─ Global Error Middleware
       ├─ AppError        → { error: "Insufficient funds" }
       └─ Unknown Error   → { error: "Something went wrong. Please try again later." }
                             + full stack logged server-side
```

```ts
// ---------- app.ts ----------
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

const app = express();

// 1. Security headers
app.use(helmet());

// 2. CORS
app.use(cors({ origin: ['https://myapp.com'], credentials: true }));

// 3. Body parsing with size limit
app.use(express.json({ limit: '100kb' }));

// 4. Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

// ---------- error infrastructure ----------
class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

const asyncHandler: RequestHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ---------- validation schema ----------
const transferSchema = z.object({
  fromAccount: z.string().length(10),
  toAccount: z.string().length(10),
  amount: z.number().positive(),
});

// ---------- route ----------
app.post(
  '/api/v1/transfer',
  asyncHandler(async (req, res) => {
    const body = transferSchema.parse(req.body);          // throws ZodError → 400

    const balance = await db.getBalance(body.fromAccount); // could throw
    if (balance < body.amount) {
      throw new AppError(400, 'Insufficient funds');       // meaningful business error
    }

    await db.transfer(body.fromAccount, body.toAccount, body.amount);
    res.json({ success: true });
  }),
);

// ---------- global error middleware ----------
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Something went wrong. Please try again later.' });
});

app.listen(3000);
```

**What the client sees in every scenario:**

| Scenario | Status | Body |
|---|---|---|
| Missing auth token | 401 | `{ "error": "Unauthorized" }` |
| Invalid email format | 400 | `{ "error": "Validation failed", "details": [...] }` |
| Insufficient balance | 400 | `{ "error": "Insufficient funds" }` |
| DB connection lost | 500 | `{ "error": "Something went wrong. Please try again later." }` |
| Rate limit hit | 429 | `{ "error": "Too many requests, please try again later" }` |

Every path ends in a JSON error object — never a hang, crash, or stack leak.

---

> **Gold rule:** Never trust the client. Validate everything. Log everything. Fail fast and gracefully.
