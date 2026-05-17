# CRM Microservices — Complete Architecture & Flow Guide

> A practical, step-by-step explanation of how every service connects, how databases are created, and how a real request travels through the system.

---

## 1. Big Picture — What We Built

```
Browser (localhost:5173)
        │
        │  HTTP requests
        ▼
  API Gateway (port 3000)          ← Single entry point for all traffic
        │
        ├──► Auth Service    (port 3001)  → PostgreSQL: auth_db
        ├──► User Service    (port 3002)  → PostgreSQL: user_db
        ├──► CRM Service     (port 3003)  → PostgreSQL: crm_db
        └──► Notification    (port 3004)  → PostgreSQL: notification_db

All services also connect to:
        Redis (port 6379)            ← Sessions, token blacklist, caching
```

**Rule:** The browser never talks directly to any service. Everything goes through the API Gateway.

---

## 2. How Tables Are Created Automatically (No Manual SQL Needed)

Every service has a file called `migrate.ts`. When a service starts up, it runs this file **before** accepting any requests.

### How it works — step by step:

**Step 1:** You run `npm run dev:auth`

**Step 2:** `server.ts` starts and calls `runMigrations(pool)` immediately

**Step 3:** `migrate.ts` runs `CREATE TABLE IF NOT EXISTS` SQL

**Step 4:** PostgreSQL creates the table only if it doesn't already exist

**Step 5:** Service starts listening for requests

This means:
- First run → tables are created fresh
- Every run after → `IF NOT EXISTS` skips creation, no error
- You never need to manually create tables

### Which service creates which tables:

| Service | Database | Tables Created |
|---|---|---|
| auth-service | `auth_db` | `tenants`, `users` |
| user-service | `user_db` | `roles`, `users` |
| crm-service | `crm_db` | `leads`, `tasks` |
| notification-service | `notification_db` | `notifications` |

### Example — auth-service migration (auth_db):

```sql
-- Runs automatically when auth-service starts
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(320) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);
```

### Example — user-service migration (user_db):

```sql
-- Runs automatically when user-service starts
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(32) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seeds default roles immediately after
INSERT INTO roles (name) VALUES ('admin'), ('manager'), ('user')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,           -- Same UUID as auth_db users
  tenant_id UUID NOT NULL,
  email VARCHAR(320) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  deleted_at TIMESTAMPTZ,        -- Soft delete
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> **Important:** `auth_db.users` and `user_db.users` are **separate tables in separate databases**. They share the same `id` (UUID) but store different data. Auth stores credentials. User stores profile + role.

---

## 3. Service-by-Service Explanation

### 3.1 API Gateway (port 3000)

**What it does:** Pure traffic router. Receives all requests from the browser and forwards them to the correct service.

**It does NOT:**
- Parse request bodies (removed `express.json()` — would consume the body before proxying)
- Authenticate requests (each service does its own auth)
- Store any data

**Routing table:**

```
POST /api/v1/auth/register    → http://localhost:3001/api/v1/auth/register
POST /api/v1/auth/login       → http://localhost:3001/api/v1/auth/login
GET  /api/v1/users            → http://localhost:3002/api/v1/users
GET  /api/v1/crm/leads        → http://localhost:3003/api/v1/crm/leads
GET  /api/v1/crm/tasks        → http://localhost:3003/api/v1/crm/tasks
GET  /api/v1/notifications    → http://localhost:3004/api/v1/notifications
```

**Path rewriting:** Express strips the mount prefix before proxying.
```
Browser sends:  POST /api/v1/auth/register
Gateway sees:   POST /register  (Express stripped /api/v1/auth)
Gateway rewrites to: /api/v1/auth/register  (pathRewrite adds it back)
Auth-service receives: POST /api/v1/auth/register  ✅
```

---

### 3.2 Auth Service (port 3001) → auth_db

**What it does:** Handles identity — who you are and whether you're allowed in.

**Databases:**
- PostgreSQL `auth_db` → stores tenants and hashed passwords
- Redis → stores refresh token sessions and access token blacklist

**Routes:**

| Method | Path | What happens |
|---|---|---|
| POST | `/api/v1/auth/register` | Creates tenant + user, calls user-service to create profile, issues JWT pair |
| POST | `/api/v1/auth/login` | Verifies password, calls user-service for role, issues JWT pair |
| POST | `/api/v1/auth/refresh` | Rotates refresh token, issues new access token |
| POST | `/api/v1/auth/logout` | Blacklists access token in Redis, deletes refresh session |

**JWT tokens:**
- **Access token** — short-lived (15 min), contains `userId`, `tenantId`, `role`, `email`
- **Refresh token** — long-lived (7 days), stored in Redis, sent as HTTP-only cookie

---

### 3.3 User Service (port 3002) → user_db

**What it does:** Manages user profiles and roles. Has two separate route groups.

**Public routes** (require JWT):
```
GET    /api/v1/users          → List all users in tenant (admin/manager only)
GET    /api/v1/users/:id      → Get single user profile
PATCH  /api/v1/users/:id      → Update name/email
PATCH  /api/v1/users/:id/role → Change role (admin only)
DELETE /api/v1/users/:id      → Soft delete (admin only)
```

**Internal routes** (require `x-internal-secret` header, NOT exposed via gateway):
```
POST /internal/api/v1/users/bootstrap    → Called by auth-service during register
GET  /internal/api/v1/users/:id/claims  → Called by auth-service during login
```

> **Internal routes** are only accessible service-to-service using a shared secret. The API Gateway does not proxy `/internal/*` routes — they are completely hidden from the browser.

---

### 3.4 CRM Service (port 3003) → crm_db

**What it does:** Manages business data — leads and tasks.

**All routes require a valid JWT** (verified locally using the same `JWT_ACCESS_SECRET`).

**Leads:**
```
GET    /api/v1/crm/leads      → List leads for tenant (paginated)
POST   /api/v1/crm/leads      → Create lead
GET    /api/v1/crm/leads/:id  → Get single lead
PATCH  /api/v1/crm/leads/:id  → Update lead
DELETE /api/v1/crm/leads/:id  → Soft delete
```

**Tasks:**
```
GET    /api/v1/crm/tasks      → List tasks (filter by status/priority)
POST   /api/v1/crm/tasks      → Create task
GET    /api/v1/crm/tasks/:id  → Get single task
PATCH  /api/v1/crm/tasks/:id  → Update task
DELETE /api/v1/crm/tasks/:id  → Soft delete
```

**Multi-tenancy:** Every query filters by `tenant_id` extracted from the JWT. Users from Tenant A can never see Tenant B's data.

---

### 3.5 Notification Service (port 3004) → notification_db

**What it does:** Stores and delivers notifications. Supports real-time via SSE (Server-Sent Events).

**User routes** (require JWT):
```
GET   /api/v1/notifications         → List notifications (paginated)
GET   /api/v1/notifications/unread  → Count of unread
GET   /api/v1/notifications/stream  → SSE stream (real-time push)
PATCH /api/v1/notifications/:id/read → Mark one as read
PATCH /api/v1/notifications/read-all → Mark all as read
```

**Internal route** (require `x-internal-secret`):
```
POST /api/v1/internal/notifications → Create notification (called by other services)
```

---

## 4. Complete Request Flows — Practical Examples

### Flow 1: User Registers

```
1. Browser → POST http://localhost:3000/api/v1/auth/register
   Body: { organizationName, firstName, lastName, email, password }

2. API Gateway → forwards to Auth Service :3001

3. Auth Service:
   a. Hashes password with bcrypt (12 rounds)
   b. Generates a unique slug: "acme-inc-a3f2b1"
   c. Opens a DB transaction on auth_db:
      - INSERT INTO tenants (name, slug) → gets tenantId
      - INSERT INTO users (tenant_id, email, password_hash) → gets userId
   d. Calls User Service internally:
      POST http://localhost:3002/internal/api/v1/users/bootstrap
      Headers: { x-internal-secret: "..." }
      Body: { id: userId, tenantId, email, firstName, lastName, roleName: "admin" }
   e. User Service creates profile in user_db with admin role
   f. Auth Service issues JWT pair:
      - Access token (15 min) → returned in response body
      - Refresh token (7 days) → stored in Redis + set as HTTP-only cookie
   g. Returns: { accessToken, tenantId, userId, tenantSlug }

4. Browser stores accessToken in Zustand memory
5. Browser redirects to /tasks
```

### Flow 2: User Logs In

```
1. Browser → POST http://localhost:3000/api/v1/auth/login
   Body: { email, password }

2. API Gateway → Auth Service :3001

3. Auth Service:
   a. Finds user by email in auth_db
   b. Compares password with bcrypt.compare()
   c. Calls User Service internally:
      GET http://localhost:3002/internal/api/v1/users/:id/claims
      → Gets { role: "admin" }
   d. Issues new JWT pair with role embedded
   e. Returns accessToken + sets refresh cookie

4. Browser stores accessToken, user is logged in
```

### Flow 3: Hard Refresh (Session Restore)

```
1. Browser hard refreshes → Zustand memory is wiped (accessToken gone)

2. AuthBootstrap component runs on every page load:
   POST http://localhost:3000/api/v1/auth/refresh
   (Browser automatically sends the HTTP-only refresh cookie)

3. API Gateway → Auth Service :3001

4. Auth Service:
   a. Reads refresh token from cookie
   b. Verifies JWT signature
   c. Looks up session in Redis by token's jti (JWT ID)
   d. Deletes old session from Redis (rotation — prevents reuse)
   e. Issues brand new access + refresh token pair
   f. Stores new refresh session in Redis
   g. Returns new accessToken

5. AuthBootstrap calls applyAuthPayload() → restores Zustand state
6. User stays logged in ✅
```

### Flow 4: Fetch Tasks (Authenticated Request)

```
1. Browser → GET http://localhost:3000/api/v1/crm/tasks
   Headers: { Authorization: "Bearer <accessToken>" }

2. API Gateway → CRM Service :3003

3. CRM Service:
   a. Auth middleware verifies JWT signature using JWT_ACCESS_SECRET
   b. Checks Redis: is this token's jti blacklisted? (logout check)
   c. Extracts tenantId from JWT claims
   d. Queries crm_db:
      SELECT * FROM tasks
      WHERE tenant_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
   e. Returns paginated list

4. Browser renders tasks table
```

### Flow 5: Access Token Expires (Auto Refresh)

```
1. Browser makes any API call → gets 401 Unauthorized

2. Axios response interceptor catches the 401:
   - Checks: is this already a retry? No.
   - Calls refreshAccessToken()

3. refreshAccessToken():
   POST /api/v1/auth/refresh (with cookie)
   → Gets new accessToken

4. Retries the original request with new token

5. User never sees an error — completely transparent ✅
```

### Flow 6: User Logs Out

```
1. Browser → POST http://localhost:3000/api/v1/auth/logout
   Headers: { Authorization: "Bearer <accessToken>" }
   Cookie: crm_rt=<refreshToken>

2. Auth Service:
   a. Verifies refresh token → extracts jti
   b. Deletes refresh session from Redis (token can never be used again)
   c. Verifies access token → extracts jti + expiry
   d. Adds access token jti to Redis blacklist with TTL = remaining expiry
      (so even if someone has the token, it's rejected)
   e. Clears the refresh cookie

3. Browser clears Zustand state → redirected to /login
```

---

## 5. How Services Authenticate Each Other

Services communicate internally using a **shared secret** — not JWTs.

```
Auth Service wants to create a user profile:

POST http://localhost:3002/internal/api/v1/users/bootstrap
Headers: {
  "x-internal-secret": "4008c3fbe719c3e6..."  ← from INTERNAL_SERVICE_SECRET env var
}

User Service middleware checks:
  req.header("x-internal-secret") === env.INTERNAL_SERVICE_SECRET
  → If match: allow ✅
  → If no match: 403 Forbidden ❌
```

This route is **never exposed via the API Gateway** — it only listens on the internal network (localhost).

---

## 6. Redis — What It Stores

Redis is used for 3 things:

| Key Pattern | What it stores | TTL |
|---|---|---|
| `rtjti:<uuid>` | Refresh token session data (userId, role, email) | 7 days |
| `at_deny:<uuid>` | Blacklisted access token JTI (after logout) | Remaining token lifetime |
| `fib_revoked:<uuid>` | Revoked token family (reuse attack detection) | 7 days |

**Token rotation security:** Every refresh creates a new token and deletes the old one. If someone tries to reuse an old refresh token, the entire token family is revoked — all sessions for that user are invalidated.

---

## 7. Multi-Tenancy — How Data Isolation Works

Every table that stores business data has a `tenant_id` column:

```sql
-- crm_db
SELECT * FROM tasks WHERE tenant_id = $1 AND deleted_at IS NULL;
--                        ^^^^^^^^^^^^^^^^^^^
--                        Always filtered by tenant from JWT
```

The `tenant_id` comes from the JWT access token — it's embedded at login time and cannot be changed by the client. This means:

- Company A logs in → their JWT has `tid: "uuid-of-company-a"`
- All their queries are automatically scoped to their data
- They physically cannot query Company B's data

---

## 8. Environment Variables — Who Uses What

| Variable | Used by |
|---|---|
| `DATABASE_URL` | Each service (points to its own DB) |
| `REDIS_URL` | auth-service, user-service, crm-service, notification-service |
| `JWT_ACCESS_SECRET` | auth-service (signs), all other services (verify) |
| `JWT_REFRESH_SECRET` | auth-service only |
| `INTERNAL_SERVICE_SECRET` | auth-service (sends), user-service + notification-service (verify) |
| `USER_SERVICE_URL` | auth-service (to call bootstrap + claims) |
| `AUTH_SERVICE_URL` | api-gateway (to proxy /api/v1/auth/*) |
| `VITE_API_URL` | frontend (points to gateway at localhost:3000) |

---

## 9. Startup Order & Why It Matters

```
Start in this order:

1. PostgreSQL (already running on port 5433)
2. Redis (already running on port 6379)
3. auth-service    → creates auth_db tables
4. user-service    → creates user_db tables + seeds roles
5. crm-service     → creates crm_db tables
6. notification-service → creates notification_db tables
7. api-gateway     → starts routing (needs services to be up)
8. frontend        → starts Vite dev server
```

If you start the gateway before the services, requests will fail with `502 Bad Gateway` until the services are ready.

---

## 10. Complete Port & URL Reference

| Service | Port | Base URL | Database |
|---|---|---|---|
| Frontend | 5173 | http://localhost:5173 | — |
| API Gateway | 3000 | http://localhost:3000 | — |
| Auth Service | 3001 | http://localhost:3001 | auth_db (port 5433) |
| User Service | 3002 | http://localhost:3002 | user_db (port 5433) |
| CRM Service | 3003 | http://localhost:3003 | crm_db (port 5433) |
| Notification Service | 3004 | http://localhost:3004 | notification_db (port 5433) |
| PostgreSQL | 5433 | localhost:5433 | — |
| Redis | 6379 | localhost:6379 | — |

---

## 11. Quick Troubleshooting Reference

| Error | Cause | Fix |
|---|---|---|
| `DATABASE_URL undefined` | Service .env not loaded | Check `services/<name>/.env` exists |
| `password authentication failed` | Wrong DB password in DATABASE_URL | Update password in service .env |
| `Cannot POST /register` | Gateway path rewrite issue | Restart api-gateway |
| `request aborted` | Gateway parsing body before proxy | Remove `express.json()` from gateway |
| `SASL: client password must be a string` | Empty password in connection URL | Add password to DATABASE_URL |
| Session lost on refresh | `sameSite: strict` blocking cookie | Changed to `lax` in cookies.ts |
| `502 Bad Gateway` | Upstream service not running | Start the service first |
| `401 on every request` | Access token expired | AuthBootstrap auto-refreshes — check Redis is running |
