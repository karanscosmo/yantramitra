# YantraMitra — Ops Intel & Machine Agency

**Ask your machines anything — and act on the answer.**

YantraMitra is an industrial intelligence platform that unifies operational data, predictive analytics, and generative AI agents into a conversational command center for heavy industry. Monitor, diagnose, and optimize your entire factory floor through a single interface.

---

## Features

- **Global Command Center** — Real-time dashboard with plant-level KPIs, machine health, active alarms, and work order tracking across all facilities
- **Asset Fleet Management** — Per-machine telemetry, health scores, alarm history, and maintenance scheduling
- **Digital Twin** — Live factory visualization with machine status overlays
- **Anomaly Detection** — AI-driven investigation of sensor anomalies across production lines
- **Reliability Forecasting** — Plant-level health trends and predictive degradation analysis
- **Scenario Simulator** — What-if modeling for production changes and maintenance planning
- **AI Operations Console (YantraNklan)** — Conversational AI assistant with real-time access to your operational data
- **Agent Mission Control** — Deploy and monitor autonomous AI agents across maintenance, logistics, and quality control
- **Plan Review & Approval** — Maintenance plan workflow with approval/rejection
- **Work Order Management** — Full work order lifecycle tracking
- **Global Plant Map** — Geographic overview of all facilities with status indicators
- **Multi-Agent Workflows** — Autonomous agents that collaborate to solve complex disruptions

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js, Express |
| **Database** | PostgreSQL (Neon) |
| **ORM** | Prisma |
| **Auth** | JWT (httpOnly cookies) |
| **Frontend** | 20 standalone HTML pages, Tailwind CSS, Material Symbols |
| **AI** | OpenAI GPT-4o-mini (YantraNklan) |
| **Deployment** | Vercel (serverless) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (Neon free tier works great)
- An OpenAI API key (optional, for YantraNklan AI chat)

### Installation

```bash
git clone https://github.com/karanscosmo/yantramitra.git
cd yantramitra
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection string (used at runtime) |
| `DIRECT_URL` | Direct (non-pooled) Postgres connection string (used for migrations/seed) |
| `JWT_SECRET` | Random 64-char hex string for signing auth tokens |
| `OPENAI_API_KEY` | OpenAI API key for YantraNklan AI assistant (optional) |

> **Important**: `DATABASE_URL` must use the `-pooler` hostname for Neon. `DIRECT_URL` uses the direct hostname (no `-pooler`).

### Database Setup

```bash
# Push the schema to your database
npx prisma db push

# Seed with demo data (2 users, 5 plants, 16 machines, 16k+ sensor readings, alarms, agents, plans, work orders)
node seed.js
```

### Run Locally

```bash
npm start
```

The server starts at [http://localhost:3000](http://localhost:3000).

### Demo Login

| Role | Email | Password |
|---|---|---|
| Admin | `admin@yantramitra.com` | `password123` |
| Operator | `operator@yantramitra.com` | `password123` |

---

## Project Structure

```
yantramitra/
├── api/                          # Vercel serverless entry point
│   └── index.js                  # Express app export
├── frontend/                     # 20 standalone HTML pages
│   ├── yantramitra_home/         # Landing page
│   ├── login_yantramitra_polished/
│   ├── join_yantramitra_polished/
│   ├── reset_password_yantramitra_polished/
│   ├── onboarding_yantramitra_polished/
│   ├── command_center_yantramitra/       # Dashboard
│   ├── global_operations_map_yantramitra_polished/  # Map view
│   ├── detroit_plant_overview_yantramitra/  # Plant detail
│   ├── digital_twin_yantramitra/
│   ├── asset_fleet_yantramitra/
│   ├── asset_detail_pump_p_102_yantramitra/
│   ├── anomaly_investigation_yantramitra/
│   ├── reliability_forecast_yantramitra/
│   ├── scenario_simulator_yantramitra/
│   ├── ai_operations_console_yantramitra/   # YantraNklan chat
│   ├── agent_mission_control_yantramitra/
│   ├── plan_review_yantramitra/
│   ├── maintenance_planner_yantramitra/
│   ├── work_orders_yantramitra/
│   └── settings_yantramitra/
├── public/                      # Static assets
│   ├── logo.svg                 # YantraMitra brand logo
│   ├── images/
│   │   ├── avatar.svg
│   │   ├── dashboard.svg
│   │   ├── factory.svg
│   │   ├── machine.svg
│   │   ├── placeholder.svg
│   │   ├── robot.svg
│   │   └── yantranklan-avatar.svg
│   └── js/                      # Per-page JavaScript
│       ├── command_center_yantramitra.js
│       ├── ai_operations_console_yantramitra.js
│       └── ... (18 more)
├── prisma/
│   └── schema.prisma            # Database schema (7 models)
├── lib/
│   └── prisma.js                # PrismaClient singleton
├── server.js                    # Express app + all API routes
├── seed.js                      # Database seeder
├── vercel.json                  # Vercel deployment config
└── .env.example                 # Environment variable template
```

---

## API Endpoints

### Authentication
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/logout` | Clear auth cookie |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/me` | Get current user |

### Dashboard
| Method | Route | Description |
|---|---|---|
| GET | `/api/dashboard/summary` | Aggregated KPIs across all plants |

### Plants
| Method | Route | Description |
|---|---|---|
| GET | `/api/plants` | List all plants |
| GET | `/api/plants/:id` | Plant detail with machines |

### Machines
| Method | Route | Description |
|---|---|---|
| GET | `/api/machines` | List all machines |
| GET | `/api/machines/:id` | Machine detail with readings, alarms, work orders |

### Sensors
| Method | Route | Description |
|---|---|---|
| GET | `/api/readings` | Sensor readings (filterable by machineId, metric, hours) |

### Alarms
| Method | Route | Description |
|---|---|---|
| GET | `/api/alarms` | List all alarms |
| PATCH | `/api/alarms/:id/resolve` | Resolve an alarm |

### Agents
| Method | Route | Description |
|---|---|---|
| GET | `/api/agents` | List all AI agents |
| PATCH | `/api/agents/:id` | Update agent status/config |

### Plans
| Method | Route | Description |
|---|---|---|
| GET | `/api/plans` | List all maintenance plans |
| PATCH | `/api/plans/:id` | Approve/reject a plan |

### Work Orders
| Method | Route | Description |
|---|---|---|
| GET | `/api/work-orders` | List all work orders |
| PATCH | `/api/work-orders/:id` | Update work order status |

### Analytics
| Method | Route | Description |
|---|---|---|
| GET | `/api/analytics/reliability` | Plant-level reliability metrics |

### User Profile
| Method | Route | Description |
|---|---|---|
| GET | `/api/user/profile` | Get user profile |
| PATCH | `/api/user/profile` | Update profile (name, email) |

### AI Chat
| Method | Route | Description |
|---|---|---|
| POST | `/api/ai-chat` | Send message to YantraNklan (requires auth + API key) |

---

## YantraNklan AI Assistant

YantraNklan is a data-aware AI operations assistant built into the platform. It:

- Has real-time access to your plant, machine, alarm, agent, work order, and plan data
- Answers questions like *"Why is Pump P-102 flagged?"* using actual telemetry
- Provides maintenance recommendations based on current machine health
- Tracks work order status and plan approvals

### Setup

Set `OPENAI_API_KEY` in your environment. If no key is configured, the chat interface will display a clear setup prompt — it will not silently fall back to fake responses.

The endpoint supports both billing-quota and invalid-key scenarios with user-friendly error messages.

---

## Deployment (Vercel)

The project is pre-configured for Vercel deployment:

1. Push to GitHub
2. Import the repo in Vercel
3. Add environment variables (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `OPENAI_API_KEY`)
4. Deploy — `vercel.json` handles the build command (`npx prisma generate`) and routing

> `DATABASE_URL` in Vercel should use the **pooled** connection string (with `-pooler` in the hostname) for serverless compatibility.

---

## Seed Data

Running `node seed.js` creates:

- **2 users** — admin + operator
- **5 plants** — Detroit, Mumbai, Berlin, Singapore, Sao Paulo
- **16 machines** — CNCs, pumps, conveyors, robotic arms across all plants
- **16,128 sensor readings** — 6 metrics per machine × 168 hours
- **8 alarms** — mix of critical/warning across machines
- **6 AI agents** — Sentinel, Diagnostic, Planner variations
- **6 maintenance plans** — pending/approved/rejected
- **8 work orders** — open/in-progress/completed

---

## License

Private — YantraMitra Platform
