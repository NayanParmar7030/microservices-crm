# microservices-crm
Scalable CRM platform built with microservices architecture using Node.js, Redis, Docker, and modern DevOps practices. Production-ready CRM system using Node.js microservices, API Gateway, Redis caching, async queues, and Docker-based deployment.

## Quick start (Windows PowerShell)

1. Copy `.env.example` to `.env` and fill required secrets.
2. Install dependencies once:
   - `npm install`
3. Launch full local stack (db/cache + all services + frontend):
   - `powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1`
4. Optional: if Docker services are already running, skip Docker startup:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1 -SkipDocker`
5. Stop db/cache:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\stop-dev.ps1`
