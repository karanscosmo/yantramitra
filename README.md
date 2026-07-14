# YantraMitra

YantraMitra is an AI-powered industrial operations platform for multi-plant monitoring, digital twin visualization, predictive maintenance, work order management, and AI-assisted analysis. It simulates a five-facility Indian manufacturing company with realistic machine telemetry, alarms, agents, and operational data.

## Overview

YantraMitra combines operational dashboards, 3D factory digital twins, AI chat with file context, and role-based team access into a single Express application with a PostgreSQL database.

### Capabilities

- **Command Center** — Cross-plant dashboard with live KPIs, alarm summaries, agent activity, and executive reporting.
- **Digital Twin** — Three.js 3D factory floor with interactive machines, health color overlay, and live sensor telemetry.
- **Predictive Maintenance** — Machine health scoring, failure probability, remaining useful life estimates, and AI-generated reliability forecasts.
- **AI Copilot (YantraNklan)** — Context-aware chat powered by Groq (Llama 3.3 70B) with streaming responses and file upload analysis.
- **Asset Intelligence** — Fleet-wide machine cards with telemetry graphs, component breakdown, maintenance history, and AI diagnostics.
- **Work Orders** — Full CRUD with status/priority/location filtering, search, sortable columns, pagination, and detail drawer.
- **Anomaly Investigation** — Alarm management with root-cause graph, evidence timeline, and AI reasoning.
- **Multi-Plant Monitoring** — Five Indian facilities (Pune, Ahmedabad, Chennai, Bengaluru, Nagpur) with per-plant drilldown and global map.
- **Role-Based Access** — Admin, plant manager, maintenance, operator, and executive roles with server-enforced permissions.

## Features

### Operations

- Global command dashboard with cross-plant KPIs (OEE, energy, CO2, uptime)
- Plant overview with floor layout, building hierarchy, and machine grid
- Facility switching and dedicated per-plant views
- Live status bar showing production state, plant count, device count, and system uptime
- Command palette (Cmd+K / Ctrl+K) for global search across plants, machines, work orders, agents, and incidents

### Digital Twin

- Three.js 3D factory floor with textured buildings, animated machines, and conveyor lines
- Clickable machines with health-based color overlay (green/yellow/red)
- Inspector panel showing live telemetry, recent alarms, and component breakdown
- Orbit controls for rotation, zoom, and pan
- Machine labels and navigation links to asset detail pages

### AI Copilot

- YantraNklan chat assistant with per-page operational context injection
- Streaming responses via server-sent events with non-streaming fallback
- File upload supporting PDF, DOCX, XLSX, CSV, TXT, JSON, XML, MD, and image formats
- Text extraction from PDF, DOCX, and XLSX files
- Conversation history per session
- Context-aware responses referencing live database state (plants, machines, alarms, work orders, agents, incidents)

### Maintenance

- Asset fleet with health cards, telemetry graphs, and component status
- Predictive maintenance with failure probability, remaining useful life, and bearing/lubrication status
- Reliability forecast with trend charts and projections
- Per-asset diagnostics with sensor traces and AI-generated predictions
- Maintenance planner with schedule and event management

### Work Management

- Work orders with status workflow (open, in_progress, completed), priority levels, assignment, and due dates
- Agent mission control with AI agent status management, mission queue, progress tracking, and activity feed
- Audit log recording all mutations with actor, action, entity, and detail

### Security and Access

- JWT-based authentication with httpOnly cookies
- Google OAuth sign-in (optional, configured via environment variables)
- bcrypt password hashing with configurable salt rounds
- Role-based authorization middleware (admin, plant_manager, maintenance, operator, executive)
- API key management with hash-based verification and expiration
- Session tracking with device info and sign-out controls
- Profile and avatar management with photo upload
- Two-factor authentication preference toggle

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, Tailwind CSS (CDN), Material Symbols |
| 3D Rendering | Three.js r160 (CDN) |
| Maps | Leaflet (CDN) |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Authentication | JWT, bcryptjs, google-auth-library |
| AI | Groq API (Llama 3.3 70B), OpenAI-compatible SDK |
| File Parsing | pdf-parse, mammoth (DOCX), xlsx |
| File Upload | multer |
| Deployment | Vercel (serverless) |

## Authentication

YantraMitra supports two authentication methods:

### Email and Password

Users register with email, password, name, and role. Passwords are hashed with bcrypt (10 rounds). On successful login, a JWT is issued containing `{ id, email, name, role }` with a 7-day expiry. The token is stored in an httpOnly cookie and optionally accepted as a Bearer header.

### Google OAuth

When configured with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, users can sign in with Google.

**New Google user flow:**

1. User clicks "Continue with Google" on the login or signup page
2. redirected to Google's OAuth consent screen
3. On approval, Google redirects to `/api/auth/google/callback`
4. Server exchanges the authorization code for tokens and verifies the ID token
5. Server checks for an existing user by email:
   - **No existing user**: Account created with Google profile data (name, email, avatar, googleId). Provider set to `google`. A random bcrypt hash is stored so password login is not possible. Redirected to `/onboarding?source=google`.
   - **Existing user, no googleId**: Google account linked to the existing user. All existing data, preferences, sessions, and roles are preserved. Redirected to `/dashboard`.
   - **Existing user, matching googleId**: Login recorded. Redirected to `/dashboard`.
6. Onboarding presents role selection. On completion, the user lands on the fully populated dashboard.

**Account linking behavior:**

- A user who signs up with email first and later authenticates with Google (same email) has their account linked. Both login methods work.
- A user who signs up with Google can set a password in Settings, enabling email/password login.
- If a Google-only user attempts email/password login, the server returns an error with a direct link to Google sign-in.

## Screens

- Home (`/`)
- Login (`/login`)
- Sign Up (`/signup`)
- Reset Password (`/reset-password`)
- Onboarding (`/onboarding`)
- Command Center / Dashboard (`/dashboard`)
- Global Map (`/map`)
- Plant Overview (`/plant/:id`)
- Digital Twin (`/digital-twin`)
- Asset Fleet (`/assets`)
- Asset Detail (`/assets/:id`)
- Anomaly Investigation (`/anomaly`)
- Reliability Forecast (`/reliability`)
- Diagnostics (`/diagnostics/:assetId`)
- Scenario Simulator (`/simulator`)
- AI Console (`/ai-console`)
- Agent Mission Control (`/agents`)
- Plan Review (`/plans`)
- Maintenance Planner (`/maintenance`)
- Work Orders (`/work-orders`)
- Settings (`/settings`)

## Project Structure

```
api/index.js                Vercel serverless entry point
server.js                   Express application (auth, routes, middleware)
prisma/schema.prisma        Database schema (17 models)
services/
  prisma.js                 PrismaClient singleton
  google-auth.js            Google OAuth utility
views/                      21 page directories (HTML)
  home/ login/ signup/ onboarding/ reset-password/
  command-center/ global-map/ plant-overview/ digital-twin/
  asset-fleet/ asset-detail/ anomaly/ reliability-forecast/
  diagnostics/ simulator/ ai-console/ agents/ plans/
  maintenance/ work-orders/ settings/
public/
  js/                       29 client-side controllers + app shell
  assets/                   Images, logos, icons
  docs/                     Documentation PDF
scripts/
  seed.js                   Demo data seeder (7 users, 5 plants, 30 machines)
uploads/                    User-uploaded files
```

## Installation

```bash
git clone <repo-url>
cd yantramitra-platform
npm install
cp .env.example .env
```

Edit `.env` with your database and API credentials, then:

```bash
npx prisma db push
npm run seed
npm start
```

Open http://localhost:3000. Default login: `admin@yantramitra.com` / `password123`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection URL (pooled, e.g. Neon with PgBouncer) |
| `DIRECT_URL` | Yes | Direct PostgreSQL URL for schema pushes |
| `JWT_SECRET` | Yes | Secret key for JWT signing (minimum 32 characters in production) |
| `GROQ_API_KEY` | No | Groq API key for AI features; AI chat is disabled without it |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID for Google sign-in |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | No | OAuth redirect URI (local: `http://localhost:3000/api/auth/google/callback`) |
| `ENABLE_DEMO_PASSWORD_RESET` | No | Set `true` to enable the reset-password endpoint in demo |

## Development

```bash
npm install          Install dependencies
npm start            Start the Express server on port 3000
npx prisma db push   Sync Prisma schema to the database
npm run seed         Seed demo data (7 users, 5 plants, 30 machines, agents, work orders, alarms)
```

## Deployment

Deploy on Vercel as a serverless function.

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Set all environment variables listed above in the Vercel dashboard (Settings > Environment Variables).
4. Deploy. The `vercel.json` configuration rewrites all paths to the serverless entry point at `api/index.js`.

**Important for Google OAuth:**

Add the production callback URL (e.g. `https://your-domain.vercel.app/api/auth/google/callback`) to your Google Cloud Console OAuth credentials under Authorized redirect URIs. Set `GOOGLE_CALLBACK_URL` in Vercel to match.

## Security

- All passwords hashed with bcrypt (10 salt rounds).
- JWT tokens signed with HS256, stored in httpOnly cookies with SameSite=Lax.
- API endpoints protected by middleware: `authRequired` (page redirect), `authApi` (401 JSON), and `requireRole` (403 JSON).
- Cross-origin requests blocked for state-changing methods.
- Security headers set: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- Rate limiting on auth endpoints (login, signup, reset-password, Google callback) and AI chat.
- All mutations recorded in the audit log with actor, action, entity, and detail.
- Google ID tokens verified server-side using google-auth-library.

## Roadmap

- MQTT/OPC-UA connectors for live industrial data streaming
- Real IoT sensor ingestion pipeline
- Predictive ML models trained on historical failure patterns
- Native mobile application
- SAP/CMMS/ERP integration connectors
- Azure/AWS IoT Hub integration

## License

MIT
