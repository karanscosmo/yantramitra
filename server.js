const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const prisma = require('./lib/prisma');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'yantramitra-jwt-secret-2026';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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

function servePage(pageName) {
  return (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', pageName, 'code.html'));
  };
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 86400000, sameSite: 'lax' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name: name || email.split('@')[0] }
    });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 86400000, sameSite: 'lax' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
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
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

app.get('/api/plants', async (req, res) => {
  try {
    const plants = await prisma.plant.findMany({ include: { _count: { select: { machines: true } } } });
    res.json(plants);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/plants/:id', async (req, res) => {
  try {
    const plant = await prisma.plant.findUnique({
      where: { id: req.params.id },
      include: {
        machines: {
          include: {
            _count: { select: { alarms: true, workOrders: true } },
            readings: { take: 100, orderBy: { timestamp: 'desc' } }
          }
        }
      }
    });
    if (!plant) return res.status(404).json({ error: 'Plant not found' });
    res.json(plant);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/machines', async (req, res) => {
  try {
    const machines = await prisma.machine.findMany({
      include: { plant: { select: { name: true, location: true } }, _count: { select: { alarms: true, workOrders: true } } }
    });
    res.json(machines);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/machines/:id', async (req, res) => {
  try {
    const machine = await prisma.machine.findUnique({
      where: { id: req.params.id },
      include: {
        plant: true,
        readings: { orderBy: { timestamp: 'desc' }, take: 1000 },
        alarms: { orderBy: { createdAt: 'desc' } },
        workOrders: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!machine) return res.status(404).json({ error: 'Machine not found' });
    res.json(machine);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/readings', async (req, res) => {
  try {
    const { machineId, metric, hours } = req.query;
    const where = {};
    if (machineId) where.machineId = machineId;
    if (metric) where.metric = metric;
    const since = hours ? new Date(Date.now() - parseInt(hours) * 3600000) : new Date(0);
    where.timestamp = { gte: since };
    const readings = await prisma.sensorReading.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: 2000
    });
    res.json(readings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/alarms', async (req, res) => {
  try {
    const alarms = await prisma.alarm.findMany({
      include: { machine: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(alarms);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/alarms/:id/resolve', authApi, async (req, res) => {
  try {
    const alarm = await prisma.alarm.update({
      where: { id: req.params.id },
      data: { status: 'resolved', resolvedAt: new Date() }
    });
    res.json(alarm);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/agents', async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(agents);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/agents/:id', async (req, res) => {
  try {
    const agent = await prisma.agent.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(agent);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(plans);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/plans/:id', authApi, async (req, res) => {
  try {
    const { status } = req.body;
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

app.get('/api/work-orders', async (req, res) => {
  try {
    const orders = await prisma.workOrder.findMany({
      include: { machine: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/work-orders/:id', authApi, async (req, res) => {
  try {
    const order = await prisma.workOrder.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const [
      totalMachines, activeAlarms, totalWorkOrders, plants,
      machinesByStatus, recentAlarms, criticalAlarms
    ] = await Promise.all([
      prisma.machine.count(),
      prisma.alarm.count({ where: { status: 'active' } }),
      prisma.workOrder.count(),
      prisma.plant.findMany({ select: { id: true, name: true, location: true, status: true, lat: true, lng: true, _count: { select: { machines: true } } } }),
      prisma.machine.groupBy({ by: ['status'], _count: true }),
      prisma.alarm.findMany({ where: { status: 'active' }, include: { machine: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.alarm.count({ where: { status: 'active', severity: 'critical' } }),
    ]);
    res.json({ totalMachines, activeAlarms, totalWorkOrders, plants, machinesByStatus, recentAlarms, criticalAlarms });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/analytics/reliability', async (req, res) => {
  try {
    const plants = await prisma.plant.findMany({
      include: { machines: { include: { readings: { orderBy: { timestamp: 'desc' }, take: 100 } } } }
    });
    const reliability = plants.map(p => {
      const avgHealth = p.machines.reduce((sum, m) => sum + m.health, 0) / (p.machines.length || 1);
      return { plantId: p.id, plantName: p.name, avgHealth: Math.round(avgHealth * 10) / 10, machineCount: p.machines.length };
    });
    res.json(reliability);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/user/profile', async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
    res.json(user);
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

app.patch('/api/user/profile', async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { name, email } = req.body;
    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    const user = await prisma.user.update({ where: { id: decoded.id }, data, select: { id: true, email: true, name: true, role: true } });
    const newToken = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', newToken, { httpOnly: true, maxAge: 7 * 86400000, sameSite: 'lax' });
    res.json(user);
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

app.get('/api/onboarding/status', async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, name: true, role: true, createdAt: true } });
    const completed = user.name !== 'Operator' && user.createdAt < new Date(Date.now() - 60000);
    res.json({ completed, user, steps: completed ? 4 : 2 });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

// ──────────────────────────────────────────────
// YantraNklan AI Chat — powered by OpenAI
// ──────────────────────────────────────────────
app.post('/api/ai-chat', authApi, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ 
        error: 'api_key_missing',
        message: 'AI assistant is not configured yet. Please ask your administrator to set the OPENAI_API_KEY environment variable.'
      });
    }

    // Pull relevant context from the database
    const [machines, alarms, plants, agents, workOrders, plans] = await Promise.all([
      require('./lib/prisma').machine.findMany({ include: { plant: { select: { name: true } } } }),
      require('./lib/prisma').alarm.findMany({ where: { status: 'active' }, include: { machine: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
      require('./lib/prisma').plant.findMany(),
      require('./lib/prisma').agent.findMany({ orderBy: { createdAt: 'desc' } }),
      require('./lib/prisma').workOrder.findMany({ include: { machine: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
      require('./lib/prisma').plan.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    const contextSummary = {
      plants: plants.map(p => ({ id: p.id, name: p.name, location: p.location, status: p.status })),
      machines: machines.map(m => ({ id: m.id, name: m.name, type: m.type, status: m.status, health: m.health, plant: m.plant?.name })),
      activeAlarms: alarms.map(a => ({ id: a.id, severity: a.severity, title: a.title, message: a.message, machine: a.machine?.name, status: a.status })),
      agents: agents.map(a => ({ id: a.id, name: a.name, type: a.type, status: a.status, mission: a.mission, progress: a.progress })),
      workOrders: workOrders.map(w => ({ id: w.id, title: w.title, status: w.status, priority: w.priority, machine: w.machine?.name, assignedTo: w.assignedTo })),
      plans: plans.map(p => ({ id: p.id, title: p.title, type: p.type, status: p.status, priority: p.priority })),
    };

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
    console.error('AI Chat error:', e.message);
    if (e.code === 'insufficient_quota' || (e.error && e.error.code === 'insufficient_quota')) {
      return res.status(503).json({
        error: 'api_quota_exceeded',
        message: 'The AI assistant API key has exceeded its usage quota. Please ask your administrator to add billing to the OpenAI account or provide a new API key.'
      });
    }
    if (e.code === 'invalid_api_key' || e.status === 401) {
      return res.status(503).json({
        error: 'api_key_invalid',
        message: 'The AI assistant API key is invalid. Please ask your administrator to update the OPENAI_API_KEY environment variable.'
      });
    }
    res.status(500).json({ error: 'ai_error', message: 'Failed to process AI chat request: ' + e.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`YantraMitra server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
