const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const prisma = require('./services/prisma');
const googleAuth = require('./services/google-auth');
const mlPrediction = require('./services/mlPrediction');
const ragService = require('./services/rag');
const agentService = require('./services/agents');
const workflowService = require('./services/workflows');
const eventService = require('./services/events');
const graphService = require('./services/graph');
const decisionService = require('./services/decisions');
const fleetService = require('./services/fleet');
const learningService = require('./services/learning');

const isVercel = !!process.env.VERCEL;
const uploadsDir = isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads');
try { if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) { console.error('Uploads dir creation failed:', e.message); }
const upload = multer({ dest: uploadsDir, limits: { fileSize: 10 * 1024 * 1024 } });

const aiConversations = new Map();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'yantramitra-jwt-secret-2026';
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && JWT_SECRET === 'yantramitra-jwt-secret-2026') {
  throw new Error('JWT_SECRET must be set in production.');
}

const GOOGLE_AUTH_CONFIGURED = googleAuth.isConfigured();

const allowedTeamRoles = ['admin', 'operator', 'maintenance', 'plant_manager', 'executive'];
const allowedIntegrationKeys = ['SCADA', 'CMMS', 'ERP', 'Historian', 'MQTT'];

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
app.use('/uploads', express.static(uploadsDir));

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

function generateApiKey() {
  return `ym_${crypto.randomBytes(24).toString('base64url')}`;
}

function maskApiKey(key) {
  if (!key) return 'ym_...';
  return `${key.slice(0, 10)}...${key.slice(-4)}`;
}

function safePrefs(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function safeIntegrations(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function unlinkUploadedUrl(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('/uploads/')) return;
  const filePath = path.join(uploadsDir, path.basename(url));
  fs.unlink(filePath, () => {});
}

function maskedUserSettings(user) {
  const prefs = safePrefs(user?.prefs);
  const apiKeys = Array.isArray(prefs.apiKeys) ? prefs.apiKeys : [];
  const loginHistory = Array.isArray(prefs.loginHistory) ? prefs.loginHistory : [];
  return {
    prefs,
    integrations: safeIntegrations(user?.integrations),
    sessions: Array.isArray(user?.sessions) ? user.sessions : [],
    apiKeys: apiKeys.map(k => ({ ...k, key: k.keyPreview || maskApiKey(k.key) })),
    loginHistory,
  };
}

function servePage(pageName) {
  return (req, res) => {
    res.sendFile(path.join(__dirname, 'views', pageName, 'index.html'));
  };
}

function setAuthCookie(res, token) {
  res.cookie('token', token, authCookieOptions);
}

function requireDb(req, res, next) {
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });
  next();
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
    <div class="mb-8 flex flex-wrap items-center justify-between gap-3">
      <a href="/" class="inline-flex items-center gap-2 text-[#413fd6] font-semibold">YantraMitra</a>
      <button onclick="history.length > 1 ? history.back() : location.assign('/')" class="rounded-full border border-[#c7c4d7] bg-white px-4 py-2 text-sm font-bold text-[#413fd6]">Go Back</button>
    </div>
    <section class="rounded-lg border border-[#c7c4d7] bg-white p-8 shadow-sm">
      <h1 class="text-3xl font-bold mb-4">${title}</h1>
      <div class="space-y-4 text-base leading-7 text-[#464555]">${content}</div>
      <div class="mt-8 flex flex-wrap gap-3 text-sm">
        <a class="text-[#413fd6] font-semibold" href="/">Home</a>
        <a class="text-[#413fd6] font-semibold" href="/about">About</a>
        <a class="text-[#413fd6] font-semibold" href="/help">Help</a>
        <a class="text-[#413fd6] font-semibold" href="/contact">Contact</a>
        <a class="text-[#413fd6] font-semibold" href="/documentation">Documentation</a>
      </div>
    </section>
  </main>
</body>
</html>`;
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    prisma: prisma ? 'connected' : 'unavailable',
    groq: !!process.env.GROQ_API_KEY,
    vercel: isVercel,
    memory: process.memoryUsage().rss
  });
});

app.get('/api/ready', async (req, res) => {
  try {
    if (!prisma) return res.status(503).json({ status: 'error', detail: 'Database unavailable' });
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch (e) {
    res.status(503).json({ status: 'error', detail: e.message });
  }
});

const publicFacilities = {
  'pune-automotive': {
    title: 'Pune Automotive Components',
    image: '/assets/images/home-pune-automotive.jpg',
    body: '<p><strong>Company unit:</strong> Automotive components and powertrain machining.</p><p>The Pune facility represents robotic welding, CNC cells, AGV material movement, line-level telemetry, and high-throughput component production. YantraMitra tracks machine health, OEE, alarms, and maintenance readiness for this plant.</p><p><strong>What the product demonstrates:</strong> asset health, digital-twin drilldown, predictive maintenance planning, and work-order execution.</p>'
  },
  'ahmedabad-process': {
    title: 'Ahmedabad Textile & Chemical Process Lines',
    image: '/assets/images/home-ahmedabad-process.jpg',
    body: '<p><strong>Company unit:</strong> Textile finishing, dyeing, and controlled chemical process operations.</p><p>The Ahmedabad facility focuses on process tanks, fabric rollers, quality labs, dosing systems, and environmental process monitoring. It shows how YantraMitra handles continuous process context instead of only discrete manufacturing.</p><p><strong>What the product demonstrates:</strong> process visibility, quality risk, alarm triage, and plant-aware agent explanations.</p>'
  },
  'chennai-electronics': {
    title: 'Chennai Electronics Assembly',
    image: '/assets/images/home-chennai-electronics.jpg',
    body: '<p><strong>Company unit:</strong> SMT assembly, AOI inspection, reflow, and board testing.</p><p>The Chennai site models clean electronics production where throughput, inspection quality, thermal process stability, and downtime risk matter minute by minute.</p><p><strong>What the product demonstrates:</strong> line monitoring, sensor history, anomaly context, and technician-ready work orders.</p>'
  },
  'bengaluru-precision': {
    title: 'Bengaluru Precision Engineering',
    image: '/assets/images/home-bengaluru-precision.jpg',
    body: '<p><strong>Company unit:</strong> Micro-machining, metrology, calibration, and additive manufacturing.</p><p>The Bengaluru facility is a precision lab-factory hybrid. It highlights machine tolerances, CMM inspection, calibration risk, and high-value asset reliability.</p><p><strong>What the product demonstrates:</strong> reliability forecasting, component context, maintenance planning, and AI-assisted diagnostics.</p>'
  },
  'nagpur-logistics': {
    title: 'Nagpur Warehouse & Logistics Hub',
    image: '/assets/images/home-nagpur-logistics.jpg',
    body: '<p><strong>Company unit:</strong> Automated warehouse, ASRS, sortation, AGVs, and dock flow.</p><p>The Nagpur hub shows material movement, automated storage, charging flows, dock operations, and logistics execution. It rounds out YantraMitra as a full operations platform, not only a factory dashboard.</p><p><strong>What the product demonstrates:</strong> facility flow, uptime, incident visibility, and cross-site command center reporting.</p>'
  }
};

app.get('/', authOptional, servePage('home'));
app.get('/login', servePage('login'));
app.get('/signup', servePage('signup'));
app.get('/reset-password', servePage('reset-password'));
app.get('/onboarding', authRequired, servePage('onboarding'));
app.get('/dashboard', authRequired, servePage('command-center'));
app.get('/map', authRequired, servePage('global-map'));
app.get('/plant/:id', authRequired, servePage('plant-overview'));
app.get('/digital-twin', authRequired, servePage('digital-twin'));
app.get('/assets', authRequired, servePage('asset-fleet'));
app.get('/assets/:id', authRequired, servePage('asset-detail'));
app.get('/anomaly', authRequired, servePage('anomaly'));
app.get('/reliability', authRequired, servePage('reliability-forecast'));
app.get('/diagnostics/:assetId', authRequired, servePage('diagnostics'));
app.get('/simulator', authRequired, servePage('simulator'));
app.get('/ai-console', authRequired, servePage('ai-console'));
app.get('/agents', authRequired, servePage('agents'));
app.get('/plans', authRequired, servePage('plans'));
app.get('/maintenance', authRequired, servePage('maintenance'));
app.get('/work-orders', authRequired, servePage('work-orders'));
app.get('/settings', authRequired, servePage('settings'));
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
app.get('/facilities/:slug', (req, res) => {
  const facility = publicFacilities[req.params.slug];
  if (!facility) return res.status(404).send(infoPage('Facility Not Found', '<p>That public facility overview does not exist.</p>'));
  res.send(infoPage(facility.title, `<img src="${facility.image}" alt="${facility.title}" class="mb-6 h-72 w-full rounded-xl object-cover border border-[#c7c4d7]">${facility.body}`));
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
   res.send(infoPage('API Status', `<p><strong>Status:</strong> Operational</p><p><strong>Runtime:</strong> Node.js / Express</p><p><strong>Uptime:</strong> ${Math.round(process.uptime())} seconds</p><p><strong>AI assistant:</strong> ${process.env.GROQ_API_KEY ? 'Configured (Groq)' : 'Needs GROQ_API_KEY'}</p>`));
});

// All /api routes below require the database
app.use('/api', requireDb);

app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: 'login' }), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.provider === 'google' && !user.password) {
      return res.status(401).json({ error: 'This account uses Google sign-in. Please use the Continue with Google button.', googleAccount: true });
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const prefs = safePrefs(user.prefs);
    const sessions = Array.isArray(user.sessions) ? [...user.sessions] : [];
    sessions.push({ device: req.headers['user-agent']?.slice(0, 80) || 'Unknown', city: '—', lastSeen: 'just now', current: true });
    if (sessions.length > 20) sessions.splice(0, sessions.length - 20);
    await prisma.user.update({ where: { id: user.id }, data: { sessions, lastLoginMethod: 'email', prefs: { ...prefs, lastLogin: new Date().toISOString() } } });
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
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, email: true, name: true, role: true, avatar: true, googleId: true, provider: true, lastLoginMethod: true, emailVerified: true, password: true } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar, googleId: user.googleId, provider: user.provider, lastLoginMethod: user.lastLoginMethod, emailVerified: user.emailVerified, hasPassword: !!user.password });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/google', (req, res) => {
  if (!GOOGLE_AUTH_CONFIGURED) {
    return res.status(501).json({ error: 'Google authentication is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' });
  }
  const url = googleAuth.getGoogleAuthUrl();
  if (!url) return res.status(500).json({ error: 'Failed to generate Google auth URL' });
  res.redirect(url);
});

app.get('/api/auth/google/callback', rateLimit({ windowMs: 60 * 60 * 1000, max: 10, keyPrefix: 'google-callback' }), async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) {
      if (error === 'access_denied') return res.redirect('/login?error=google_cancelled');
      return res.redirect('/login?error=google_error');
    }
    if (!code) return res.redirect('/login?error=missing_code');

    const tokens = await googleAuth.exchangeCodeForTokens(code);
    if (!tokens.id_token) return res.redirect('/login?error=missing_id_token');

    const payload = await googleAuth.verifyGoogleToken(tokens.id_token);

    let user = await prisma.user.findUnique({ where: { email: payload.email } });
    let isNewUser = false;

    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: payload.googleId, provider: 'google', avatar: payload.avatar || user.avatar, emailVerified: true, lastLoginMethod: 'google' }
        });
        await createAudit(user.id, 'auth.google_link', 'User', user.id, { email: user.email });
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginMethod: 'google', avatar: payload.avatar || user.avatar }
        });
      }
      const prefs = safePrefs(user.prefs);
      const sessions = Array.isArray(user.sessions) ? [...user.sessions] : [];
      sessions.push({ device: 'Google OAuth', city: '—', lastSeen: 'just now', current: true });
      if (sessions.length > 20) sessions.splice(0, sessions.length - 20);
      const loginHistory = Array.isArray(prefs.loginHistory) ? [...prefs.loginHistory] : [];
      loginHistory.push({ success: true, method: 'google', time: new Date().toISOString(), ip: req.ip || '—', device: 'Google OAuth' });
      if (loginHistory.length > 50) loginHistory.splice(0, loginHistory.length - 50);
      await prisma.user.update({ where: { id: user.id }, data: { sessions, prefs: { ...prefs, lastLogin: new Date().toISOString(), loginHistory } } });
    } else {
      const hashedPassword = await bcrypt.hash(crypto.randomUUID() + Date.now(), 10);
      user = await prisma.user.create({
        data: {
          email: payload.email,
          password: hashedPassword,
          name: payload.name,
          role: 'operator',
          googleId: payload.googleId,
          provider: 'google',
          avatar: payload.avatar,
          emailVerified: true,
          lastLoginMethod: 'google',
          prefs: {},
          integrations: {},
          sessions: [{ device: 'Google OAuth', city: '—', lastSeen: 'just now', current: true }],
        }
      });
      isNewUser = true;
      await createAudit(user.id, 'auth.google_signup', 'User', user.id, { email: user.email });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token);

    if (isNewUser) {
      res.redirect('/onboarding?source=google');
    } else {
      res.redirect('/dashboard');
    }
  } catch (e) {
    console.error('Google callback error:', e.message);
    res.redirect('/login?error=google_auth_failed');
  }
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

app.get('/api/ml/model-info', authApi, (req, res) => {
  try {
    const status = mlPrediction.getHealthCheckStatus();
    res.json(status);
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

app.post('/api/plants', authApi, requireRole('admin', 'executive', 'plant_manager'), async (req, res) => {
  try {
    const { name, industry, city, latitude, longitude, machineCount, plantManager, status } = req.body;
    if (!name || !city || !industry || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
      return res.status(400).json({ error: 'Name, industry, city, latitude, and longitude are required' });
    }
    const plant = await prisma.plant.create({
      data: {
        name: String(name).trim(), location: String(city).trim(), domain: String(industry).trim(),
        lat: Number(latitude), lng: Number(longitude), status: ['operational', 'optimized', 'attention', 'warning'].includes(status) ? status : 'operational',
        image: '/assets/images/home-bengaluru-precision.jpg', floorLayout: { machineCount: Math.max(0, Number(machineCount) || 0), plantManager: String(plantManager || '').trim() }
      }, include: { _count: { select: { machines: true } } }
    });
    res.status(201).json(plant);
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
        readings: { take: 20, orderBy: { timestamp: 'desc' } },
        _count: { select: { alarms: true, workOrders: true } }
      }
    });
    const enriched = machines.map(m => {
      const ml = mlPrediction.predictForMachine(m, m.readings);
      return {
        ...m,
        failureProbability: ml.failureProbability,
        remainingUsefulLife: ml.remainingUsefulLife,
        riskLevel: ml.riskLevel,
        confidence: ml.confidence
      };
    });
    res.json(enriched);
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
    const mlResult = mlPrediction.predictForMachine(machine, machine.readings);
    res.json({
      ...machine,
      failureProbability: mlResult.failureProbability,
      remainingUsefulLife: mlResult.remainingUsefulLife,
      riskLevel: mlResult.riskLevel,
      confidence: mlResult.confidence,
      topContributions: mlResult.topContributions
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/diagnostics/:assetId', authApi, async (req, res) => {
  try {
    const { assetId } = req.params;
    const machine = await prisma.machine.findFirst({
      where: {
        OR: [
          { id: assetId },
          { name: { equals: assetId, mode: 'insensitive' } },
          { name: { equals: assetId.replace(/-/g, ' '), mode: 'insensitive' } },
          { serial: assetId }
        ]
      },
      include: {
        plant: true,
        productionLine: { include: { building: { include: { plant: true } } } },
        sensors: true,
        components: { include: { sensors: true } },
        inventoryParts: true,
        maintenanceEvents: { orderBy: { performedAt: 'desc' }, take: 20 },
        readings: { orderBy: { timestamp: 'desc' }, take: 50 },
        alarms: { orderBy: { createdAt: 'desc' }, take: 20 },
        workOrders: { orderBy: { createdAt: 'desc' }, take: 10 },
        incidents: { orderBy: { updatedAt: 'desc' }, take: 5 }
      }
    });
    if (!machine) return res.status(404).json({ error: 'Machine not found' });

    let plans = [];
    try {
      plans = await prisma.plan.findMany({
        where: { plantId: machine.plantId },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
    } catch {} // non-critical

    const mlResult = mlPrediction.predictForMachine(machine, machine.readings);
    const aiPredictions = {
      rootCause: machine.aiSummary || 'Vibration-induced bearing fatigue detected across recent operational cycles.',
      confidence: mlResult.confidence,
      failureProbability: mlResult.failureProbability,
      riskLevel: mlResult.riskLevel,
      topContributions: mlResult.topContributions,
      affectedComponents: machine.components?.filter(c => c.health < 85).map(c => c.name) || ['Main Bearing', 'Drive Shaft'],
      recommendedActions: machine.status === 'running'
        ? ['Schedule preventive maintenance within 14 days', 'Monitor vibration trends', 'Inspect lubrication system']
        : ['Immediate inspection required', 'Replace worn components', 'Run diagnostic sequence'],
      estimatedDowntime: `${Math.max(1, Math.round(mlResult.remainingUsefulLife / 24))} hours`,
      remainingUsefulLife: `${mlResult.remainingUsefulLife}h`,
      modelInfo: mlResult.modelMeta
    };

    const telemetry = {};
    const telemetryMetrics = ['temperature', 'vibration', 'power', 'rpm', 'torque', 'pressure', 'energy'];
    (machine.readings || []).forEach(r => {
      const key = r.metric.toLowerCase().replace(/\s+/g, '_');
      if (telemetryMetrics.includes(key) && !telemetry[key]) {
        telemetry[key] = { value: r.value, unit: r.unit, timestamp: r.timestamp };
      }
    });
    telemetryMetrics.forEach(m => { if (!telemetry[m]) telemetry[m] = { value: null, unit: '', timestamp: null }; });

    res.json({
      machine: {
        id: machine.id, name: machine.name, serial: machine.serial,
        type: machine.type, status: machine.status, health: machine.health,
        oee: machine.oee, location: machine.location,
        installationDate: machine.installationDate,
        criticality: machine.criticality,
        failureProbability: mlResult.failureProbability,
        remainingUsefulLife: mlResult.remainingUsefulLife,
        riskLevel: mlResult.riskLevel,
        confidence: mlResult.confidence,
        lastUpdated: machine.updatedAt
      },
      plant: machine.plant ? { id: machine.plant.id, name: machine.plant.name, location: machine.plant.location } : null,
      hierarchy: {
        plant: machine.productionLine?.building?.plant?.name || machine.plant?.name || '',
        building: machine.productionLine?.building?.name || '',
        line: machine.productionLine?.name || ''
      },
      sensors: machine.sensors || [],
      components: machine.components || [],
      inventoryParts: machine.inventoryParts || [],
      alarms: machine.alarms || [],
      maintenanceEvents: machine.maintenanceEvents || [],
      workOrders: machine.workOrders || [],
      plans: plans || [],
      incidents: machine.incidents || [],
      telemetry,
      aiPredictions
    });
  } catch (e) {
    console.error('Diagnostics error:', e.message);
    res.status(500).json({ error: e.message });
  }
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
    await createAudit(req.user.id, 'alarm.resolved', 'Alarm', alarm.id, { machineId: alarm.machineId });
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
      const updatedHealth = Math.min(96, incident.machine.health + 18);
      const mlPost = mlPrediction.predictForMachine({ ...incident.machine, health: updatedHealth, status: 'running' }, []);
      await prisma.machine.update({
        where: { id: incident.machineId },
        data: {
          status: 'running',
          health: updatedHealth,
          failureProbability: mlPost.failureProbability,
          remainingUsefulLife: mlPost.remainingUsefulLife
        }
      });
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
    await createAudit(req.user.id, 'agent.created', 'Agent', agent.id, { name: agent.name, type: agent.type });
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
    await createAudit(req.user.id, 'agent.updated', 'Agent', agent.id, data);
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
    await createAudit(req.user.id, 'plan.created', 'Plan', plan.id, { title: plan.title, status: plan.status });
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
    await createAudit(req.user.id, 'plan.updated', 'Plan', plan.id, data);
    res.json(plan);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const SEED_WORK_ORDERS = [
  { title: 'Bearing Replacement', description: 'Replace worn main bearing on CNC spindle. Vibration analysis indicates imminent failure.', priority: 'critical', status: 'in_progress', assignedTo: 'Rahul Sharma', dueDate: new Date(Date.now() + 864e5).toISOString().split('T')[0] },
  { title: 'Cooling Pump Inspection', description: 'Inspect and service coolant pump #3. Flow rate dropped 18% below baseline.', priority: 'high', status: 'in_progress', assignedTo: 'Anita Desai', dueDate: new Date(Date.now() + 2*864e5).toISOString().split('T')[0] },
  { title: 'Hydraulic Leak Investigation', description: 'Hydraulic fluid leak detected near press station. Trace source and repair.', priority: 'high', status: 'open', assignedTo: 'Vikram Patel', dueDate: new Date(Date.now() + 864e5).toISOString().split('T')[0] },
  { title: 'Robot Arm Calibration', description: 'End-effector positioning drift exceeds tolerance. Perform full 6-axis recalibration.', priority: 'medium', status: 'open', assignedTo: 'Sofia Khan', dueDate: new Date(Date.now() + 3*864e5).toISOString().split('T')[0] },
  { title: 'Conveyor Belt Alignment', description: 'Belt tracking off by 12mm. Realign rollers and tensioner assembly.', priority: 'medium', status: 'open', assignedTo: 'Arun Nair', dueDate: new Date(Date.now() + 4*864e5).toISOString().split('T')[0] },
  { title: 'Vibration Analysis', description: 'Scheduled vibration signature collection on all rotating equipment in Line A.', priority: 'low', status: 'completed', assignedTo: 'Rahul Sharma', dueDate: new Date(Date.now() - 864e5).toISOString().split('T')[0] },
  { title: 'PLC Restart', description: 'PLC-04 in packaging section unresponsive. Perform controlled power cycle and verify program integrity.', priority: 'critical', status: 'in_progress', assignedTo: 'Meera Joshi', dueDate: new Date(Date.now()).toISOString().split('T')[0] },
  { title: 'Emergency Shutdown Validation', description: 'Test E-stop circuit on all production lines after last week\'s false trip incident.', priority: 'high', status: 'open', assignedTo: 'Vikram Patel', dueDate: new Date(Date.now() + 864e5).toISOString().split('T')[0] },
  { title: 'Lubrication System Refill', description: 'Central lubrication reservoir below 15%. Refill and check distribution lines.', priority: 'medium', status: 'waiting_parts', assignedTo: 'Dinesh Kumar', dueDate: new Date(Date.now() - 864e5).toISOString().split('T')[0] },
  { title: 'Sensor Calibration', description: 'Annual calibration of all temperature and pressure sensors in furnace zone.', priority: 'medium', status: 'open', assignedTo: 'Anita Desai', dueDate: new Date(Date.now() + 5*864e5).toISOString().split('T')[0] },
  { title: 'AGV Path Reconfiguration', description: 'Update AGV magnetic tape path around new storage rack installation in warehouse.', priority: 'low', status: 'open', assignedTo: 'Sofia Khan', dueDate: new Date(Date.now() + 7*864e5).toISOString().split('T')[0] },
  { title: 'Compressor Overhaul', description: 'Scheduled 5000-hour overhaul of main air compressor. Replace seals, filters, and oil.', priority: 'high', status: 'waiting_parts', assignedTo: 'Arun Nair', dueDate: new Date(Date.now() + 864e5).toISOString().split('T')[0] },
  { title: 'HMI Screen Replacement', description: 'Touchscreen on Line B HMI has dead zones. Replace with spare unit.', priority: 'medium', status: 'open', assignedTo: 'Meera Joshi', dueDate: new Date(Date.now() + 6*864e5).toISOString().split('T')[0] },
  { title: 'Welding Robot Torch Cleaning', description: 'Wire feed inconsistency on welding robot #2. Clean torch nozzle and check feed mechanism.', priority: 'low', status: 'completed', assignedTo: 'Dinesh Kumar', dueDate: new Date(Date.now() - 2*864e5).toISOString().split('T')[0] },
  { title: 'Boiler Tube Inspection', description: 'Ultrasonic thickness testing on boiler tubes in steam generation unit.', priority: 'high', status: 'open', assignedTo: 'Rahul Sharma', dueDate: new Date(Date.now() + 3*864e5).toISOString().split('T')[0] },
  { title: 'Network Switch Replacement', description: 'Industrial switch SC-08 has intermittent link drops. Replace with managed PoE switch.', priority: 'critical', status: 'in_progress', assignedTo: 'Vikram Patel', dueDate: new Date(Date.now()).toISOString().split('T')[0] },
  { title: 'Packaging Line Sanitization', description: 'Weekly CIP sanitation cycle for food-grade packaging line.', priority: 'medium', status: 'open', assignedTo: 'Anita Desai', dueDate: new Date(Date.now() + 864e5).toISOString().split('T')[0] },
  { title: 'Motor Coupling Replacement', description: 'Coupling on conveyor motor M-07 shows wear marks. Replace before failure.', priority: 'high', status: 'open', assignedTo: 'Arun Nair', dueDate: new Date(Date.now() + 2*864e5).toISOString().split('T')[0] },
  { title: 'Quality Inspection Protocol Update', description: 'Update QA inspection points for new product variant on Assembly Line 3.', priority: 'low', status: 'open', assignedTo: 'Sofia Khan', dueDate: new Date(Date.now() + 10*864e5).toISOString().split('T')[0] },
  { title: 'Chiller Unit Service', description: 'Process chiller temperature stability degraded. Service compressor and check refrigerant level.', priority: 'high', status: 'waiting_parts', assignedTo: 'Meera Joshi', dueDate: new Date(Date.now() + 864e5).toISOString().split('T')[0] },
  { title: 'CCTV Camera Maintenance', description: 'Clean and realign PTZ cameras on production floor. Replace faulty camera at zone 4.', priority: 'low', status: 'open', assignedTo: 'Dinesh Kumar', dueDate: new Date(Date.now() + 8*864e5).toISOString().split('T')[0] },
  { title: 'Silo Level Sensor Replacement', description: 'Raw material silo level sensor giving erratic readings. Replace ultrasonic sensor.', priority: 'medium', status: 'open', assignedTo: 'Rahul Sharma', dueDate: new Date(Date.now() + 4*864e5).toISOString().split('T')[0] },
  { title: 'Press Tool Die Change', description: 'Scheduled die change for stamping press. New part number P-4421 required from tomorrow\'s shift.', priority: 'high', status: 'open', assignedTo: 'Vikram Patel', dueDate: new Date(Date.now() + 864e5).toISOString().split('T')[0] },
  { title: 'Fire Suppression System Test', description: 'Quarterly discharge test of FM-200 system in server room and electrical panel areas.', priority: 'high', status: 'open', assignedTo: 'Arun Nair', dueDate: new Date(Date.now() + 14*864e5).toISOString().split('T')[0] },
  { title: 'Dust Extraction Filter Change', description: 'HEPA filters in dust extraction unit at capacity. Replace all 6 filter cartridges.', priority: 'medium', status: 'waiting_parts', assignedTo: 'Anita Desai', dueDate: new Date(Date.now() - 864e5).toISOString().split('T')[0] },
];

app.get('/api/work-orders', authApi, async (req, res) => {
  try {
    const existing = await prisma.workOrder.count();
    if (existing < 5) {
      const machines = await prisma.machine.findMany({ take: 20 });
      const seedData = SEED_WORK_ORDERS.map((wo, i) => ({
        ...wo,
        machineId: machines[i % machines.length]?.id || null,
        createdBy: req.user.id,
        createdAt: new Date(Date.now() - (SEED_WORK_ORDERS.length - i) * 864e5),
        updatedAt: new Date(Date.now() - (SEED_WORK_ORDERS.length - i) * 432e5),
      }));
      const statuses = ['open', 'in_progress', 'completed', 'waiting_parts'];
      const seedWithStatus = seedData.map((s, i) => ({
        ...s,
        status: s.status || statuses[i % statuses.length],
      }));
      await prisma.workOrder.createMany({ data: seedWithStatus });
    }
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
    await createAudit(req.user.id, 'work_order.created', 'WorkOrder', order.id, { title: order.title, priority: order.priority });
    res.status(201).json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/work-orders/:id', authApi, async (req, res) => {
  try {
    const data = pickAllowed(req.body, ['title', 'description', 'status', 'priority', 'assignedTo', 'dueDate']);
    const statusError = validateEnum(data.status, ['open', 'in_progress', 'completed', 'blocked', 'waiting_parts', 'approved', 'rejected', 'cancelled'], 'status');
    if (statusError) return res.status(400).json({ error: statusError });
    const priorityError = validateEnum(data.priority, ['low', 'medium', 'high', 'critical'], 'priority');
    if (priorityError) return res.status(400).json({ error: priorityError });
    const order = await prisma.workOrder.update({
      where: { id: req.params.id },
      data
    });
    await createAudit(req.user.id, 'work_order.updated', 'WorkOrder', order.id, data);
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

app.post('/api/timeline/event', authApi, async (req, res) => {
  try {
    const { orderId, event, actor } = req.body;
    if (!orderId || !event) return res.status(400).json({ error: 'orderId and event are required' });
    await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'work_order.' + event, entity: 'WorkOrder', entityId: orderId, detail: { actor, event, timestamp: new Date().toISOString() } } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory/reserve', authApi, async (req, res) => {
  try {
    const { sku, orderId } = req.body;
    if (!sku) return res.status(400).json({ error: 'sku is required' });
    const part = await prisma.inventoryPart.findFirst({ where: { sku } });
    if (!part) return res.status(404).json({ error: 'Part not found' });
    if (part.quantity <= 0) return res.status(400).json({ error: 'Part out of stock' });
    const updated = await prisma.inventoryPart.update({ where: { id: part.id }, data: { quantity: part.quantity - 1 } });
    await createAudit(req.user.id, 'inventory.reserved', 'InventoryPart', part.id, { sku, orderId, previousQty: part.quantity, newQty: updated.quantity });
    res.json({ ok: true, part: updated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/dashboard/kpi', authApi, async (req, res) => {
  try {
    const { type, value } = req.body;
    if (!type) return res.status(400).json({ error: 'type is required' });
    await createAudit(req.user.id, 'dashboard.kpi_update', 'KPI', null, { type, value, timestamp: new Date().toISOString() });
    res.json({ ok: true });
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
      include: {
        machines: {
          include: {
            components: true,
            alarms: true,
            readings: { take: 20, orderBy: { timestamp: 'desc' } }
          }
        }
      }
    });
    const reliability = plants.map(p => {
      let totalProb = 0;
      let totalRul = 0;
      let criticalCount = 0;
      const count = p.machines.length || 1;

      const machineEvaluations = p.machines.map(m => {
        const ml = mlPrediction.predictForMachine(m, m.readings);
        totalProb += ml.failureProbability;
        totalRul += ml.remainingUsefulLife;
        if (ml.riskLevel === 'Critical' || ml.riskLevel === 'High') criticalCount++;
        return {
          id: m.id,
          name: m.name,
          health: m.health,
          failureProbability: ml.failureProbability,
          remainingUsefulLife: ml.remainingUsefulLife,
          riskLevel: ml.riskLevel,
          confidence: ml.confidence
        };
      });

      const avgHealth = p.machines.reduce((sum, m) => sum + m.health, 0) / count;
      return {
        plantId: p.id,
        plantName: p.name,
        avgHealth: Math.round(avgHealth * 10) / 10,
        avgFailureProbability: Math.round(totalProb / count),
        avgRemainingUsefulLife: Math.round(totalRul / count),
        criticalMachineCount: criticalCount,
        machineCount: p.machines.length,
        machines: machineEvaluations
      };
    });
    res.json(reliability);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/user/profile', authApi, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, avatar: true, phone: true, prefs: true, createdAt: true }
    });
    const result = { ...user, assignedPlants: user.prefs?.assignedPlants || [] };
    res.json(result);
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

app.get('/api/team', authApi, requireRole('admin'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, avatar: true, phone: true, prefs: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    const mapped = users.map(u => ({ ...u, status: u.prefs?.status || 'active', lastLogin: u.prefs?.lastLogin || null, assignedPlants: u.prefs?.assignedPlants || [] }));
    res.json(mapped);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/user/preferences', authApi, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { prefs: true, integrations: true, sessions: true } });
    res.json(maskedUserSettings(user));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/user/preferences', authApi, async (req, res) => {
  try {
    const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { prefs: true, integrations: true, sessions: true } });
    const data = {};
    if (req.body.prefs) data.prefs = { ...safePrefs(current?.prefs), ...req.body.prefs };
    if (req.body.integrations) data.integrations = { ...safeIntegrations(current?.integrations), ...req.body.integrations };
    if (req.body.sessions) data.sessions = req.body.sessions;
    const user = await prisma.user.update({ where: { id: req.user.id }, data, select: { prefs: true, integrations: true, sessions: true } });
    res.json(maskedUserSettings(user));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/change-password', authApi, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user.provider === 'google' && !user.password) {
      return res.status(400).json({ error: 'This account does not have a password. Use the Set Password option instead.' });
    }
    const ok = currentPassword && await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });
    const password = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password, provider: 'email', lastLoginMethod: 'email' } });
    await createAudit(req.user.id, 'user.password_changed', 'User', req.user.id, {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/set-password', authApi, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user.password) return res.status(400).json({ error: 'This account already has a password. Use Change Password instead.' });
    const password = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password, provider: 'google', lastLoginMethod: 'google' } });
    await createAudit(req.user.id, 'user.password_set', 'User', req.user.id, {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/unlink-google', authApi, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.googleId) return res.status(400).json({ error: 'No Google account linked' });
    if (!user.password) return res.status(400).json({ error: 'Set a password first before unlinking Google' });
    await prisma.user.update({ where: { id: req.user.id }, data: { googleId: null, provider: 'email', lastLoginMethod: 'email' } });
    await createAudit(req.user.id, 'auth.google_unlink', 'User', req.user.id, {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/user/profile', authApi, async (req, res) => {
  try {
    const { name, email, role, phone, avatar } = req.body;
    const allowedProfileRoles = ['operator', 'maintenance', 'plant_manager', 'executive'];
    const data = {};
    if (name) data.name = name;
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== req.user.id) return res.status(400).json({ error: 'Email already in use' });
      data.email = email;
    }
    if (role && allowedProfileRoles.includes(role)) data.role = role;
    if (phone != null) data.phone = phone;
    if (avatar != null) data.avatar = avatar;
    const user = await prisma.user.update({ where: { id: req.user.id }, data, select: { id: true, email: true, name: true, role: true, avatar: true, phone: true, googleId: true, provider: true } });
    const newToken = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, newToken);
    await createAudit(req.user.id, 'user.profile_updated', 'User', user.id, Object.keys(data));
    res.json(user);
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

app.post('/api/user/profile/photo', authApi, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!req.file.mimetype || !req.file.mimetype.startsWith('image/')) {
      unlinkUploadedUrl('/uploads/' + req.file.filename);
      return res.status(400).json({ error: 'Profile photo must be an image' });
    }
    const url = '/uploads/' + req.file.filename;
    const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { avatar: true } });
    await prisma.user.update({ where: { id: req.user.id }, data: { avatar: url } });
    unlinkUploadedUrl(current?.avatar);
    await createAudit(req.user.id, 'user.photo_updated', 'User', req.user.id, {});
    res.json({ url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/user/profile/photo', authApi, async (req, res) => {
  try {
    const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { avatar: true } });
    await prisma.user.update({ where: { id: req.user.id }, data: { avatar: null } });
    unlinkUploadedUrl(current?.avatar);
    await createAudit(req.user.id, 'user.photo_removed', 'User', req.user.id, {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/team/:id', authApi, requireRole('admin'), async (req, res) => {
  try {
    const { role, status } = req.body;
    if (role && !allowedTeamRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'User not found' });
    const data = {};
    if (role) data.role = role;
    if (status) data.prefs = { ...safePrefs(existing.prefs), status };
    const user = await prisma.user.update({ where: { id: req.params.id }, data, select: { id: true, email: true, name: true, role: true, avatar: true, phone: true, prefs: true, createdAt: true } });
    await createAudit(req.user.id, 'team.user_updated', 'User', user.id, { role, status });
    res.json({ ...user, status: user.prefs?.status || 'active', assignedPlants: user.prefs?.assignedPlants || [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/team/:id/disable', authApi, requireRole('admin'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const prefs = safePrefs(user.prefs);
    prefs.status = 'disabled';
    await prisma.user.update({ where: { id: req.params.id }, data: { prefs } });
    await createAudit(req.user.id, 'team.user_disabled', 'User', req.params.id, {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/team/:id/enable', authApi, requireRole('admin'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const prefs = safePrefs(user.prefs);
    delete prefs.status;
    await prisma.user.update({ where: { id: req.params.id }, data: { prefs } });
    await createAudit(req.user.id, 'team.user_enabled', 'User', req.params.id, {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/team/:id/reset-password', authApi, requireRole('admin'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, message: 'Password reset link sent to ' + user.email });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/team/:id', authApi, requireRole('admin'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself' });
    await prisma.user.delete({ where: { id: req.params.id } });
    await createAudit(req.user.id, 'team.user_deleted', 'User', req.params.id, { email: user.email });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/team/invite', authApi, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, role, assignedPlants } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
    if (role && !allowedTeamRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'User with this email already exists' });
    const password = await bcrypt.hash('Welcome@123', 10);
    const user = await prisma.user.create({
      data: { name, email, password, role: role || 'operator', prefs: { assignedPlants: assignedPlants || [], invitedBy: req.user.id, invitedAt: new Date().toISOString() } },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
    await createAudit(req.user.id, 'team.user_invited', 'User', user.id, { email: user.email, role: user.role });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/integrations/:key/connect', authApi, async (req, res) => {
  try {
    const { key } = req.params;
    if (!allowedIntegrationKeys.includes(key)) return res.status(400).json({ error: 'Unknown integration' });
    const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { integrations: true } });
    const integrations = { ...safeIntegrations(current?.integrations) };
    integrations[key] = { ...(integrations[key] || {}), state: 'connected', lastSync: new Date().toISOString(), health: Math.floor(85 + Math.random() * 15), latency: Math.floor(5 + Math.random() * 150) + 'ms' };
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { integrations }, select: { integrations: true } });
    await createAudit(req.user.id, 'integration.connected', 'Integration', key, {});
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/integrations/:key/disconnect', authApi, async (req, res) => {
  try {
    const { key } = req.params;
    if (!allowedIntegrationKeys.includes(key)) return res.status(400).json({ error: 'Unknown integration' });
    const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { integrations: true } });
    const integrations = { ...safeIntegrations(current?.integrations) };
    integrations[key] = { ...(integrations[key] || {}), state: 'disconnected', lastSync: integrations[key]?.lastSync || '—' };
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { integrations }, select: { integrations: true } });
    await createAudit(req.user.id, 'integration.disconnected', 'Integration', key, {});
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/integrations/:key/configure', authApi, async (req, res) => {
  try {
    const { key } = req.params;
    if (!allowedIntegrationKeys.includes(key)) return res.status(400).json({ error: 'Unknown integration' });
    const { endpoint, apiKey, interval } = req.body;
    const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { integrations: true } });
    const integrations = { ...safeIntegrations(current?.integrations) };
    const next = { ...(integrations[key] || {}), endpoint, interval, configured: true };
    if (apiKey) {
      next.apiKeyLast4 = String(apiKey).slice(-4);
      next.apiKeyHash = crypto.createHash('sha256').update(String(apiKey)).digest('hex');
      delete next.apiKey;
    }
    integrations[key] = next;
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { integrations }, select: { integrations: true } });
    await createAudit(req.user.id, 'integration.configured', 'Integration', key, { endpoint: endpoint || null, interval: interval || null, hasApiKey: !!apiKey });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/integrations/:key/test', authApi, async (req, res) => {
  try {
    const { key } = req.params;
    if (!allowedIntegrationKeys.includes(key)) return res.status(400).json({ error: 'Unknown integration' });
    const latency = Math.floor(12 + Math.random() * 180) + 'ms';
    const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { integrations: true } });
    const integrations = { ...safeIntegrations(current?.integrations) };
    integrations[key] = { ...(integrations[key] || {}), lastTestedAt: new Date().toISOString(), latency, health: Math.floor(88 + Math.random() * 12) };
    await prisma.user.update({ where: { id: req.user.id }, data: { integrations } });
    await createAudit(req.user.id, 'integration.tested', 'Integration', key, { latency });
    res.json({ ok: true, latency });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/api-keys', authApi, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const expiresInDays = Number(req.body.expiresInDays);
    if (!name) return res.status(400).json({ error: 'Key name is required' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { prefs: true } });
    const prefs = safePrefs(user?.prefs);
    const apiKeys = Array.isArray(prefs.apiKeys) ? [...prefs.apiKeys] : [];
    const key = generateApiKey();
    const expiresAt = Number.isFinite(expiresInDays) && expiresInDays > 0
      ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
      : null;
    apiKeys.push({
      id: crypto.randomUUID(),
      name,
      keyHash: crypto.createHash('sha256').update(key).digest('hex'),
      keyPreview: maskApiKey(key),
      createdAt: new Date().toISOString().slice(0, 10),
      expiresAt,
      lastUsed: 'Never',
    });
    await prisma.user.update({ where: { id: req.user.id }, data: { prefs: { ...prefs, apiKeys } } });
    await createAudit(req.user.id, 'api_key.created', 'User', req.user.id, { name, expiresAt });
    res.status(201).json({ key, keyPreview: maskApiKey(key) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/user/api-keys/:idx', authApi, async (req, res) => {
  try {
    const idx = Number(req.params.idx);
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { prefs: true } });
    const prefs = safePrefs(user?.prefs);
    const apiKeys = Array.isArray(prefs.apiKeys) ? [...prefs.apiKeys] : [];
    if (!Number.isInteger(idx) || idx < 0 || idx >= apiKeys.length) return res.status(400).json({ error: 'Invalid API key index' });
    const [removed] = apiKeys.splice(idx, 1);
    await prisma.user.update({ where: { id: req.user.id }, data: { prefs: { ...prefs, apiKeys } } });
    await createAudit(req.user.id, 'api_key.revoked', 'User', req.user.id, { name: removed?.name });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/user/sessions', authApi, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { sessions: true } });
    const sessions = (user?.sessions || []).filter(s => s.current);
    await prisma.user.update({ where: { id: req.user.id }, data: { sessions } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/user/sessions/:idx', authApi, async (req, res) => {
  try {
    const idx = parseInt(req.params.idx);
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { sessions: true } });
    const sessions = [...(user?.sessions || [])];
    if (idx < 0 || idx >= sessions.length) return res.status(400).json({ error: 'Invalid session index' });
    sessions.splice(idx, 1);
    await prisma.user.update({ where: { id: req.user.id }, data: { sessions } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/onboarding/status', authApi, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, name: true, role: true, createdAt: true } });
    const completed = user.name !== 'Operator' && user.createdAt < new Date(Date.now() - 60000);
    res.json({ completed, user, steps: completed ? 4 : 2 });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

// ──────────────────────────────────────────────
// YantraNklan AI Chat — powered by Groq (Llama 3)
// ──────────────────────────────────────────────

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

app.post('/api/ai-chat', authApi, rateLimit({ windowMs: 60 * 1000, max: 20, keyPrefix: 'ai-chat' }), async (req, res) => {
  try {
    const { message, conversationId, history, attachmentContext } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'api_key_missing', message: 'GROQ_API_KEY environment variable is not configured. Set it to enable AI chat.' });
    }

    if (conversationId) {
      if (!aiConversations.has(conversationId)) aiConversations.set(conversationId, { messages: [], created: Date.now() });
      if (history && Array.isArray(history)) aiConversations.get(conversationId).messages = history.slice(-30);
    }

    // Enterprise Hybrid Vector RAG Retrieval
    const ragResult = await ragService.queryHybridRAG(message, { conversationId, history, attachmentContext });
    const systemPrompt = ragResult.systemPrompt;

    const OpenAI = require('openai');
    const groq = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...(aiConversations.get(conversationId)?.messages || history || []).slice(-20),
        { role: 'user', content: message }
      ];

      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        max_tokens: 800,
        temperature: 0.7,
      });

      let reply = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';
      reply = ragService.appendVerifiedCitations(reply, ragResult.sources);

      if (conversationId) {
        const conv = aiConversations.get(conversationId);
        if (conv) { conv.messages.push({ role: 'user', content: message }, { role: 'assistant', content: reply }); }
      }
      res.json({ reply, model: GROQ_MODEL, sources: ragResult.sources, intent: ragResult.intent });
    } catch (e) {
      console.error('AI provider error:', { message: e.message, status: e.status, code: e.code });
      throw e;
    }
  } catch (e) {
    console.error('AI Chat error:', e.message);
    res.status(500).json({ error: 'ai_error', message: 'Failed to process AI chat request: ' + e.message });
  }
});

// File upload endpoint
app.post('/api/ai-upload', authApi, upload.array('files', 5), async (req, res) => {
  try {
    const files = req.files || [];
    const { message, conversationId } = req.body;
    if (!files.length && !message) return res.status(400).json({ error: 'No files or message provided' });

    const fileTexts = [];
    for (const file of files) {
      try {
        const ext = file.originalname.toLowerCase().split('.').pop();
        const buf = fs.readFileSync(file.path);
        let text = '';
        if (file.mimetype === 'application/pdf' || ext === 'pdf') {
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(buf);
          text = (pdfData.text || '(No extractable text in PDF)').slice(0, 8000);
        } else if (ext === 'docx') {
          const mammoth = require('mammoth');
          const result = await mammoth.extractRawText({ buffer: buf });
          text = (result.value || '(No extractable text in DOCX)').slice(0, 8000);
        } else if (ext === 'xlsx' || ext === 'xls') {
          const XLSX = require('xlsx');
          const wb = XLSX.read(buf, { type: 'buffer' });
          const sheets = wb.SheetNames.map(name => {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
            return `[Sheet: ${name}]\n${rows.slice(0, 50).map(r => r.join(', ')).join('\n')}`;
          });
          text = sheets.join('\n\n').slice(0, 8000);
        } else if (file.mimetype && (file.mimetype.startsWith('text/') || file.mimetype === 'application/json' || file.mimetype === 'application/csv' || file.mimetype === 'application/xml')) {
          text = buf.toString('utf8').slice(0, 8000);
        } else if (['txt', 'csv', 'json', 'md', 'xml', 'html', 'log', 'yaml', 'yml', 'ini', 'cfg', 'env'].includes(ext)) {
          text = buf.toString('utf8').slice(0, 8000);
        } else if (['png','jpg','jpeg','gif','webp','bmp','svg','tiff'].includes(ext)) {
          text = '[Image file: ' + file.originalname + ']';
        } else {
          text = '[Binary file: ' + file.originalname + ' (' + (file.mimetype || 'unknown') + ')]';
        }
        fileTexts.push(`--- ${file.originalname} ---\n${text}`);
      } catch (e) { fileTexts.push(`--- ${file.originalname} ---\n(Unable to parse - ${e.message})`); }
      try { fs.unlinkSync(file.path); } catch {}
    }

    const extractedText = fileTexts.join('\n\n');
    const fileSources = files.map(f => ({ name: f.originalname, type: f.mimetype || 'unknown', size: f.size }));

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'api_key_missing', message: 'GROQ_API_KEY not configured' });
    }

    const [plants, machines, alarms] = await Promise.all([
      prisma.plant.findMany(),
      prisma.machine.findMany({ take: 20, include: { plant: { select: { name: true } }, sensors: { take: 3 } } }),
      prisma.alarm.findMany({ where: { status: 'active' }, take: 10, include: { machine: { select: { name: true } } } }),
    ]);

    const systemPrompt = `You are YantraNklan, YantraMitra's industrial AI copilot. The user has uploaded files with the following content:\n\n${extractedText}\n\n## Operational Context\nPlants: ${plants.map(p => p.name).join(', ')}\nMachines: ${machines.map(m => `${m.name} (${m.plant?.name})`).join(', ')}\nActive Alarms: ${alarms.length}\n\nAnalyze the uploaded files in context of plant operations. When you quote or reference specific content, cite the source filename in brackets like [filename.pdf]. Use markdown formatting. Be specific and actionable.${message ? `\n\n## User Message\n${message}` : ''}`;

    const OpenAI = require('openai');
    const groq = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
    const completion = await groq.chat.completions.create({ model: GROQ_MODEL, messages: [{ role: 'system', content: systemPrompt }], max_tokens: 800, temperature: 0.7 });
    const reply = completion.choices[0]?.message?.content || 'Files processed. What would you like to know?';

    if (conversationId) {
      if (!aiConversations.has(conversationId)) aiConversations.set(conversationId, { messages: [], created: Date.now() });
      const conv = aiConversations.get(conversationId);
      conv.messages.push({ role: 'user', content: message || 'Uploaded files: ' + files.map(f => f.originalname).join(', ') }, { role: 'assistant', content: reply });
      conv.attachmentContext = extractedText;
    }

    res.json({ reply, model: GROQ_MODEL, sources: fileSources, attachments: files.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Streaming AI chat endpoint with auto-fallback to non-streaming
app.post('/api/ai-chat/stream', authApi, rateLimit({ windowMs: 60 * 1000, max: 20, keyPrefix: 'ai-chat-stream' }), async (req, res) => {
  const { message, conversationId, history, attachmentContext } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'api_key_missing', message: 'GROQ_API_KEY not configured. Set it in your environment to enable AI chat.' });

  try {
    if (conversationId) {
      if (!aiConversations.has(conversationId)) aiConversations.set(conversationId, { messages: [], created: Date.now() });
      if (history && Array.isArray(history)) aiConversations.get(conversationId).messages = history.slice(-30);
    }

    const ragResult = await ragService.queryHybridRAG(message, { conversationId, history, attachmentContext });
    const systemPrompt = ragResult.systemPrompt;

    const OpenAI = require('openai');
    const groq = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
    const messages = [{ role: 'system', content: systemPrompt }, ...(aiConversations.get(conversationId)?.messages || []).slice(-20), { role: 'user', content: message }];

    // Try streaming first
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = await groq.chat.completions.create({ model: GROQ_MODEL, messages, max_tokens: 800, temperature: 0.7, stream: true });

      let fullReply = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) { fullReply += content; res.write('data: ' + JSON.stringify({ content }) + '\n\n'); }
      }

      fullReply = ragService.appendVerifiedCitations(fullReply, ragResult.sources);

      if (conversationId) {
        const conv = aiConversations.get(conversationId);
        if (conv) conv.messages.push({ role: 'user', content: message }, { role: 'assistant', content: fullReply });
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (streamError) {
      console.error('AI stream provider error:', streamError.message);
      if (res.headersSent) {
        res.write('data: ' + JSON.stringify({ error: streamError.message, code: streamError.status || 'stream_error' }) + '\n\n');
        res.write('data: [DONE]\n\n');
        return res.end();
      }

      try {
        const completion = await groq.chat.completions.create({ model: GROQ_MODEL, messages, max_tokens: 800, temperature: 0.7, stream: false });
        let reply = completion.choices[0]?.message?.content || '';
        reply = ragService.appendVerifiedCitations(reply, ragResult.sources);
        if (conversationId) {
          const conv = aiConversations.get(conversationId);
          if (conv) conv.messages.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
        }
        res.type('json');
        return res.json({ reply, model: GROQ_MODEL, sources: ragResult.sources, fallback: true, fallbackReason: streamError.message });
      } catch (fallbackError) {
        console.error('AI fallback error:', fallbackError.message);
        res.type('json');
        if (!res.headersSent) return res.status(500).json({ error: fallbackError.message || 'AI service unavailable', code: fallbackError.status || 'ai_error' });
      }
    }
  } catch (e) {
    console.error('Stream setup error:', e.message);
    res.type('json');
    if (!res.headersSent) return res.status(500).json({ error: e.message || 'stream_error', code: 'stream_setup_failed' });
  }
});

// ──────────────────────────────────────────────
// RAG Administration Endpoints
// ──────────────────────────────────────────────

app.get('/api/rag/status', authApi, (req, res) => {
  try {
    const status = ragService.getRAGStatus();
    res.json(status);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/rag/stats', authApi, (req, res) => {
  try {
    const stats = ragService.vectorStore.getStats();
    res.json(stats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/rag/reindex', authApi, async (req, res) => {
  try {
    const stats = await ragService.reindexAllDocuments();
    res.json({ message: 'RAG reindexing complete', stats });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/rag/reindex/:document', authApi, async (req, res) => {
  try {
    const docName = req.params.document;
    const docPath = path.join(__dirname, 'data', 'knowledge_base', docName);
    if (!fs.existsSync(docPath)) return res.status(404).json({ error: 'Knowledge base document not found' });
    const count = await ragService.indexSingleFile(docPath, docName);
    res.json({ message: `Document ${docName} reindexed successfully`, chunksIndexed: count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/rag/document/:id', authApi, (req, res) => {
  try {
    const docId = req.params.id;
    const deletedCount = ragService.vectorStore.deleteDocumentChunks(docId);
    res.json({ message: `Document ${docId} deleted from vector store`, chunksRemoved: deletedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────
// Autonomous Multi-Agent Endpoints
// ──────────────────────────────────────────────

app.get('/api/agents/status', authApi, (req, res) => {
  try {
    const status = agentService.getAgentStatus();
    res.json(status);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/agents/list', authApi, (req, res) => {
  try {
    const status = agentService.getAgentStatus();
    res.json({
      count: status.totalAgents,
      agents: status.agents
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/agents/dispatch', authApi, async (req, res) => {
  try {
    const { query, machineId, userIntent } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required for agent dispatch' });

    const result = await agentService.dispatchMultiAgentFlow(query, { machineId, userIntent });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────
// Autonomous Industrial Digital Worker Workflows
// ──────────────────────────────────────────────

app.get('/api/workflows', authApi, (req, res) => {
  try {
    const systemStatus = workflowService.getWorkflowSystemStatus();
    const activeWorkflows = workflowService.workflowEngine.listAllWorkflows();
    const templates = workflowService.listAllTemplates();
    res.json({
      systemStatus,
      templates,
      activeWorkflowsCount: activeWorkflows.length,
      workflows: activeWorkflows
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/workflows/:id', authApi, (req, res) => {
  try {
    const workflowId = req.params.id;
    const workflow = workflowService.workflowEngine.getWorkflowById(workflowId);
    if (!workflow) return res.status(404).json({ error: `Workflow ${workflowId} not found` });

    const auditLogs = workflowService.auditTrail.getAuditHistoryForWorkflow(workflowId);
    res.json({
      workflow,
      auditLogs
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/workflows/execute', authApi, async (req, res) => {
  try {
    const { templateId, machineId, customOptions, mode } = req.body;
    const selectedTemplate = templateId || 'preventive_maintenance';

    let machine = null;
    if (machineId) {
      machine = await prisma.machine.findUnique({ where: { id: machineId } });
    }

    const { plan, simulation } = await workflowService.workflowEngine.createAndSimulateWorkflow(selectedTemplate, machine, customOptions);

    if (mode === 'SIMULATE_ONLY') {
      return res.json({
        message: 'Workflow dry-run simulation executed successfully',
        plan,
        simulation
      });
    }

    // Execute Next Step in Workflow
    const stepResult = await workflowService.workflowEngine.executeNextStep(plan.workflowId);
    res.json({
      message: 'Workflow step execution initiated',
      plan,
      simulation,
      stepResult
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/workflows/:id/approve', authApi, async (req, res) => {
  try {
    const workflowId = req.params.id;
    const { supervisorName } = req.body;
    const result = await workflowService.workflowEngine.approveStep(workflowId, supervisorName || 'Shift Supervisor');
    res.json({
      message: `Workflow step approved by ${supervisorName || 'Shift Supervisor'}`,
      result
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/workflows/:id/rollback', authApi, (req, res) => {
  try {
    const workflowId = req.params.id;
    const result = workflowService.workflowEngine.rollbackWorkflow(workflowId);
    res.json({
      message: `Workflow ${workflowId} rolled back successfully`,
      result
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────
// Event-Driven Industrial Architecture Endpoints
// ──────────────────────────────────────────────

app.get('/api/events', authApi, (req, res) => {
  try {
    const status = eventService.getEventSystemStatus();
    res.json(status);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/events/history', authApi, (req, res) => {
  try {
    const { machineId, eventType, severity, limit } = req.query;
    const history = eventService.eventHistory.queryHistory({ machineId, eventType, severity, limit: limit || 50 });
    res.json({
      totalEvents: history.length,
      events: history
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/events/publish', authApi, (req, res) => {
  try {
    const { eventType, payload } = req.body;
    if (!eventType) return res.status(400).json({ error: 'eventType is required' });

    const publishedEvent = eventService.eventBus.publish(eventType, payload || {});
    res.json({
      message: `Event ${eventType} published to Event Bus`,
      event: publishedEvent
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/events/replay', authApi, async (req, res) => {
  try {
    const { eventIds, limit } = req.body;
    const result = await eventService.eventReplay.replayEvents(eventIds, { limit });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────
// Industrial Knowledge Graph APIs
// ──────────────────────────────────────────────

app.get('/api/graph', authApi, (req, res) => {
  try {
    res.json(graphService.getGraphSystemStatus());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/graph/node/:id', authApi, (req, res) => {
  try {
    const node = graphService.graphEngine.getNode(req.params.id);
    if (!node) return res.status(404).json({ error: `Node ${req.params.id} not found in knowledge graph` });
    res.json(node);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/graph/neighbors/:id', authApi, (req, res) => {
  try {
    const { relationship } = req.query;
    const neighbors = graphService.graphEngine.getNeighbors(req.params.id, relationship || null);
    res.json({ nodeId: req.params.id, neighbors, totalNeighbors: neighbors.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/graph/path', authApi, (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Query params "from" and "to" are required' });
    const result = graphService.graphEngine.findPath(from, to);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/graph/impact/:machineId', authApi, (req, res) => {
  try {
    const impact = graphService.graphEngine.analyzeImpact(req.params.machineId);
    if (!impact) return res.status(404).json({ error: `Machine ${req.params.machineId} not found in knowledge graph` });
    res.json(impact);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/graph/dependencies/:machineId', authApi, (req, res) => {
  try {
    const depMap = graphService.graphEngine.getDependencyMap(req.params.machineId);
    res.json(depMap);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/graph/similar/:nodeId', authApi, (req, res) => {
  try {
    const { limit } = req.query;
    const result = graphService.graphEngine.findSimilar(req.params.nodeId, parseInt(limit) || 5);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────
// Decision Intelligence APIs
// ──────────────────────────────────────────────

app.get('/api/decisions', authApi, (req, res) => {
  try {
    res.json(decisionService.getDecisionSystemStatus());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/decisions/analyze', authApi, async (req, res) => {
  try {
    const {
      machineId,
      machineName,
      problemType,
      mlPrediction,
      ragEvidence,
      graphImpact,
      customWeights
    } = req.body;

    if (!machineId) return res.status(400).json({ error: 'machineId is required' });

    // Optionally auto-fetch graph impact if not provided
    let resolvedGraphImpact = graphImpact;
    if (!resolvedGraphImpact && machineId) {
      try { resolvedGraphImpact = graphService.graphEngine.analyzeImpact(machineId); } catch (_) {}
    }

    const analysis = await decisionService.decisionEngine.analyze({
      machineId,
      machineName,
      problemType,
      context: {
        mlPrediction: mlPrediction || {},
        ragEvidence: ragEvidence || [],
        graphImpact: resolvedGraphImpact || {},
        customWeights
      }
    });

    res.json(analysis);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────
// Enterprise Fleet Intelligence APIs
// ──────────────────────────────────────────────

app.get('/api/fleet', authApi, (req, res) => {
  try {
    res.json(fleetService.getFleetSystemStatus());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fleet/overview', authApi, (req, res) => {
  try {
    const overview     = fleetService.FleetManager.getFleetOverview();
    const comparison   = fleetService.crossPlantAnalytics.comparePlants();
    const machineRanks = fleetService.crossPlantAnalytics.rankAllMachines();
    const classComp    = fleetService.crossPlantAnalytics.compareMachineClasses();
    res.json({ overview, crossPlantComparison: comparison, machineRankings: machineRanks, machineClassComparison: classComp });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fleet/benchmark', authApi, (req, res) => {
  try {
    res.json(fleetService.benchmarkEngine.getBenchmarkSummary());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fleet/anomalies', authApi, (req, res) => {
  try {
    res.json(fleetService.fleetAnomalyDetector.getFullAnomalyReport());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fleet/recommendations', authApi, (req, res) => {
  try {
    res.json(fleetService.globalRecommendations.generate());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────
// Continuous Learning & Autonomous Improvement APIs
// ──────────────────────────────────────────────

app.get('/api/learning', authApi, (req, res) => {
  try {
    res.json(learningService.getLearningSystemStatus());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/learning/metrics', authApi, (req, res) => {
  try {
    const kpis = learningService.continuousImprovement.generateImprovementKPIs();
    const weights = learningService.adaptiveWeights.getTunedWeights();
    res.json({ kpis, decisionWeights: weights });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/learning/outcomes', authApi, (req, res) => {
  try {
    const filters = {};
    if (req.query.machineId) filters.machineId = req.query.machineId;
    if (req.query.plantId) filters.plantId = req.query.plantId;
    if (req.query.workflowId) filters.workflowId = req.query.workflowId;
    if (req.query.outcome) filters.outcome = req.query.outcome;
    if (req.query.technicianName) filters.technicianName = req.query.technicianName;
    if (req.query.incidentId) filters.incidentId = req.query.incidentId;
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;
    if (req.query.limit) filters.limit = parseInt(req.query.limit);

    const outcomes = learningService.outcomeRepository.queryOutcomes(filters);
    const insights = learningService.learningEngine.generateLearningInsights();
    res.json({
      outcomes,
      insights,
      learningConfidence: learningService.continuousImprovement.generateImprovementKPIs().kpis.learningConfidence
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/learning/feedback', authApi, async (req, res) => {
  try {
    const feedback = learningService.feedbackEngine.captureFeedback(req.body);
    const tuned = learningService.adaptiveWeights.tuneWeightsFromOutcomes();
    res.json({
      message: 'Workflow feedback captured and learning updated',
      feedbackId: feedback.id,
      outcome: feedback.outcome,
      weightsTuned: tuned.tuned,
      tunedWeights: tuned.tunedWeights || null
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Dashboard missions endpoint (aggregates agents with missions)
app.get('/api/missions', authApi, async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({
      where: { mission: { not: null } },
      orderBy: { createdAt: 'desc' }
    });
    const plants = await prisma.plant.findMany({ select: { id: true, name: true, location: true } });
    const plantNames = plants.length ? plants.map(p => p.name) : ['Pune','Ahmedabad','Chennai','Bengaluru','Nagpur'];
    const typeColors = { Diagnostic:'#413fd6', Planner:'#006b5f', Inventory:'#774f00', Energy:'#413fd6', Executive:'#006b5f', Security:'#774f00', Analytics:'#413fd6', Inspection:'#006b5f', Logistics:'#774f00', Maintenance:'#413fd6' };
    const priorities = ['critical','high','medium','low'];
    const missions = agents.map((agent, i) => ({
      id: agent.id,
      name: agent.name,
      mission: agent.mission,
      type: agent.type || 'Diagnostic',
      status: agent.status,
      progress: agent.progress,
      priority: agent.mission && agent.mission.toLowerCase().includes('critical') ? 'critical' : priorities[i % 4],
      color: typeColors[agent.type] || '#413fd6',
      plant: plantNames[i % plantNames.length],
      successRate: agent.successRate || Math.round(75 + Math.random() * 25),
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt
    }));
    res.json(missions);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Timeline events endpoint
app.get('/api/timeline', authApi, async (req, res) => {
  try {
    const { missionId, range } = req.query;
    const hours = range === '7d' ? 168 : range === '30d' ? 720 : 24;
    const since = new Date(Date.now() - hours * 3600000);
    const audits = await prisma.auditLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 60
    });
    const agents = await prisma.agent.findMany({
      where: missionId ? { id: missionId } : { mission: { not: null } },
      select: { id: true, name: true, type: true, mission: true, status: true, progress: true, updatedAt: true, createdAt: true }
    });
    const events = [];
    audits.forEach(a => {
      events.push({
        id: a.id, type: 'audit', action: a.action,
        description: a.detail ? (typeof a.detail === 'string' ? a.detail : JSON.stringify(a.detail)).slice(0, 120) : '',
        timestamp: a.createdAt, agentName: '', color: '#413fd6'
      });
    });
    const statusLabels = { active: 'started', paused: 'paused', done: 'completed', idle: 'idle', error: 'error' };
    agents.forEach(a => {
      events.push({
        id: a.id + '-event', type: 'mission',
        title: a.mission || 'Mission Update',
        description: `${a.name} ${statusLabels[a.status] || 'updated'} — ${a.mission || 'No mission'}`,
        timestamp: a.updatedAt, agentName: a.name,
        color: a.status === 'done' ? '#006b5f' : a.status === 'paused' ? '#774f00' : '#413fd6'
      });
    });
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(events.slice(0, 50));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Report generation endpoint
app.post('/api/report/generate', authApi, async (req, res) => {
  try {
    const [agents, plants, machines, workOrders, alarms] = await Promise.all([
      prisma.agent.findMany(), prisma.plant.findMany(),
      prisma.machine.findMany({ take: 50 }),
      prisma.workOrder.findMany({ take: 50 }),
      prisma.alarm.findMany({ where: { status: 'active' } })
    ]);
    const activeMissions = agents.filter(a => a.mission && a.status === 'active');
    const doneMissions = agents.filter(a => a.status === 'done');
    const plantNames = plants.map(p => p.name).join(', ') || 'Pune, Ahmedabad, Chennai, Bengaluru, Nagpur';
    const report = {
      generatedAt: new Date().toISOString(),
      missionSummary: {
        total: agents.length, active: activeMissions.length,
        completed: doneMissions.length, paused: agents.filter(a => a.status === 'paused').length
      },
      detectedBottlenecks: [
        { area: 'CNC Cell PNA-01 (Pune)', impact: 'Cavitation may reduce throughput by 12%', severity: 'high' },
        { area: 'Conveyor L4 (Chennai)', impact: 'Vibration deviation 8.3% from baseline', severity: 'medium' }
      ],
      recommendations: [
        'Schedule maintenance for Pune CNC Cell within 4 hours',
        'Inspect Chennai Conveyor L4 vibration dampeners',
        'Rebalance AGV routes in Nagpur for 7% energy savings',
        'Review Ahmedabad batch quality — raw material variance detected'
      ],
      kpis: {
        oee: 84.2, activeMissions: activeMissions.length,
        critical: alarms.filter(a => a.severity === 'critical').length,
        agentAvailability: agents.length ? Math.round(agents.filter(a => a.status === 'active').length / agents.length * 100) + '%' : '92%'
      },
      agentStats: agents.map(a => ({ name: a.name, type: a.type, status: a.status, progress: a.progress, mission: a.mission })),
      plantInfo: { names: plantNames, count: plants.length },
      timestamp: new Date().toLocaleString()
    };
    res.json(report);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 404 catch-all
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err?.message || err);
  if (res.headersSent) return;
  res.status(500).json({ error: err?.message || 'Internal server error' });
});

if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`YantraMitra server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
