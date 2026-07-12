const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const prisma = require('./lib/prisma');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'yantramitra-jwt-secret-2026';
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && JWT_SECRET === 'yantramitra-jwt-secret-2026') {
  throw new Error('JWT_SECRET must be set in production');
}

const authCookieOptions = {
  httpOnly: true,
  maxAge: 7 * 86400000,
  sameSite: 'lax',
  secure: isProduction,
};

app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use((req, res, next) => {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  try {
    if (new URL(origin).host === req.headers.host) return next();
  } catch {}
  return res.status(403).json({ error: 'Cross-origin request blocked' });
});
app.use(express.static(path.join(__dirname, 'public')));

const rateBuckets = new Map();
function rateLimit({ windowMs, max, keyPrefix }) {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    rateBuckets.set(key, bucket);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    next();
  };
}

function getToken(req) {
  if (req.cookies && req.cookies.token) return req.cookies.token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.slice(7);
  }
  return null;
}

function authRequired(req, res, next) {
  const token = getToken(req);
  if (!token) return res.redirect('/login');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.redirect('/login');
  }
}

function authOptional(req, res, next) {
  const token = getToken(req);
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  }
  next();
}

function authApi(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function pickAllowed(source, allowedFields) {
  const data = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) data[field] = source[field];
  }
  return data;
}

function validateEnum(value, allowedValues, fieldName) {
  if (value == null || allowedValues.includes(value)) return null;
  return `${fieldName} must be one of: ${allowedValues.join(', ')}`;
}

function servePage(pageName) {
  return (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', pageName, 'code.html'));
  };
}

function setAuthCookie(res, token) {
  res.cookie('token', token, authCookieOptions);
}

function clearAuthCookie(res) {
  res.clearCookie('token', {
    sameSite: authCookieOptions.sameSite,
    secure: authCookieOptions.secure,
  });
}

function infoPage(title, content) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | YantraMitra</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-[#fbf8ff] text-[#191a28]">
  <main class="mx-auto max-w-3xl px-6 py-12">
    <a href="/" class="inline-flex items-center gap-2 text-[#413fd6] font-semibold mb-8">YantraMitra</a>
    <section class="rounded-lg border border-[#c7c4d7] bg-white p-8 shadow-sm">
      <h1 class="text-3xl font-bold mb-4">${title}</h1>
      <div class="space-y-4 text-base leading-7 text-[#464555]">${content}</div>
      <div class="mt-8 flex flex-wrap gap-3 text-sm">
        <a class="text-[#413fd6] font-semibold" href="/dashboard">Dashboard</a>
        <a class="text-[#413fd6] font-semibold" href="/assets">Assets</a>
        <a class="text-[#413fd6] font-semibold" href="/agents">Agents</a>
        <a class="text-[#413fd6] font-semibold" href="/ai-console">YantraNklan</a>
      </div>
    </section>
  </main>
</body>
</html>`;
}

app.get('/', authOptional, servePage('yantramitra_home'));
app.get('/login', servePage('login_yantramitra_polished'));
app.get('/signup', servePage('join_yantramitra_polished'));
app.get('/reset-password', servePage('reset_password_yantramitra_polished'));
app.get('/onboarding', authRequired, servePage('onboarding_yantramitra_polished'));
app.get('/dashboard', authRequired, servePage('command_center_yantramitra'));
app.get('/map', authRequired, servePage('global_operations_map_yantramitra_polished'));
app.get('/plant/:id', authRequired, servePage('detroit_plant_overview_yantramitra'));
app.get('/digital-twin', authRequired, servePage('digital_twin_yantramitra'));
app.get('/assets', authRequired, servePage('asset_fleet_yantramitra'));
app.get('/assets/:id', authRequired, servePage('asset_detail_pump_p_102_yantramitra'));
app.get('/anomaly', authRequired, servePage('anomaly_investigation_yantramitra'));
app.get('/reliability', authRequired, servePage('reliability_forecast_yantramitra'));
app.get('/simulator', authRequired, servePage('scenario_simulator_yantramitra'));
app.get('/ai-console', authRequired, servePage('ai_operations_console_yantramitra'));
app.get('/agents', authRequired, servePage('agent_mission_control_yantramitra'));
app.get('/plans', authRequired, servePage('plan_review_yantramitra'));
app.get('/maintenance', authRequired, servePage('maintenance_planner_yantramitra'));
app.get('/work-orders', authRequired, servePage('work_orders_yantramitra'));
app.get('/settings', authRequired, servePage('settings_yantramitra'));
app.get('/about', (req, res) => {
  res.send(infoPage('About YantraMitra', '<p>YantraMitra is an industrial operations intelligence platform built around a realistic five-plant Indian manufacturing company. The product combines command dashboards, plant maps, machine health, work orders, digital-twin views, and YantraNklan AI agents.</p><p>The public site explains the platform without sending logged-out visitors into protected app routes. After sign-in, teams can enter the working company operations environment.</p>'));
});
app.get('/help', (req, res) => {
  res.send(infoPage('Help', '<p><strong>Getting started:</strong> create an account, choose a role, complete onboarding, then open the command center.</p><p><strong>Common flow:</strong> review plant status, inspect the relevant machine or plant, ask YantraNklan for context, approve a plan, and track the work order to closure.</p><p><strong>Company setup:</strong> configure environment secrets, seed or connect live plant data, and confirm role access before production use.</p>'));
});
app.get('/contact', (req, res) => {
  res.send(infoPage('Contact', '<p>For demo planning, deployment questions, or company rollout discussion, use the Contact Sales modal on the home page or email the project owner from your company workspace.</p><p>Suggested information to prepare: number of plants, machine classes, sensor sources, current CMMS/work-order tools, user roles, and deployment timeline.</p>'));
});
app.get('/documentation', (req, res) => {
  res.send(infoPage('Documentation', '<p>The project overview PDF below explains the YantraMitra scenario, feature map, operating flow, and release notes.</p><p><a class="text-[#413fd6] font-semibold" href="/docs/yantramitra-project-overview.pdf">Open PDF in a new tab</a></p><iframe title="YantraMitra Project Overview PDF" src="/docs/yantramitra-project-overview.pdf" style="width:100%;height:72vh;border:1px solid #c7c4d7;border-radius:14px;background:#fff"></iframe>'));
});
app.get('/privacy', (req, res) => {
  res.send(infoPage('Privacy', '<p>YantraMitra is designed for company-controlled operational data. Production deployments should connect only approved databases, restrict user access, and configure OpenAI keys under the company account.</p><p>This demo build does not sell personal data. Profile and operations data are used to provide dashboards, work order workflows, and YantraNklan AI responses.</p>'));
});
app.get('/terms', (req, res) => {
  res.send(infoPage('Terms', '<p>YantraMitra is provided for authorized industrial operations teams. Users are responsible for validating AI-assisted recommendations before taking physical maintenance or production action.</p><p>Company deployments should define their own operating procedures, approval rules, and incident response policy.</p>'));
});
app.get('/sitemap', (req, res) => {
  res.send(infoPage('Sitemap', '<p><a class="text-[#413fd6] font-semibold" href="/">Home</a></p><p><a class="text-[#413fd6] font-semibold" href="/about">About</a></p><p><a class="text-[#413fd6] font-semibold" href="/help">Help</a></p><p><a class="text-[#413fd6] font-semibold" href="/contact">Contact</a></p><p><a class="text-[#413fd6] font-semibold" href="/documentation">Documentation</a></p><p><a class="text-[#413fd6] font-semibold" href="/privacy">Privacy</a></p><p><a class="text-[#413fd6] font-semibold" href="/terms">Terms</a></p><p><a class="text-[#413fd6] font-semibold" href="/api-status">API Status</a></p>'));
});
app.get('/api-status', (req, res) => {
  res.send(infoPage('API Status', `<p><strong>Status:</strong> Operational</p><p><strong>Runtime:</strong> Node.js / Express</p><p><strong>Uptime:</strong> ${Math.round(process.uptime())} seconds</p><p><strong>AI assistant:</strong> ${process.env.OPENAI_API_KEY ? 'Configured' : 'Needs OPENAI_API_KEY'}</p>`));
});

app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: 'login' }), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/signup', rateLimit({ windowMs: 60 * 60 * 1000, max: 10, keyPrefix: 'signup' }), async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const allowedSignupRoles = ['operator', 'maintenance', 'plant_manager', 'executive'];
    const role = allowedSignupRoles.includes(req.body.role) ? req.body.role : 'operator';
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name: name || email.split('@')[0], role }
    });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/reset-password', rateLimit({ windowMs: 60 * 60 * 1000, max: 5, keyPrefix: 'reset-password' }), async (req, res) => {
  try {
    if (process.env.ENABLE_DEMO_PASSWORD_RESET !== 'true') {
      return res.status(501).json({
        error: 'Password reset requires email verification setup before production use'
      });
    }
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { email }, data: { password: hashedPassword } });
    res.json({ message: 'Password reset successful' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, email: true, name: true, role: true } });
    res.json(user);
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out' });
});

app.get('/api/public/stats', async (req, res) => {
  try {
    const [facilities, machines, sensors] = await Promise.all([
      prisma.plant.count(),
      prisma.machine.count(),
      prisma.machineSensor.count(),
    ]);
    res.json({ facilities, machines, sensors });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/plants', authApi, async (req, res) => {
  try {
    const plants = await prisma.plant.findMany({
      include: {
        buildings: { include: { lines: true } },
        _count: { select: { machines: true } }
      }
    });
    res.json(plants);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/plants/:id', authApi, async (req, res) => {
  try {
    const plants = await prisma.plant.findMany({
      include: {
        machines: {
          include: {
            _count: { select: { alarms: true, workOrders: true } },
            readings: { take: 100, orderBy: { timestamp: 'desc' } }
          }
        }
      }
    });
    const slugify = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const plant = plants.find(p => p.id === req.params.id || slugify(p.name) === req.params.id);
    if (!plant) return res.status(404).json({ error: 'Plant not found' });
    res.json(plant);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/machines', authApi, async (req, res) => {
  try {
    const machines = await prisma.machine.findMany({
      include: {
        plant: { select: { name: true, location: true } },
        productionLine: { include: { building: { include: { plant: { select: { name: true } } } } } },
        alarms: { orderBy: { createdAt: 'desc' }, take: 5 },
        sensors: { take: 12, orderBy: { createdAt: 'asc' } },
        _count: { select: { alarms: true, workOrders: true } }
      }
    });
    res.json(machines);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/machines/:id', authApi, async (req, res) => {
  try {
    const machine = await prisma.machine.findUnique({
      where: { id: req.params.id },
      include: {
        plant: true,
        productionLine: { include: { building: true } },
        sensors: true,
        components: { include: { sensors: true } },
        inventoryParts: true,
        maintenanceEvents: { orderBy: { performedAt: 'desc' } },
        readings: { orderBy: { timestamp: 'desc' }, take: 1000 },
        alarms: { orderBy: { createdAt: 'desc' } },
        workOrders: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!machine) return res.status(404).json({ error: 'Machine not found' });
    res.json(machine);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/readings', authApi, async (req, res) => {
  try {
    const { machineId, metric, hours } = req.query;
    const where = {};
    if (machineId) where.machineId = machineId;
    if (metric) where.metric = metric;
    const parsedHours = hours ? Number(hours) : null;
    if (hours && (!Number.isFinite(parsedHours) || parsedHours <= 0)) {
      return res.status(400).json({ error: 'hours must be a positive number' });
    }
    const since = parsedHours ? new Date(Date.now() - parsedHours * 3600000) : new Date(0);
    where.timestamp = { gte: since };
    const readings = await prisma.sensorReading.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: 2000
    });
    res.json(readings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/alarms', authApi, async (req, res) => {
  try {
    const alarms = await prisma.alarm.findMany({
      include: { machine: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(alarms);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

async function createAudit(actorId, action, entity, entityId, detail) {
  try {
    await prisma.auditLog.create({ data: { actorId, action, entity, entityId, detail } });
  } catch {}
}

async function createNotification({ userId, title, message, type = 'info', priority = 'medium', link }) {
  try {
    await prisma.notification.create({ data: { userId, title, message, type, priority, link } });
  } catch {}
}

app.patch('/api/alarms/:id/resolve', authApi, async (req, res) => {
  try {
    const alarm = await prisma.alarm.update({
      where: { id: req.params.id },
      data: { status: 'resolved', resolvedAt: new Date() }
    });
    res.json(alarm);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/incidents', authApi, async (req, res) => {
  try {
    const incidents = await prisma.operationalIncident.findMany({
      include: {
        machine: { include: { plant: true, productionLine: { include: { building: true } }, alarms: { take: 3, orderBy: { createdAt: 'desc' } }, workOrders: { take: 3, orderBy: { createdAt: 'desc' } }, inventoryParts: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(incidents);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/incidents/:id', authApi, async (req, res) => {
  try {
    const incident = await prisma.operationalIncident.findUnique({
      where: { id: req.params.id },
      include: {
        machine: {
          include: {
            plant: true,
            productionLine: { include: { building: true } },
            readings: { orderBy: { timestamp: 'desc' }, take: 120 },
            alarms: { orderBy: { createdAt: 'desc' } },
            workOrders: { orderBy: { createdAt: 'desc' } },
            inventoryParts: true,
            maintenanceEvents: { orderBy: { performedAt: 'desc' } }
          }
        }
      }
    });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/incidents/:id/actions', authApi, async (req, res) => {
  try {
    const { action } = req.body;
    const incident = await prisma.operationalIncident.findUnique({
      where: { id: req.params.id },
      include: { machine: { include: { plant: true, inventoryParts: true } } }
    });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    const timeline = Array.isArray(incident.timeline) ? incident.timeline : [];
    const addTimeline = (stage, label) => [...timeline, { t: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), stage, label }];

    if (action === 'generate_plan') {
      const plan = await prisma.plan.create({
        data: {
          title: `AI plan: ${incident.machine.name}`,
          description: `Planner Agent generated plan for ${incident.title}. Root cause: ${incident.rootCause || 'under investigation'}.`,
          type: 'maintenance',
          status: 'pending',
          priority: incident.severity === 'critical' ? 'critical' : 'high',
          createdBy: req.user.id,
          plantId: incident.machine.plantId
        }
      });
      const updated = await prisma.operationalIncident.update({ where: { id: incident.id }, data: { planId: plan.id, stage: 'plan_created', timeline: addTimeline('plan_created', 'Planner Agent generated a maintenance plan') } });
      await createAudit(req.user.id, 'incident.plan_generated', 'OperationalIncident', incident.id, { planId: plan.id });
      return res.json({ incident: updated, plan });
    }

    if (action === 'approve_plan') {
      if (incident.planId) await prisma.plan.update({ where: { id: incident.planId }, data: { status: 'approved', approvedBy: req.user.id, approvedAt: new Date() } });
      const updated = await prisma.operationalIncident.update({ where: { id: incident.id }, data: { stage: 'approved', timeline: addTimeline('approved', 'Maintenance plan approved') } });
      await createAudit(req.user.id, 'incident.plan_approved', 'OperationalIncident', incident.id, { planId: incident.planId });
      return res.json({ incident: updated });
    }

    if (action === 'create_work_order') {
      const order = await prisma.workOrder.create({
        data: {
          title: `Repair ${incident.machine.name}`,
          description: `Created from incident ${incident.title}. Reserve parts and execute controlled maintenance window.`,
          status: 'open',
          priority: incident.severity === 'critical' ? 'critical' : 'high',
          machineId: incident.machineId,
          assignedTo: req.body.assignedTo || 'Farhan Shaikh',
          createdBy: req.user.id,
          dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10)
        }
      });
      const updated = await prisma.operationalIncident.update({ where: { id: incident.id }, data: { workOrderId: order.id, stage: 'work_order_created', timeline: addTimeline('work_order_created', `Work order assigned to ${order.assignedTo}`) } });
      await createNotification({ title: 'Work order created', message: `${order.title} assigned to ${order.assignedTo}`, type: 'assignment', priority: order.priority, link: '/work-orders' });
      await createAudit(req.user.id, 'incident.work_order_created', 'OperationalIncident', incident.id, { workOrderId: order.id });
      return res.json({ incident: updated, workOrder: order });
    }

    if (action === 'reserve_inventory') {
      const part = incident.machine.inventoryParts[0];
      if (part) await prisma.inventoryPart.update({ where: { id: part.id }, data: { quantity: Math.max(0, part.quantity - 1) } });
      const updated = await prisma.operationalIncident.update({ where: { id: incident.id }, data: { stage: 'inventory_reserved', timeline: addTimeline('inventory_reserved', `${part?.name || 'Critical spare'} reserved for maintenance`) } });
      await createAudit(req.user.id, 'incident.inventory_reserved', 'OperationalIncident', incident.id, { part: part?.sku });
      return res.json({ incident: updated, reservedPart: part });
    }

    if (action === 'mark_repaired') {
      if (incident.workOrderId) await prisma.workOrder.update({ where: { id: incident.workOrderId }, data: { status: 'completed' } });
      await prisma.machine.update({ where: { id: incident.machineId }, data: { status: 'running', health: Math.min(96, incident.machine.health + 18), failureProbability: 8, remainingUsefulLife: 1400 } });
      const updated = await prisma.operationalIncident.update({ where: { id: incident.id }, data: { status: 'recovered', stage: 'recovered', recoveredAt: new Date(), timeline: addTimeline('recovered', 'Machine repaired and KPIs recovered') } });
      await createNotification({ title: 'Incident recovered', message: `${incident.machine.name} returned to running state.`, type: 'incident', priority: 'medium', link: '/dashboard' });
      await createAudit(req.user.id, 'incident.recovered', 'OperationalIncident', incident.id, { machineId: incident.machineId });
      return res.json({ incident: updated });
    }

    res.status(400).json({ error: 'Unsupported incident action' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/agents', authApi, async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(agents);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/agents', authApi, async (req, res) => {
  try {
    const data = pickAllowed(req.body, ['name', 'type', 'status', 'model', 'mission', 'progress']);
    if (!data.name) data.name = 'Mission Agent';
    if (!data.type) data.type = 'analysis';
    if (!data.model) data.model = 'Diagnostic-D2';
    if (!data.status) data.status = 'active';
    data.progress = Math.max(0, Math.min(100, Number(data.progress) || 0));
    const agent = await prisma.agent.create({ data });
    res.status(201).json(agent);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/agents/:id', authApi, async (req, res) => {
  try {
    const data = pickAllowed(req.body, ['status', 'mission', 'progress']);
    const statusError = validateEnum(data.status, ['active', 'idle', 'paused', 'done', 'error'], 'status');
    if (statusError) return res.status(400).json({ error: statusError });
    if (data.progress != null) data.progress = Math.max(0, Math.min(100, Number(data.progress) || 0));
    const agent = await prisma.agent.update({
      where: { id: req.params.id },
      data
    });
    res.json(agent);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/plans', authApi, async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(plans);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/plans', authApi, async (req, res) => {
  try {
    const data = pickAllowed(req.body, ['title', 'description', 'type', 'status', 'priority', 'plantId']);
    if (!data.title) return res.status(400).json({ error: 'title is required' });
    data.type = data.type || 'maintenance';
    data.status = data.status || 'pending';
    data.priority = data.priority || 'medium';
    data.createdBy = req.user.id;
    const plan = await prisma.plan.create({ data });
    res.status(201).json(plan);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/plans/:id', authApi, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const statusError = validateEnum(status, ['pending', 'approved', 'rejected'], 'status');
    if (statusError) return res.status(400).json({ error: statusError });
    const data = {};
    if (status) data.status = status;
    if (status === 'approved' || status === 'rejected') {
      data.approvedBy = req.user.id;
      data.approvedAt = new Date();
    }
    const plan = await prisma.plan.update({ where: { id: req.params.id }, data });
    res.json(plan);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/work-orders', authApi, async (req, res) => {
  try {
    const orders = await prisma.workOrder.findMany({
      include: { machine: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/work-orders', authApi, async (req, res) => {
  try {
    const data = pickAllowed(req.body, ['title', 'description', 'status', 'priority', 'machineId', 'assignedTo', 'dueDate']);
    if (!data.title) return res.status(400).json({ error: 'title is required' });
    data.status = data.status || 'open';
    data.priority = data.priority || 'medium';
    data.createdBy = req.user.id;
    const order = await prisma.workOrder.create({ data, include: { machine: { select: { name: true } } } });
    res.status(201).json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/work-orders/:id', authApi, async (req, res) => {
  try {
    const data = pickAllowed(req.body, ['title', 'description', 'status', 'priority', 'assignedTo', 'dueDate']);
    const statusError = validateEnum(data.status, ['open', 'in_progress', 'completed', 'blocked'], 'status');
    if (statusError) return res.status(400).json({ error: statusError });
    const priorityError = validateEnum(data.priority, ['low', 'medium', 'high', 'critical'], 'priority');
    if (priorityError) return res.status(400).json({ error: priorityError });
    const order = await prisma.workOrder.update({
      where: { id: req.params.id },
      data
    });
    res.json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/dashboard/summary', authApi, async (req, res) => {
  try {
    const [
      totalMachines, activeAlarms, totalWorkOrders, plants,
      machinesByStatus, recentAlarms, criticalAlarms
    ] = await Promise.all([
      prisma.machine.count(),
      prisma.alarm.count({ where: { status: 'active' } }),
      prisma.workOrder.count(),
      prisma.plant.findMany({ select: { id: true, name: true, location: true, status: true, lat: true, lng: true, oee: true, energyUsage: true, co2Tonnes: true, utilization: true, _count: { select: { machines: true } } } }),
      prisma.machine.groupBy({ by: ['status'], _count: true }),
      prisma.alarm.findMany({ where: { status: 'active' }, include: { machine: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.alarm.count({ where: { status: 'active', severity: 'critical' } }),
    ]);
    res.json({ totalMachines, activeAlarms, totalWorkOrders, plants, machinesByStatus, recentAlarms, criticalAlarms });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/executive/summary', authApi, async (req, res) => {
  try {
    const [plants, incidents, workOrders, alarms] = await Promise.all([
      prisma.plant.findMany({ include: { machines: true } }),
      prisma.operationalIncident.findMany({ include: { machine: { include: { plant: true } } }, orderBy: { updatedAt: 'desc' } }),
      prisma.workOrder.findMany({ include: { machine: true } }),
      prisma.alarm.findMany({ where: { status: 'active' } })
    ]);
    const downtimeCost = incidents.reduce((sum, i) => sum + (i.impactCost || 0), 0);
    const plantRanking = plants.map(p => ({
      id: p.id,
      name: p.name,
      oee: p.oee || 0,
      energyUsage: p.energyUsage || 0,
      co2Tonnes: p.co2Tonnes || 0,
      avgHealth: Math.round((p.machines.reduce((s, m) => s + m.health, 0) / (p.machines.length || 1)) * 10) / 10
    })).sort((a, b) => b.oee - a.oee);
    res.json({
      company: 'Yantra Manufacturing Technologies Pvt. Ltd.',
      headOffice: 'Bengaluru',
      downtimeCost,
      openIncidents: incidents.filter(i => i.status !== 'recovered').length,
      activeAlarms: alarms.length,
      openWorkOrders: workOrders.filter(w => w.status !== 'completed').length,
      plantRanking,
      recommendations: [
        'Approve Pune spindle intervention before Line 1 throughput degrades further.',
        'Reserve Ahmedabad chemical mixer bearing kit due to low stock exposure.',
        'Shift Chennai SMT preventive calibration into next low-load window.'
      ]
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/notifications', authApi, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { OR: [{ userId: req.user.id }, { userId: null }] },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(notifications);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/notifications/:id', authApi, async (req, res) => {
  try {
    const data = pickAllowed(req.body, ['status']);
    if (data.status === 'archived') data.archivedAt = new Date();
    const note = await prisma.notification.update({ where: { id: req.params.id }, data });
    res.json(note);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/audit-log', authApi, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    res.json(logs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/command-palette', authApi, async (req, res) => {
  try {
    const q = String(req.query.q || '').toLowerCase();
    const [plants, machines, workOrders, agents, incidents] = await Promise.all([
      prisma.plant.findMany({ take: 20 }),
      prisma.machine.findMany({ take: 30, include: { plant: true } }),
      prisma.workOrder.findMany({ take: 20 }),
      prisma.agent.findMany({ take: 20 }),
      prisma.operationalIncident.findMany({ take: 20 })
    ]);
    const items = [
      ...plants.map(p => ({ type: 'Plant', label: p.name, detail: p.location, href: `/plant/${p.id}` })),
      ...machines.map(m => ({ type: 'Machine', label: m.name, detail: `${m.plant.name} · ${Math.round(m.health)}% health`, href: `/digital-twin?machine=${encodeURIComponent(m.name)}` })),
      ...workOrders.map(w => ({ type: 'Work Order', label: w.title, detail: `${w.status} · ${w.priority}`, href: '/work-orders' })),
      ...agents.map(a => ({ type: 'Agent', label: a.name, detail: `${a.type} · ${a.status}`, href: '/agents' })),
      ...incidents.map(i => ({ type: 'Incident', label: i.title, detail: `${i.stage} · ${i.severity}`, href: '/anomaly' })),
      { type: 'Action', label: 'Run Demo', detail: 'Start guided operational story', action: 'runDemo' },
      { type: 'Action', label: 'Open Incident Replay', detail: 'Replay the active incident lifecycle', action: 'incidentReplay' },
      { type: 'Page', label: 'Executive Summary', detail: 'Business KPIs and recommendations', href: '/dashboard' },
    ];
    res.json(items.filter(item => !q || `${item.type} ${item.label} ${item.detail}`.toLowerCase().includes(q)).slice(0, 25));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/analytics/reliability', authApi, async (req, res) => {
  try {
    const plants = await prisma.plant.findMany({
      include: { machines: true }
    });
    const reliability = plants.map(p => {
      const avgHealth = p.machines.reduce((sum, m) => sum + m.health, 0) / (p.machines.length || 1);
      return { plantId: p.id, plantName: p.name, avgHealth: Math.round(avgHealth * 10) / 10, machineCount: p.machines.length };
    });
    res.json(reliability);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/user/profile', authApi, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, avatar: true, phone: true, createdAt: true }
    });
    res.json(user);
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

app.get('/api/team', authApi, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, avatar: true, phone: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/user/preferences', authApi, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { prefs: true, integrations: true, sessions: true } });
    res.json({
      prefs: user?.prefs || {},
      integrations: user?.integrations || {},
      sessions: user?.sessions || []
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/user/preferences', authApi, async (req, res) => {
  try {
    const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { prefs: true, integrations: true, sessions: true } });
    const data = {};
    if (req.body.prefs) data.prefs = { ...(current?.prefs || {}), ...req.body.prefs };
    if (req.body.integrations) data.integrations = { ...(current?.integrations || {}), ...req.body.integrations };
    if (req.body.sessions) data.sessions = req.body.sessions;
    const user = await prisma.user.update({ where: { id: req.user.id }, data, select: { prefs: true, integrations: true, sessions: true } });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/change-password', authApi, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const ok = currentPassword && await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });
    const password = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/user/profile', authApi, async (req, res) => {
  try {
    const { name, email, role, phone, avatar } = req.body;
    const allowedProfileRoles = ['operator', 'maintenance', 'plant_manager', 'executive'];
    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (role && allowedProfileRoles.includes(role)) data.role = role;
    if (phone != null) data.phone = phone;
    if (avatar != null) data.avatar = avatar;
    const user = await prisma.user.update({ where: { id: req.user.id }, data, select: { id: true, email: true, name: true, role: true, avatar: true, phone: true } });
    const newToken = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, newToken);
    res.json(user);
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

app.get('/api/onboarding/status', authApi, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, name: true, role: true, createdAt: true } });
    const completed = user.name !== 'Operator' && user.createdAt < new Date(Date.now() - 60000);
    res.json({ completed, user, steps: completed ? 4 : 2 });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

// ──────────────────────────────────────────────
// YantraNklan AI Chat — powered by OpenAI
// ──────────────────────────────────────────────
function buildYantraNklanFallback(message, contextSummary) {
  const text = String(message || '').toLowerCase();
  const alarms = contextSummary.activeAlarms || [];
  const machines = contextSummary.machines || [];
  const workOrders = contextSummary.workOrders || [];
  const agents = contextSummary.agents || [];

  const namedMachine = machines.find(m => text.includes(String(m.name || '').toLowerCase()) || text.includes(String(m.id || '').toLowerCase()));
  if (namedMachine) {
    const relatedAlarms = alarms.filter(a => a.machine === namedMachine.name);
    const relatedOrders = workOrders.filter(w => w.machine === namedMachine.name);
    return [
      `YantraNklan fallback mode: ${namedMachine.name} is currently ${namedMachine.status} with a ${namedMachine.health}% health score at ${namedMachine.plant}.`,
      relatedAlarms.length ? `Active alarm: ${relatedAlarms[0].severity} - ${relatedAlarms[0].title}.` : 'No active alarm is attached to this machine in the current database snapshot.',
      relatedOrders.length ? `Latest work order: ${relatedOrders[0].title} (${relatedOrders[0].status}, ${relatedOrders[0].priority}).` : 'No open work order is linked in the latest work order list.'
    ].join(' ');
  }

  if (text.includes('alarm') || text.includes('alert') || text.includes('incident') || text.includes('anomaly')) {
    if (!alarms.length) return 'YantraNklan fallback mode: there are no active alarms in the current database snapshot.';
    return `YantraNklan fallback mode: ${alarms.length} active alarms are in the current snapshot. Highest priority item: ${alarms[0].severity} - ${alarms[0].title} on ${alarms[0].machine}.`;
  }

  if (text.includes('work order') || text.includes('maintenance')) {
    if (!workOrders.length) return 'YantraNklan fallback mode: there are no recent work orders in the current database snapshot.';
    return `YantraNklan fallback mode: ${workOrders.length} recent work orders are available. Latest: ${workOrders[0].title}, status ${workOrders[0].status}, priority ${workOrders[0].priority}, assigned to ${workOrders[0].assignedTo || 'unassigned'}.`;
  }

  return `YantraNklan fallback mode: I can see ${contextSummary.plants.length} plants, ${machines.length} machines, ${alarms.length} active alarms, ${workOrders.length} recent work orders, and ${agents.length} agents in the current operations database. Ask about a machine, alarm, or work order for a more specific lookup.`;
}

app.post('/api/ai-chat', authApi, rateLimit({ windowMs: 60 * 1000, max: 20, keyPrefix: 'ai-chat' }), async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Pull relevant context from the database
    const [machines, alarms, plants, agents, workOrders, plans, incidents] = await Promise.all([
      require('./lib/prisma').machine.findMany({
        include: {
          plant: { select: { name: true, location: true, oee: true, energyUsage: true, co2Tonnes: true } },
          productionLine: { include: { building: true } },
          sensors: { take: 6 },
          components: { take: 3 },
          inventoryParts: { take: 3 },
          maintenanceEvents: { orderBy: { performedAt: 'desc' }, take: 2 },
        }
      }),
      require('./lib/prisma').alarm.findMany({ where: { status: 'active' }, include: { machine: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
      require('./lib/prisma').plant.findMany(),
      require('./lib/prisma').agent.findMany({ orderBy: { createdAt: 'desc' } }),
      require('./lib/prisma').workOrder.findMany({ include: { machine: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
      require('./lib/prisma').plan.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      require('./lib/prisma').operationalIncident.findMany({ include: { machine: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 10 }),
    ]);

    const contextSummary = {
      plants: plants.map(p => ({ id: p.id, name: p.name, location: p.location, status: p.status, oee: p.oee, energyUsage: p.energyUsage, co2Tonnes: p.co2Tonnes, utilization: p.utilization })),
      machines: machines.map(m => ({
        id: m.id,
        name: m.name,
        serial: m.serial,
        type: m.type,
        status: m.status,
        health: m.health,
        oee: m.oee,
        failureProbability: m.failureProbability,
        remainingUsefulLife: m.remainingUsefulLife,
        hierarchy: [m.plant?.name, m.productionLine?.building?.name, m.productionLine?.name].filter(Boolean).join(' / '),
        plant: m.plant?.name,
        sensors: m.sensors.map(s => ({ tag: s.tag, metric: s.metric, status: s.status })),
        components: m.components.map(c => ({ name: c.name, health: c.health })),
        inventoryParts: m.inventoryParts.map(p => ({ sku: p.sku, name: p.name, quantity: p.quantity, reorderAt: p.reorderAt })),
        maintenanceHistory: m.maintenanceEvents.map(e => ({ title: e.title, performedBy: e.performedBy, performedAt: e.performedAt })),
        aiSummary: m.aiSummary
      })),
      activeAlarms: alarms.map(a => ({ id: a.id, severity: a.severity, title: a.title, message: a.message, machine: a.machine?.name, status: a.status })),
      agents: agents.map(a => ({ id: a.id, name: a.name, type: a.type, status: a.status, mission: a.mission, progress: a.progress, successRate: a.successRate, memory: a.memory, recentActions: a.recentActions })),
      workOrders: workOrders.map(w => ({ id: w.id, title: w.title, status: w.status, priority: w.priority, machine: w.machine?.name, assignedTo: w.assignedTo })),
      plans: plans.map(p => ({ id: p.id, title: p.title, type: p.type, status: p.status, priority: p.priority })),
      incidents: incidents.map(i => ({ id: i.id, title: i.title, severity: i.severity, stage: i.stage, status: i.status, rootCause: i.rootCause, impactCost: i.impactCost, machine: i.machine?.name, timeline: i.timeline })),
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.json({
        reply: buildYantraNklanFallback(message, contextSummary),
        model: 'fallback-data-lookup',
        fallback: true,
        warning: 'OPENAI_API_KEY is not configured, so YantraNklan answered from database context only.'
      });
    }

    const systemPrompt = `You are YantraNklan, YantraMitra's operations AI assistant. You have access to real-time operational data.

Current operational context:
${JSON.stringify(contextSummary, null, 2)}

Guidelines:
- Answer questions about specific machines, plants, alarms, and work orders using the provided data.
- If asked about something not in the data, say you don't have that information.
- Be concise, professional, and data-aware.
- When referencing a machine or asset, include its health score and status if available.
- For alarm questions, mention severity and which machine it's on.
- For work orders, mention status, priority, and assignee.
- Keep responses under 200 words.`;

    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey });

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const reply = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';
      res.json({ reply, model: 'gpt-4o-mini' });
    } catch (e) {
      console.error('AI provider error:', e.message);
      if (e.code === 'insufficient_quota' || (e.error && e.error.code === 'insufficient_quota') || e.status === 429) {
        return res.json({
          reply: buildYantraNklanFallback(message, contextSummary),
          model: 'fallback-data-lookup',
          fallback: true,
          warning: 'OpenAI quota or rate limit blocked the LLM call, so YantraNklan answered from database context only.'
        });
      }
      if (e.code === 'invalid_api_key' || e.status === 401) {
        return res.json({
          reply: buildYantraNklanFallback(message, contextSummary),
          model: 'fallback-data-lookup',
          fallback: true,
          warning: 'OPENAI_API_KEY is invalid, so YantraNklan answered from database context only.'
        });
      }
      throw e;
    }
  } catch (e) {
    console.error('AI Chat error:', e.message);
    res.status(500).json({ error: 'ai_error', message: 'Failed to process AI chat request: ' + e.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`YantraMitra server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
