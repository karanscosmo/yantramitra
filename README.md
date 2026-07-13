# YantraMitra

Industrial operations intelligence platform — command center, digital twin, AI copilot, and work order management for multi-plant manufacturing environments.

YantraMitra models a realistic five-plant Indian manufacturing company (Pune, Ahmedabad, Chennai, Bengaluru, Nagpur) with live seeded data: machines, sensors, alarms, work orders, agents, incidents, and a full incident-to-recovery lifecycle. The platform includes a Three.js digital twin, anomaly investigation graph, scenario simulator, role-based access, and YantraNklan — an AI operations assistant powered by Groq (Llama 3).

## Screenshots

| Dashboard | Digital Twin | AI Console |
|---|---|---|
| Global command center with live KPIs | 3D factory floor with machine inspector | YantraNklan AI operations chat |

*Deploy to Vercel and open the app to see the full interface. Screenshots are not bundled in the repository to keep it lean.*

## Key Features

- **Command Center** — Global dashboard with plant OEE, active alarms, machine status, and executive summary across all five facilities
- **Digital Twin** — Three.js 3D factory floor with clickable machines, HUD overlay (Active/Warning/Down/OEE), health inspector panel, and ambient animations
- **AI Copilot (YantraNklan)** — Chat interface with live database context, file upload with text extraction (PDF/DOCX/XLSX/CSV/TXT/images), streaming responses, and conversation memory
- **Work Orders** — Full CRUD, sortable column headers, pagination (10/page), detail drawer, auto-seed of 25 realistic industrial orders on first GET
- **Anomaly Investigation** — Graph-based root cause analysis with zoom/pan, draggable nodes, hypothesis highlighting, confidence bars, SVG edge glow animations
- **Scenario Simulator** — 4 presets (Balanced/Energy Saver/Maximum Output/Maintenance Mode), animated KPI bars with stagger and direction flash, progress bar, AI-generated grid summary
- **Agent Mission Control** — 9 AI agents with progress tracking, mission descriptions, success rates, and action history
- **Asset Fleet & Diagnostics** — Machine health cards, telemetry readings, component breakdown, maintenance timeline, AI root-cause predictions with confidence scoring
- **Plant Map** — Leaflet-based global map with real Indian city coordinates, facility status markers, and drill-down
- **Settings** — 5 tabs (Profile, Notifications, Team & Roles, Integrations, Security) with full back-end API routes for invite/disable/reset-password
- **Global Command Palette** — Cmd+K / Ctrl+K / / search across plants, machines, work orders, agents, and incidents
- **Keyboard Navigation** — ⌘1–⌘' for nav rail items, Escape for modal close
- **Role-based Access** — Admin, plant manager, maintenance, operator, executive roles with permission boundaries
- **Audit Logging** — All mutations recorded with actor, action, entity, and detail in the database
- **Enterprise Status Bar** — 26px strip showing environment badge, AI model, live plant/device counts, uptime, last sync (30s refresh)
- **Nav Rail** — Dark glass fixed panel (100px right) with section labels, 26px icons, text labels, accent bar, animated tooltips, live badge counts, keyboard shortcut labels

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | 21 standalone HTML pages, Tailwind CSS (CDN), Material Symbols |
| 3D Rendering | Three.js (CDN) |
| Maps | Leaflet (CDN) |
| Backend | Node.js, Express |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT (httpOnly cookies), bcryptjs |
| AI | Groq (Llama 3.3 70B) via OpenAI-compatible API |
| File Parsing | pdf-parse, mammoth (DOCX), xlsx |
| Deployment | Vercel (serverless via api/index.js) |

## Folder Structure

```
api/
  index.js                          Vercel serverless entry point
frontend/
  */code.html                       21 standalone page screens
prisma/
  schema.prisma                     Database schema (15 models)
public/
  assets/
    images/                         Plant photos, people avatars, facility SVGs
    logos/                          YantraMitra logo
    icons/                          Favicon
  docs/
    yantramitra-project-overview.pdf
  js/                               Page controllers + shared app shell (24 files)
scripts/
  seed.js                           Demo data seeder (5 plants, 29 machines, 16K readings)
services/
  prisma.js                         PrismaClient singleton with serverless-safe caching
server.js                           Express app, routes, auth, APIs, AI chat (1551 lines)
vercel.json                         Build and routing configuration
```

## Installation

```bash
npm install
cp .env.example .env
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection URL (pooled for Neon) |
| `DIRECT_URL` | Yes | Direct Postgres URL for migrations |
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `GROQ_API_KEY` | Yes | Groq API key for YantraNklan AI chat |
| `ENABLE_DEMO_PASSWORD_RESET` | No | Set `true` for demo reset-password |

## Run Locally

### First-time setup

```bash
npx prisma db push       # Create database tables from schema
node scripts/seed.js     # Seed 5 plants, 29 machines, 16K readings, team, incidents
npm start                # Start server on port 3000
```

Then open `http://localhost:3000` and log in with `admin@yantramitra.com` / `password123`.

### Quick start (if already seeded)

```bash
npm start
```

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@yantramitra.com | password123 |
| Operator | operator@yantramitra.com | password123 |

Additional roles: plant_manager, maintenance, executive — available via signup.

## Production Deployment (Vercel)

```bash
npm i -g vercel
vercel --prod
```

Set environment variables in Vercel dashboard:
- `DATABASE_URL` (pooled URL for Neon)
- `DIRECT_URL` (direct connection URL)
- `JWT_SECRET`
- `GROQ_API_KEY`

## Available Scripts

| Script | Command |
|---|---|
| Start server | `npm start` |
| Seed demo data | `npm run seed` |
| Generate Prisma client | `npm run build` |
| Post-install hook | `npx prisma generate` |

## API Summary

### Authentication
- `POST /api/auth/signup` — Register new user
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current user profile

### Operations
- `GET /api/dashboard/summary` — Global KPIs
- `GET /api/executive/summary` — Executive report
- `GET /api/plants` — All plants with hierarchy
- `GET /api/plants/:id` — Plant detail
- `GET /api/machines` — All machines
- `GET /api/machines/:id` — Machine detail
- `GET /api/diagnostics/:assetId` — Full diagnostics
- `GET /api/readings` — Sensor readings (filterable)
- `GET /api/alarms` — All alarms
- `PATCH /api/alarms/:id/resolve` — Resolve alarm
- `GET /api/incidents` — Operational incidents
- `POST /api/incidents/:id/actions` — Incident workflow actions

### Work Orders
- `GET /api/work-orders` — List (auto-seeds if <5 exist)
- `POST /api/work-orders` — Create
- `PATCH /api/work-orders/:id` — Update

### AI
- `POST /api/ai-chat` — YantraNklan chat (non-streaming, auto-fallback to DB lookup)
- `POST /api/ai-chat/stream` — YantraNklan chat (SSE streaming with fallback to non-streaming)
- `POST /api/ai-upload` — Upload files (PDF/DOCX/XLSX/CSV/TXT/images) for AI analysis with text extraction

### Diagnostics
- `GET /api/diagnostics/:assetId` — Full machine diagnostics with telemetry, AI predictions, RUL, hierarchy
- `GET /api/readings` — Filterable sensor readings by machineId, metric, and time window

### Incidents
- `GET /api/incidents` — All operational incidents with machine context
- `GET /api/incidents/:id` — Single incident detail with full machine hierarchy
- `POST /api/incidents/:id/actions` — Lifecycle actions: generate_plan, approve_plan, create_work_order, reserve_inventory, mark_repaired

### Agents, Plans, Team
- `GET/POST /api/agents` — List/create agents
- `PATCH /api/agents/:id` — Update agent
- `GET/POST /api/plans` — List/create plans
- `PATCH /api/plans/:id` — Approve/reject plan
- `GET /api/team` — Team members
- `POST /api/team/invite` — Invite user
- `PATCH /api/team/:id` — Update user role
- `DELETE /api/team/:id` — Remove user

### User
- `GET/PATCH /api/user/profile` — Profile CRUD
- `POST /api/user/profile/photo` — Upload avatar
- `POST /api/user/change-password` — Change password
- `GET/PATCH /api/user/preferences` — Preferences

### Integrations
- `POST /api/integrations/:key/connect` — Connect (SCADA, CMMS, ERP, Historian, MQTT)
- `POST /api/integrations/:key/disconnect` — Disconnect
- `POST /api/integrations/:key/configure` — Configure

## Route Map

| Route | Page |
|---|---|
| `/` | Landing page |
| `/login` | Login |
| `/signup` | Signup |
| `/reset-password` | Reset password |
| `/onboarding` | Role onboarding |
| `/dashboard` | Command center |
| `/map` | Global operations map |
| `/plant/:id` | Plant overview |
| `/digital-twin` | 3D digital twin |
| `/assets` | Asset fleet |
| `/assets/:id` | Asset detail |
| `/anomaly` | Anomaly investigation |
| `/reliability` | Reliability forecast |
| `/diagnostics/:assetId` | Machine diagnostics |
| `/simulator` | Scenario simulator |
| `/ai-console` | YantraNklan AI chat |
| `/agents` | Agent mission control |
| `/plans` | Plan review |
| `/maintenance` | Maintenance planner |
| `/work-orders` | Work orders |
| `/settings` | Settings & profile |

Static routes: `/privacy`, `/terms`, `/sitemap`, `/api-status`, `/about`, `/help`, `/contact`, `/documentation`.

## Seeded Demo Data

Running `node scripts/seed.js` creates:
- 5 Indian facilities with hierarchy (plants → buildings → lines)
- 29 domain-specific machines (CNC, robotic welders, SMT, etc.)
- 87 components, 174 sensors, 58 inventory parts
- 16,704 sensor readings across 6 metrics (96h each)
- Active alarms, 9 AI agents, 5 maintenance plans
- 6 work orders + 25 auto-seeded on first GET
- 1 operational incident with full lifecycle timeline
- 7 team members with distinct roles

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` / `/` | Command palette |
| `⌘1`–`⌘'` | Navigate nav rail items |
| `Escape` | Close modals |

## Future Roadmap

- **Real-time Streaming** — WebSocket-based telemetry push for live sensor data without page refresh
- **Mobile App** — React Native companion for technician field access, barcode scanning, and photo capture
- **OAuth / SSO** — Azure AD, Google Workspace, and Okta single sign-on integration
- **Email Notifications** — SMTP-based alert routing for critical alarms and work order assignments
- **BI Exports** — CSV/JSON export for all table views, scheduled PDF report generation
- **Multi-language** — Hindi, Marathi, Tamil, and Kannada UI locale support
- **Offline Mode** — Service worker caching for critical dashboards during network interruptions

## License

Proprietary — Yantra Manufacturing Technologies Pvt. Ltd.
