# YantraMitra

Industrial operations intelligence for plant teams, maintenance teams, and AI-assisted command centers.

YantraMitra is built from the original 20 Google Stitch HTML screens and keeps that standalone frontend structure intact. The backend is a real Express + Prisma + PostgreSQL service with JWT auth, bcryptjs password hashing, database-backed plant/machine/alarm/work-order data, and the YantraNklan AI operations assistant.

## Current Stack

| Layer | Implementation |
|---|---|
| Frontend | 20 standalone HTML pages in `frontend/*/code.html`, Tailwind CDN, Material Symbols |
| Shared UI | `public/js/app_shell_yantramitra.js` adds the shared right nav rail, home auth safety, and YantraNklan entry |
| Backend | Node.js, Express |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT in httpOnly cookies, bcryptjs password hashing |
| AI | OpenAI `gpt-4o-mini` when `OPENAI_API_KEY` is set; database lookup fallback when the key is missing, invalid, or quota-limited |
| Deployment | Vercel serverless through `api/index.js` and `vercel.json` |

## Setup

```bash
npm install
cp .env.example .env
```

Required environment variables:

| Variable | Required | Notes |
|---|---:|---|
| `DATABASE_URL` | Yes | Runtime Postgres URL. For Neon on Vercel, use the pooled `-pooler` URL. |
| `DIRECT_URL` | Yes | Direct Postgres URL for Prisma migrations and seed. |
| `JWT_SECRET` | Yes | Long random secret for JWT signing. |
| `OPENAI_API_KEY` | No | Enables full YantraNklan LLM responses. Without it, the chat uses database lookup fallback. |
| `ENABLE_DEMO_PASSWORD_RESET` | No | Set `true` only for demo/dev reset-password testing. Keep false in production. |

Create/update the database and seed demo data:

```bash
npx prisma db push
node seed.js
```

Run locally:

```bash
npm start
```

Local URL: `http://localhost:3000`

## Demo Login

| Role | Email | Password |
|---|---|---|
| Admin | `admin@yantramitra.com` | `password123` |
| Operator | `operator@yantramitra.com` | `password123` |

Signup supports these persisted roles: `operator`, `maintenance`, `plant_manager`, and `executive`. The onboarding role cards map into those roles and update the user profile.

## Route Map

| Route | Page |
|---|---|
| `/` | Landing page |
| `/login` | Login |
| `/signup` | Signup |
| `/reset-password` | Reset password |
| `/onboarding` | Role onboarding |
| `/dashboard` | Global command center |
| `/map` | Global operations map |
| `/plant/detroit` | Detroit plant overview |
| `/digital-twin` | Digital twin |
| `/assets` | Asset fleet |
| `/assets/pump-p-102` | Asset detail |
| `/anomaly` | Anomaly investigation |
| `/reliability` | Reliability forecast |
| `/simulator` | Scenario simulator |
| `/ai-console` | YantraNklan AI operations console |
| `/agents` | Agent mission control |
| `/plans` | Plan review |
| `/maintenance` | Maintenance planner |
| `/work-orders` | Work orders |
| `/settings` | Settings and profile |

Static info routes: `/privacy`, `/terms`, `/sitemap`, `/api-status`.

## Project Structure

```text
api/
  index.js                         Vercel serverless Express entry
frontend/
  */code.html                      20 original standalone UI screens
lib/
  prisma.js                        PrismaClient singleton for serverless
prisma/
  schema.prisma                    User, plant, machine, reading, alarm, agent, plan, work order models
public/
  images/                          Brand, operator, plant, AI, and industrial visuals
  js/                              Page controllers and shared app shell
server.js                          Express app, routes, auth, APIs, AI chat
seed.js                            Demo industrial data seed
vercel.json                        Build and routing config
```

## API Summary

Authentication:

| Method | Route |
|---|---|
| `POST` | `/api/auth/signup` |
| `POST` | `/api/auth/login` |
| `POST` | `/api/auth/logout` |
| `POST` | `/api/auth/reset-password` |
| `GET` | `/api/auth/me` |

Operations:

| Method | Route |
|---|---|
| `GET` | `/api/dashboard/summary` |
| `GET` | `/api/plants` |
| `GET` | `/api/plants/:id` |
| `GET` | `/api/machines` |
| `GET` | `/api/machines/:id` |
| `GET` | `/api/readings` |
| `GET` | `/api/alarms` |
| `PATCH` | `/api/alarms/:id/resolve` |
| `GET` | `/api/agents` |
| `PATCH` | `/api/agents/:id` |
| `GET` | `/api/plans` |
| `PATCH` | `/api/plans/:id` |
| `GET` | `/api/work-orders` |
| `PATCH` | `/api/work-orders/:id` |
| `GET` | `/api/analytics/reliability` |
| `GET` | `/api/user/profile` |
| `PATCH` | `/api/user/profile` |
| `POST` | `/api/ai-chat` |

## YantraNklan

YantraNklan is the in-app AI operations assistant. It receives live database context for plants, machines, active alarms, agents, plans, and work orders. With `OPENAI_API_KEY`, it uses OpenAI `gpt-4o-mini`. If the key is missing, invalid, or quota-limited, `/api/ai-chat` returns a clear `fallback-data-lookup` response using the same database context, so the console remains useful during demos.

## Production Notes

- Vercel needs `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, and optionally `OPENAI_API_KEY`.
- Neon serverless deployments should use pooled `DATABASE_URL` and direct `DIRECT_URL`.
- Password reset is demo-only unless `ENABLE_DEMO_PASSWORD_RESET=true`; production should connect a real email/token workflow.
- The seeded operations data is realistic demo data, not a replacement for a real historian, SCADA, CMMS, ERP, or IoT integration.
- Admin-only mutations require an admin user role; demo operator users can read and use core flows.
