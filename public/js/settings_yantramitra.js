(function() {
  async function get(path) { const r = await fetch(path); return r.json(); }
  async function post(path, body) { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }
  async function patch(path, body) { const r = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }

  let profile = null;
  let settings = null;
  let team = [];

  async function checkAuth() {
    try { const me = await get('/api/auth/me'); if (!me || !me.id) window.location.href = '/login'; return me; }
    catch { window.location.href = '/login'; return null; }
  }

  function roleLabel(role) {
    return { admin: 'Admin', operator: 'Operator', maintenance: 'Maintenance', plant_manager: 'Plant Manager', executive: 'Executive' }[role] || role;
  }

  function toast(text, good = true) {
    const msg = document.createElement('div');
    msg.className = `fixed top-20 right-8 z-[100] rounded-xl px-4 py-3 font-bold shadow-xl ${good ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-error'}`;
    msg.textContent = text;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 2600);
  }

  function contentHost() {
    const grid = document.querySelector('main .grid.grid-cols-1');
    if (!grid) return null;
    return grid;
  }

  function activateTab(name) {
    document.querySelectorAll('main .flex.gap-gutter button').forEach(btn => {
      const active = btn.textContent.trim().toLowerCase().startsWith(name.toLowerCase());
      btn.className = active
        ? 'px-md py-3 rounded-full bg-primary text-on-primary shadow-lg shadow-primary/20 font-medium whitespace-nowrap'
        : 'px-md py-3 rounded-full glass-card hover:bg-white transition-colors text-on-surface-variant font-medium whitespace-nowrap';
    });
  }

  function renderProfile() {
    activateTab('Profile');
    const host = contentHost();
    host.innerHTML = `
      <div class="md:col-span-4 space-y-gutter">
        <div class="glass-card rounded-xl p-md flex flex-col items-center text-center">
          <div class="w-32 h-32 rounded-full overflow-hidden border-2 border-white shadow-[0_0_30px_rgba(65,63,214,0.3)] ring-4 ring-primary/10 mb-md">
            <img class="w-full h-full object-cover" src="${profile.avatar || '/images/ym-operator-avatar.jpg'}" alt="${profile.name}">
          </div>
          <h2 class="font-section-header text-section-header mb-1">${profile.name}</h2>
          <span class="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-label-caps tracking-wider mb-sm">${roleLabel(profile.role)}</span>
          <p class="text-body-md text-on-surface-variant">Indian operations intelligence workspace member.</p>
        </div>
      </div>
      <div class="md:col-span-8 space-y-gutter">
        <form class="glass-card rounded-xl p-md lg:p-xl" id="ym-profile-form">
          <div class="flex justify-between items-center mb-xl">
            <h3 class="font-section-header text-section-header">Personal Information</h3>
            <button class="shimmer-btn primary-gradient text-on-primary px-md py-2 rounded-lg font-medium shadow-[0_10px_20px_rgba(91,91,240,0.3)]">Save Changes</button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
            <label class="space-y-xs"><span class="font-label-caps text-label-caps text-on-surface-variant ml-1">Full Name</span><input name="name" class="w-full glass-input rounded-lg px-md py-3 text-on-surface" type="text" value="${profile.name || ''}"></label>
            <label class="space-y-xs"><span class="font-label-caps text-label-caps text-on-surface-variant ml-1">Email Address</span><input name="email" class="w-full glass-input rounded-lg px-md py-3 text-on-surface" type="email" value="${profile.email || ''}"></label>
            <label class="space-y-xs"><span class="font-label-caps text-label-caps text-on-surface-variant ml-1">Role</span><input class="w-full glass-input rounded-lg px-md py-3 bg-surface-container-low text-on-surface-variant" readonly value="${roleLabel(profile.role)}"></label>
            <label class="space-y-xs"><span class="font-label-caps text-label-caps text-on-surface-variant ml-1">Phone</span><input name="phone" class="w-full glass-input rounded-lg px-md py-3 text-on-surface" type="text" value="${profile.phone || ''}"></label>
          </div>
        </form>
      </div>`;
    host.querySelector('#ym-profile-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      profile = await patch('/api/user/profile', { name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone') });
      toast('Profile saved');
    });
  }

  function renderNotifications() {
    activateTab('Notifications');
    const prefs = settings.prefs || {};
    const items = [
      ['criticalAlerts', 'Critical alarm push alerts', 'Immediate alerts for production-stopping faults.'],
      ['shiftDigest', 'Shift handover digest', 'Summary of open alarms, plans, and work orders.'],
      ['agentActions', 'Agent action approvals', 'Notify when an AI agent proposes an action.'],
      ['weeklyReport', 'Weekly reliability report', 'Send Monday plant reliability summary.'],
    ];
    contentHost().innerHTML = `<div class="md:col-span-12 glass-card rounded-xl p-md lg:p-xl"><h3 class="font-section-header text-section-header mb-md">Notification Preferences</h3><div class="space-y-sm">${items.map(([key, title, desc]) => `
      <label class="flex items-center justify-between gap-md rounded-xl border border-outline-variant/40 bg-white/60 p-md">
        <span><span class="block font-bold">${title}</span><span class="block text-sm text-on-surface-variant">${desc}</span></span>
        <input type="checkbox" data-pref="${key}" class="rounded text-primary" ${prefs[key] ? 'checked' : ''}>
      </label>`).join('')}</div></div>`;
    document.querySelectorAll('[data-pref]').forEach(input => input.addEventListener('change', async () => {
      settings = await patch('/api/user/preferences', { prefs: { [input.dataset.pref]: input.checked } });
      toast('Notification preference saved');
    }));
  }

  function renderTeam() {
    activateTab('Team');
    contentHost().innerHTML = `<div class="md:col-span-12 glass-card rounded-xl p-md lg:p-xl"><h3 class="font-section-header text-section-header mb-md">Team & Roles</h3><div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">${team.map(member => `
      <article class="rounded-xl border border-outline-variant/40 bg-white/70 p-md flex gap-sm items-center">
        <img src="${member.avatar || '/images/ym-operator-avatar.jpg'}" alt="${member.name}" class="w-14 h-14 rounded-full border border-primary/20">
        <div><h4 class="font-bold">${member.name}</h4><p class="text-sm text-on-surface-variant">${member.email}</p><span class="inline-block mt-2 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">${roleLabel(member.role)}</span></div>
      </article>`).join('')}</div></div>`;
  }

  function renderIntegrations() {
    activateTab('Integrations');
    const integrations = settings.integrations || {};
    const systems = [
      ['CMMS', 'MaintainX / SAP PM bridge', 'Maintenance tickets and work orders'],
      ['ERP', 'SAP S/4HANA', 'Material availability and costing'],
      ['SCADA', 'Ignition / Siemens WinCC', 'Live control-system status'],
      ['Historian', 'OSIsoft PI / Timescale', 'High-frequency process trends'],
    ];
    contentHost().innerHTML = `<div class="md:col-span-12 glass-card rounded-xl p-md lg:p-xl"><h3 class="font-section-header text-section-header mb-md">Industrial Integrations</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-md">${systems.map(([key, name, desc]) => `
      <article class="rounded-xl border border-outline-variant/40 bg-white/70 p-md">
        <div class="flex justify-between gap-md"><div><h4 class="font-bold">${key}</h4><p class="text-sm text-on-surface-variant">${name}</p><p class="text-sm mt-2">${desc}</p></div><button data-integration="${key}" class="h-10 px-4 rounded-full font-bold ${integrations[key] ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary text-white'}">${integrations[key] ? 'Connected' : 'Connect'}</button></div>
      </article>`).join('')}</div></div>`;
    document.querySelectorAll('[data-integration]').forEach(btn => btn.addEventListener('click', async () => {
      const key = btn.dataset.integration;
      settings = await patch('/api/user/preferences', { integrations: { [key]: !(settings.integrations || {})[key] } });
      renderIntegrations();
      toast(`${key} integration saved`);
    }));
  }

  function renderSecurity() {
    activateTab('Security');
    const sessions = settings.sessions || [];
    contentHost().innerHTML = `<div class="md:col-span-6 glass-card rounded-xl p-md lg:p-xl">
      <h3 class="font-section-header text-section-header mb-md">Change Password</h3>
      <form id="ym-password-form" class="space-y-sm">
        <input name="currentPassword" class="w-full glass-input rounded-lg px-md py-3" type="password" placeholder="Current password">
        <input name="newPassword" class="w-full glass-input rounded-lg px-md py-3" type="password" placeholder="New password (8+ chars)">
        <button class="rounded-lg bg-primary text-white px-md py-3 font-bold">Update Password</button>
      </form>
    </div>
    <div class="md:col-span-6 glass-card rounded-xl p-md lg:p-xl">
      <h3 class="font-section-header text-section-header mb-md">Active Sessions</h3>
      <div class="space-y-sm">${sessions.map(s => `<div class="rounded-xl bg-white/70 border border-outline-variant/40 p-md flex justify-between"><div><p class="font-bold">${s.device}</p><p class="text-sm text-on-surface-variant">${s.city} · ${s.lastSeen}</p></div>${s.current ? '<span class="text-secondary font-bold text-sm">Current</span>' : '<span class="text-on-surface-variant text-sm">Trusted</span>'}</div>`).join('')}</div>
    </div>`;
    document.querySelector('#ym-password-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const result = await post('/api/user/change-password', { currentPassword: fd.get('currentPassword'), newPassword: fd.get('newPassword') });
      if (result.ok) toast('Password updated');
      else toast(result.error || 'Password update failed', false);
    });
  }

  function renderAppearance() {
    activateTab('Appearance');
    const prefs = settings.prefs || {};
    contentHost().innerHTML = `<div class="md:col-span-12 glass-card rounded-xl p-md lg:p-xl">
      <h3 class="font-section-header text-section-header mb-md">Appearance</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-md">
        ${[['compactMode','Compact command density'],['highContrast','High contrast alerts'],['motionReduced','Reduce motion']].map(([key,label]) => `
          <label class="rounded-xl border border-outline-variant/40 bg-white/70 p-md flex justify-between gap-md"><span class="font-bold">${label}</span><input type="checkbox" data-appearance="${key}" ${prefs[key] ? 'checked' : ''}></label>`).join('')}
      </div>
    </div>`;
    document.querySelectorAll('[data-appearance]').forEach(input => input.addEventListener('change', async () => {
      settings = await patch('/api/user/preferences', { prefs: { [input.dataset.appearance]: input.checked } });
      toast('Appearance preference saved');
    }));
  }

  function renderApiKeys() {
    activateTab('API Keys');
    const integrations = settings.integrations || {};
    contentHost().innerHTML = `<div class="md:col-span-12 glass-card rounded-xl p-md lg:p-xl">
      <h3 class="font-section-header text-section-header mb-md">API Keys (Demo)</h3>
      <p class="text-on-surface-variant mb-md">Demo key states are persisted as integration preferences. Real production secrets should live only in environment variables or a vault.</p>
      <div class="space-y-sm">${['OpenAI', 'SCADA Read Token', 'CMMS Service Account'].map(key => `<div class="rounded-xl border border-outline-variant/40 bg-white/70 p-md flex justify-between items-center"><div><p class="font-bold">${key}</p><p class="text-sm text-on-surface-variant">${integrations[key] ? 'Configured for demo' : 'Not configured'}</p></div><button data-api-key="${key}" class="rounded-full px-4 py-2 font-bold bg-primary text-white">${integrations[key] ? 'Rotate' : 'Create demo key'}</button></div>`).join('')}</div>
    </div>`;
    document.querySelectorAll('[data-api-key]').forEach(btn => btn.addEventListener('click', async () => {
      const key = btn.dataset.apiKey;
      settings = await patch('/api/user/preferences', { integrations: { [key]: true } });
      renderApiKeys();
      toast(`${key} demo key updated`);
    }));
  }

  async function renderAuditLog() {
    activateTab('Audit');
    const logs = await get('/api/audit-log');
    contentHost().innerHTML = `<div class="md:col-span-12 glass-card rounded-xl p-md lg:p-xl">
      <h3 class="font-section-header text-section-header mb-md">Audit Log</h3>
      <div class="space-y-sm">${logs.map(log => `<article class="rounded-xl border border-outline-variant/40 bg-white/70 p-md"><p class="font-bold">${log.action}</p><p class="text-sm text-on-surface-variant">${log.entity} ${log.entityId || ''}</p><p class="text-xs text-on-surface-variant mt-1">${new Date(log.createdAt).toLocaleString()}</p></article>`).join('')}</div>
    </div>`;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;
    [profile, settings, team] = await Promise.all([get('/api/user/profile'), get('/api/user/preferences'), get('/api/team')]);
    const tabActions = {
      Profile: renderProfile,
      Notifications: renderNotifications,
      'Team & Roles': renderTeam,
      Integrations: renderIntegrations,
      Security: renderSecurity,
      Appearance: renderAppearance,
      'API Keys': renderApiKeys,
      'Audit Log': renderAuditLog
    };
    const tabBar = document.querySelector('main .flex.gap-gutter');
    if (tabBar) {
      ['Appearance', 'API Keys', 'Audit Log'].forEach(label => {
        if (!Array.from(tabBar.querySelectorAll('button')).some(btn => btn.textContent.trim() === label)) {
          const btn = document.createElement('button');
          btn.className = 'px-md py-3 rounded-full glass-card hover:bg-white transition-colors text-on-surface-variant font-medium whitespace-nowrap';
          btn.textContent = label;
          tabBar.appendChild(btn);
        }
      });
    }
    document.querySelectorAll('main .flex.gap-gutter button').forEach(btn => {
      const text = btn.textContent.trim();
      btn.addEventListener('click', () => (tabActions[text] || renderProfile)());
    });
    renderProfile();
  });
})();
