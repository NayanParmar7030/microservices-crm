# CRM Microservices — All Commands Reference

> **Platform:** Windows | **Shell:** CMD or PowerShell  
> **Project root:** `C:\wamp64\www\microservices-crm`

---

## 📋 Quick Reference — Ports

| Service              | Port  | URL                        |
|----------------------|-------|----------------------------|
| API Gateway          | 3000  | http://localhost:3000      |
| Auth Service         | 3001  | http://localhost:3001      |
| User Service         | 3002  | http://localhost:3002      |
| CRM Service          | 3003  | http://localhost:3003      |
| Notification Service | 3004  | http://localhost:3004      |
| Frontend (Vite)      | 5173  | http://localhost:5173      |
| PostgreSQL           | 5433  | localhost:5433             |
| Redis                | 6379  | localhost:6379             |

---

## 🚀 Start Services (Development Mode)

Open a **separate terminal window** for each service.  
All commands are run from the **project root**: `C:\wamp64\www\microservices-crm`

### Terminal 1 — Auth Service
```cmd
npm run dev:auth
```

### Terminal 2 — User Service
```cmd
npm run dev:user
```

### Terminal 3 — CRM Service
```cmd
npm run dev:crm
```

### Terminal 4 — Notification Service
```cmd
npm run dev:notifications
```

### Terminal 5 — API Gateway
```cmd
npm run dev:gateway
```

### Terminal 6 — Frontend
```cmd
npm run dev:frontend
```

---

## 🔁 Alternative: Run from Inside Each Service Folder

If you prefer to `cd` into each service directory:

```cmd
cd services\auth-service
npx tsx watch src/server.ts
```

```cmd
cd services\user-service
npx tsx watch src/server.ts
```

```cmd
cd services\crm-service
npx tsx watch src/server.ts
```

```cmd
cd services\notification-service
npx tsx watch src/server.ts
```

```cmd
cd services\api-gateway
npx tsx watch src/server.ts
```

```cmd
cd frontend
npm run dev
```

---

## 🏗️ Build Services (Production)

Build all services at once from project root:
```cmd
npm run build
```

Build a specific service:
```cmd
npm run build -w auth-service
npm run build -w user-service
npm run build -w crm-service
npm run build -w notification-service
npm run build -w api-gateway
npm run build -w frontend
```

---

## ▶️ Start Built Services (Production Mode)

After building, run the compiled JS:

```cmd
cd services\auth-service
node dist/server.js
```

```cmd
cd services\user-service
node dist/server.js
```

```cmd
cd services\crm-service
node dist/server.js
```

```cmd
cd services\notification-service
node dist/server.js
```

```cmd
cd services\api-gateway
node dist/server.js
```

---

## 📦 Install Dependencies

Install all workspace dependencies from project root:
```cmd
npm install
```

Install for a specific service only:
```cmd
npm install -w auth-service
npm install -w user-service
npm install -w crm-service
npm install -w notification-service
npm install -w api-gateway
npm install -w frontend
```

Add a new package to a specific service:
```cmd
npm install <package-name> -w auth-service
```

---

## 🏥 Health Check URLs

Open these in your browser or Postman to verify each service is running:

```
http://localhost:3000/health   ← API Gateway
http://localhost:3001/health   ← Auth Service
http://localhost:3002/health   ← User Service
http://localhost:3003/health   ← CRM Service
http://localhost:3004/health   ← Notification Service
```

Or test from terminal using curl:
```cmd
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
```

---

## 🗄️ Database (PostgreSQL on port 5433)

### Connect via psql
```cmd
psql -U postgres -p 5433
```

### List all databases
```cmd
psql -U postgres -p 5433 -c "\l"
```

### Connect to a specific database
```cmd
psql -U postgres -p 5433 -d auth_db
psql -U postgres -p 5433 -d user_db
psql -U postgres -p 5433 -d crm_db
psql -U postgres -p 5433 -d notification_db
```

### List tables in a database
```cmd
psql -U postgres -p 5433 -d auth_db -c "\dt"
```

### View table contents (example)
```cmd
psql -U postgres -p 5433 -d auth_db -c "SELECT * FROM users LIMIT 10;"
psql -U postgres -p 5433 -d user_db -c "SELECT * FROM users LIMIT 10;"
psql -U postgres -p 5433 -d crm_db -c "SELECT * FROM leads LIMIT 10;"
psql -U postgres -p 5433 -d crm_db -c "SELECT * FROM tasks LIMIT 10;"
psql -U postgres -p 5433 -d notification_db -c "SELECT * FROM notifications LIMIT 10;"
```

---

## 🔴 Redis

### Check if Redis is running (Windows)
```cmd
redis-cli ping
```
Expected response: `PONG`

### Start Redis (if not running as a service)
```cmd
redis-server
```

### Open Redis CLI
```cmd
redis-cli
```

### Useful Redis commands (inside redis-cli)
```
KEYS *                    -- list all keys
KEYS refresh:*            -- list all refresh token keys
TTL refresh:<token>       -- check token expiry time
FLUSHDB                   -- clear current database (use carefully!)
```

---

## 🐳 Docker Commands (if using Docker instead)

### Start all services with Docker
```cmd
docker-compose up
```

### Start in background (detached)
```cmd
docker-compose up -d
```

### Stop all Docker services
```cmd
docker-compose down
```

### Stop and remove volumes (wipes database data)
```cmd
docker-compose down -v
```

### View logs for a specific service
```cmd
docker-compose logs -f auth-service
docker-compose logs -f user-service
docker-compose logs -f crm-service
docker-compose logs -f notification-service
docker-compose logs -f api-gateway
docker-compose logs -f frontend
```

### Rebuild a specific service image
```cmd
docker-compose build auth-service
```

---

## 🔧 TypeScript Compilation Check

Check for TypeScript errors without building:

```cmd
cd services\auth-service
npx tsc --noEmit
```

```cmd
cd services\user-service
npx tsc --noEmit
```

```cmd
cd services\crm-service
npx tsc --noEmit
```

```cmd
cd services\notification-service
npx tsc --noEmit
```

```cmd
cd services\api-gateway
npx tsc --noEmit
```

---

## 📁 Service .env File Locations

Each service has its own `.env` file. Edit these to change ports, DB credentials, secrets, etc.

```
services/api-gateway/.env
services/auth-service/.env
services/user-service/.env
services/crm-service/.env
services/notification-service/.env
frontend/.env
```

---

## ⚡ Recommended Startup Order

Services depend on each other, so start them in this order:

```
1. PostgreSQL       (already running on port 5433)
2. Redis            (already running on port 6379)
3. Auth Service     (port 3001)
4. User Service     (port 3002)
5. CRM Service      (port 3003)
6. Notification Service (port 3004)
7. API Gateway      (port 3000)  ← start last, it proxies to all others
8. Frontend         (port 5173)  ← start anytime after gateway
```
