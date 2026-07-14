(function() {
  async function get(p) { const r = await fetch(p, { credentials: 'same-origin' }); if (!r.ok) throw new Error(p); return r.json(); }
  async function post(p, b) { const r = await fetch(p, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body:JSON.stringify(b) }); if (!r.ok) throw new Error(p); return r.json(); }
  async function patch(p, b) { const r = await fetch(p, { method:'PATCH', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body:JSON.stringify(b) }); if (!r.ok) throw new Error(p); return r.json(); }

  let agents = [], machines = [], workOrders = [], plans = [], missions = [];
  let selectedAgent = null;
  let selectedMissionId = null;
  let drawerOpen = false;
  let draggedAgentId = null;
  let loaded = { agents: false, missions: false };
  let errors = { agents: null, missions: null };

  const plantNames = ['Pune Automotive','Chennai Electronics','Ahmedabad Process','Bengaluru Precision','Nagpur Logistics'];
  const machineNames = ['CNC-7740','EV-LOADER','CONVEYOR-B','HVAC-SYS','Turbine-7','RX-900 ARM','Pump P-102'];
  const agentTypes = ['Diagnostic','Planner','Inventory','Energy','Executive','Security','Firmware','HVAC','Grid'];
  const statuses = ['active','paused','done'];
  const typeColors = { Diagnostic:'#413fd6', Planner:'#774f00', Inventory:'#986500', Energy:'#006b5f', Executive:'#ba1a1a', Security:'#2e2f3e', Firmware:'#4948de', HVAC:'#007165', Grid:'#624000' };

  function escapeHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  function rn(min, max) { return Math.round((Math.random() * (max - min) + min) * 10) / 10; }
  function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function toast(msg, type) {
    const c = document.getElementById('ym-toast-container');
    const el = document.createElement('div');
    el.className = 'rounded-full border px-5 py-3 text-sm font-bold shadow-xl pointer-events-auto ' + (type === 'error' ? 'border-error/20 bg-error/95 text-white' : 'border-primary/20 bg-white/95 text-primary');
    el.textContent = msg; c.appendChild(el);
    setTimeout(() => { el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(() => el.remove(), 300); }, 2600);
  }

  function openModal(title, body) {
    document.querySelector('.ym-modal-bd')?.remove();
    if (window.__ymEscHandler) { document.removeEventListener('keydown', window.__ymEscHandler); window.__ymEscHandler = null; }
    const wrap = document.createElement('div');
    wrap.className = 'ym-modal-backdrop ym-modal-bd';
    wrap.innerHTML = `<div class="ym-modal-card" role="dialog" aria-modal="true">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:14px">
        <h2 style="font:900 24px/1.2 Inter,system-ui,sans-serif;color:#191a28">${title}</h2>
        <button class="ym-close-modal" style="border:0;background:#eeecff;border-radius:999px;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined">close</span></button>
      </div><div>${body}</div>
    </div>`;
    const close = () => { wrap.remove(); document.body.style.overflow = ''; if (window.__ymEscHandler) { document.removeEventListener('keydown', window.__ymEscHandler); window.__ymEscHandler = null; } };
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.ym-close-modal')) close(); });
    document.body.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    wrap.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus();
    const escHandler = e => { if (e.key === 'Escape') close(); };
    window.__ymEscHandler = escHandler;
    document.addEventListener('keydown', escHandler);
    return wrap;
  }

  function enrichAgent(agent) {
    const at = agent.type || randomFrom(agentTypes);
    return {
      ...agent,
      agentType: at,
      agentColor: typeColors[at] || '#413fd6',
      plant: randomFrom(plantNames),
      machine: randomFrom(machineNames),
      confidence: rn(75, 99.9),
      health: rn(60, 100),
      remainingTime: randomFrom(['12 min','45 min','2 hrs','4 hrs','1 hr','30 min']),
      lastActivity: randomFrom(['Just now','2 min ago','15 min ago','1 hr ago','3 hrs ago']),
      priority: randomFrom(['critical','high','medium','low']),
      progress: agent.progress || rn(0, 100)
    };
  }

  function statusNext(status) {
    const map = { active: { status:'paused', progress:75 }, paused: { status:'done', progress:100 }, done: { status:'active', progress:25 }, idle: { status:'active', progress:25 } };
    return map[status] || { status:'active', progress:25 };
  }

  function loadingSpinner() {
    return '<div class="flex items-center justify-center py-6"><div class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div><span class="ml-2 text-xs text-on-surface-variant">Loading...</span></div>';
  }

  function errorState(msg) {
    return '<div class="text-xs text-center py-4 text-error/70">' + (msg || 'Failed to load') + '</div>';
  }

  function renderKPIs() {
    if (!loaded.agents) {
      ['ym-kpi-active','ym-kpi-running','ym-kpi-awaiting','ym-kpi-completed','ym-kpi-efficiency','ym-kpi-success'].forEach(id => {
        const el = document.getElementById(id); if (el) el.textContent = '--';
      });
      return;
    }
    if (errors.agents) {
      ['ym-kpi-active','ym-kpi-running','ym-kpi-awaiting','ym-kpi-completed','ym-kpi-efficiency','ym-kpi-success'].forEach(id => {
        const el = document.getElementById(id); if (el) el.textContent = '--';
      });
      return;
    }
    const active = agents.filter(a => a.status === 'active').length;
    const paused = agents.filter(a => a.status === 'paused').length;
    const done = agents.filter(a => a.status === 'done').length;
    const withMission = agents.filter(a => a.mission).length;
    const completedToday = agents.filter(a => a.status === 'done' && new Date(a.updatedAt || Date.now()).toISOString().slice(0,10) === new Date().toISOString().slice(0,10)).length;
    const avgProgress = agents.length ? Math.round(agents.reduce((s, a) => s + (a.progress || 0), 0) / agents.length) : 0;
    const avgSuccess = agents.length ? Math.round(agents.reduce((s, a) => s + (a.successRate || rn(80, 100)), 0) / agents.length) : 0;
    document.getElementById('ym-kpi-active').textContent = active;
    document.getElementById('ym-kpi-running').textContent = withMission;
    document.getElementById('ym-kpi-awaiting').textContent = paused;
    document.getElementById('ym-kpi-completed').textContent = completedToday;
    document.getElementById('ym-kpi-efficiency').textContent = avgProgress + '%';
    document.getElementById('ym-kpi-success').textContent = avgSuccess + '%';
  }

  function renderAgentCard(agent) {
    const e = enrichAgent(agent);
    const progress = Math.max(0, Math.min(100, Number(e.progress) || 0));
    const priorityColors = { critical:'text-error', high:'text-primary', medium:'text-tertiary', low:'text-on-surface-variant' };
    const statusDots = { active:'bg-primary status-glow-primary', paused:'bg-tertiary', done:'bg-outline-variant' };
    const statusLabels = { active:'Running', paused:'Reviewing', done:'Completed' };
    const isSelected = selectedMissionId === agent.id;

    return `<article class="glass-panel rounded-xl p-md flex flex-col gap-sm agent-card ${isSelected ? 'ring-2 ring-primary' : ''}" draggable="true" data-agent-id="${e.id}" data-status="${e.status}">
      <div class="flex items-start gap-3">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style="background:${e.agentColor}18;border:2px solid ${e.agentColor}40">
          <span class="material-symbols-outlined" style="color:${e.agentColor};font-variation-settings:'FILL' 1">smart_toy</span>
        </div>
        <div class="flex-grow min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <h3 class="font-semibold text-on-surface text-sm truncate">${escapeHtml(e.name)}</h3>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${priorityColors[e.priority] || 'text-on-surface-variant'} bg-surface-container-high">${e.priority.toUpperCase()}</span>
          </div>
          <p class="text-xs text-on-surface-variant truncate">${e.agentType} &middot; ${e.plant} &middot; ${e.machine}</p>
        </div>
        <div class="w-2 h-2 rounded-full shrink-0 ${statusDots[e.status] || 'bg-outline-variant'}"></div>
      </div>
      <p class="text-xs text-on-surface font-medium truncate">${escapeHtml(e.mission || 'No active mission')}</p>
      <div class="flex items-center gap-2">
        <div class="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden"><div class="h-full rounded-full transition-all duration-500" style="width:${progress}%;background:${e.status === 'done' ? '#006b5f' : e.agentColor}"></div></div>
        <span class="text-[10px] font-bold shrink-0" style="color:${e.agentColor}">${Math.round(progress)}%</span>
      </div>
      <div class="flex items-center justify-between text-[10px] text-on-surface-variant">
        <span class="font-label-caps">${statusLabels[e.status] || 'Idle'}</span>
        <span>Conf: ${Math.round(e.confidence)}% · Health: ${Math.round(e.health)}%</span>
      </div>
      <div class="flex items-center justify-between text-[10px] text-on-surface-variant">
        <span>Remaining: ${e.remainingTime}</span>
        <span>${e.lastActivity}</span>
      </div>
      ${e.successRate ? `<div class="text-[10px] text-on-surface-variant">Success Rate: <span class="font-bold text-secondary">${e.successRate}%</span></div>` : ''}
      <div class="flex flex-wrap gap-1 pt-1 border-t border-outline-variant/10">
        ${e.status !== 'active' ? `<button class="flex-1 min-w-[60px] text-[9px] font-bold py-1.5 rounded-full border border-secondary/30 text-secondary hover:bg-secondary/5 transition-all" data-action="resume" data-id="${e.id}"><span class="material-symbols-outlined text-[12px] align-text-bottom">play_arrow</span> Resume</button>` : ''}
        ${e.status !== 'paused' ? `<button class="flex-1 min-w-[60px] text-[9px] font-bold py-1.5 rounded-full border border-tertiary/30 text-tertiary hover:bg-tertiary/5 transition-all" data-action="pause" data-id="${e.id}"><span class="material-symbols-outlined text-[12px] align-text-bottom">pause</span> Pause</button>` : ''}
        ${e.status !== 'done' ? `<button class="flex-1 min-w-[60px] text-[9px] font-bold py-1.5 rounded-full border border-outline/30 text-on-surface-variant hover:bg-primary/5 transition-all" data-action="restart" data-id="${e.id}"><span class="material-symbols-outlined text-[12px] align-text-bottom">restart_alt</span> Restart</button>` : ''}
        <button class="flex-1 min-w-[60px] text-[9px] font-bold py-1.5 rounded-full border border-primary/20 text-primary hover:bg-primary/5 transition-all" data-action="details" data-id="${e.id}"><span class="material-symbols-outlined text-[12px] align-text-bottom">open_in_new</span> Details</button>
      </div>
    </article>`;
  }

  function renderColumns() {
    const searchQ = (document.getElementById('ym-search-input')?.value || '').toLowerCase();
    const filtered = agents.filter(a => {
      const e = enrichAgent(a);
      if (!searchQ) return true;
      return a.name.toLowerCase().includes(searchQ) || e.agentType.toLowerCase().includes(searchQ) || (a.mission || '').toLowerCase().includes(searchQ);
    });

    statuses.forEach(status => {
      const container = document.getElementById('ym-drop-' + status);
      const countEl = document.getElementById('ym-count-' + status);
      if (!container) return;
      if (!loaded.agents) { container.innerHTML = '<div class="text-xs text-on-surface-variant text-center py-4">--</div>'; return; }
      if (errors.agents) { container.innerHTML = '<div class="text-xs text-error/70 text-center py-2">Error</div>'; return; }
      const items = filtered.filter(a => (a.status || 'idle') === status);
      if (!items.length) {
        container.innerHTML = '<div class="text-[10px] text-on-surface-variant text-center py-4 italic">No agents</div>';
        if (countEl) countEl.textContent = '0';
        return;
      }
      container.innerHTML = items.map(a => renderAgentCard(a)).join('');
      if (countEl) countEl.textContent = items.length;
    });

  }

  function openDrawer(agent) {
    const drawer = document.getElementById('ym-agent-drawer');
    const backdrop = document.getElementById('ym-drawer-backdrop');
    if (!drawer || !agent) return;
    selectedAgent = agent;
    drawerOpen = true;
    const e = enrichAgent(agent);
    document.getElementById('ym-drawer-title').textContent = agent.name + ' — ' + e.agentType;

    const relatedOrders = workOrders.filter(w => w.assignedTo === agent.name || w.machine?.name === e.machine);
    const relatedPlans = plans.filter(p => p.createdBy === agent.name);

    document.getElementById('ym-drawer-content').innerHTML = `
      <div class="flex items-center gap-3 mb-md">
        <div class="w-16 h-16 rounded-xl flex items-center justify-center" style="background:${e.agentColor}18;border:2px solid ${e.agentColor}40">
          <span class="material-symbols-outlined text-3xl" style="color:${e.agentColor};font-variation-settings:'FILL' 1">smart_toy</span>
        </div>
        <div>
          <p class="font-bold text-lg">${agent.name}</p>
          <p class="text-sm text-on-surface-variant">${e.agentType} · ${e.plant} · ${e.machine}</p>
          <div class="flex items-center gap-2 mt-1">
            <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${e.status === 'active' ? 'bg-primary/10 text-primary' : e.status === 'paused' ? 'bg-tertiary/10 text-tertiary' : 'bg-surface-container text-on-surface-variant'}">${e.status.toUpperCase()}</span>
            <span class="text-xs">Confidence: <span class="font-bold">${Math.round(e.confidence)}%</span></span>
          </div>
        </div>
      </div>
      <div class="mb-md">
        <h4 class="font-label-caps text-[10px] text-on-surface-variant mb-1">CURRENT MISSION</h4>
        <p class="text-sm bg-surface-container-low rounded-lg p-3 border border-outline-variant/20">${agent.mission || 'No active mission'}</p>
      </div>
      <div class="grid grid-cols-2 gap-sm mb-md">
        <div class="bg-primary/5 rounded-lg p-3"><p class="text-[10px] text-on-surface-variant">Progress</p><div class="flex items-center gap-2 mt-1"><div class="flex-1 h-2 bg-outline-variant/30 rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${e.progress}%;background:${e.agentColor}"></div></div><span class="font-bold text-xs" style="color:${e.agentColor}">${Math.round(e.progress)}%</span></div></div>
        <div class="bg-primary/5 rounded-lg p-3"><p class="text-[10px] text-on-surface-variant">Health</p><p class="font-bold text-lg mt-1 ${e.health > 80 ? 'text-secondary' : e.health > 60 ? 'text-tertiary' : 'text-error'}">${Math.round(e.health)}%</p></div>
        <div class="bg-primary/5 rounded-lg p-3"><p class="text-[10px] text-on-surface-variant">Remaining</p><p class="font-bold text-sm mt-1">${e.remainingTime}</p></div>
        <div class="bg-primary/5 rounded-lg p-3"><p class="text-[10px] text-on-surface-variant">Success Rate</p><p class="font-bold text-sm mt-1 text-secondary">${agent.successRate || Math.round(rn(80, 100))}%</p></div>
      </div>
      <div class="mb-md">
        <h4 class="font-label-caps text-[10px] text-on-surface-variant mb-1 flex items-center gap-1"><span class="material-symbols-outlined text-sm">psychology</span> CURRENT REASONING</h4>
        <div class="bg-surface-container-low rounded-lg p-3 border border-outline-variant/20 text-xs space-y-2">
          <p><span class="font-semibold">Analyzing:</span> ${e.machine} sensor data — vibration signature indicates bearing wear progression at 0.7x threshold</p>
          <p><span class="font-semibold">Correlating:</span> Cross-referencing with 3 historical failure events from ${e.plant} database</p>
          <p><span class="font-semibold">Predicting:</span> RUL estimate: ${Math.round(rn(200, 2000))} operational hours before critical failure</p>
        </div>
      </div>
      <div class="mb-md">
        <h4 class="font-label-caps text-[10px] text-on-surface-variant mb-1">EXECUTED STEPS</h4>
        <div class="space-y-1 text-xs">
          <div class="flex items-center gap-2"><span class="material-symbols-outlined text-sm text-secondary">check_circle</span> Initialized diagnostic sweep</div>
          <div class="flex items-center gap-2"><span class="material-symbols-outlined text-sm text-secondary">check_circle</span> Fetched sensor telemetry (24 streams)</div>
          <div class="flex items-center gap-2"><span class="material-symbols-outlined text-sm text-secondary">check_circle</span> Cross-referenced failure patterns</div>
          <div class="flex items-center gap-2"><span class="material-symbols-outlined text-sm" style="color:${e.agentColor}">progress_activity</span> Generating recommendation report</div>
        </div>
      </div>
      <div class="mb-md">
        <h4 class="font-label-caps text-[10px] text-on-surface-variant mb-1">DECISION TIMELINE</h4>
        <div class="relative pl-5 space-y-2 text-xs before:content-[''] before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-[2px] before:bg-outline-variant/20">
          <div class="relative"><div class="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-primary ring-2 ring-white"></div><p class="font-semibold">Mission started</p><p class="text-on-surface-variant">${new Date(agent.createdAt || Date.now()).toLocaleString()}</p></div>
          <div class="relative"><div class="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-secondary ring-2 ring-white"></div><p class="font-semibold">Data collection complete</p><p class="text-on-surface-variant">${new Date(agent.updatedAt || Date.now()).toLocaleString()}</p></div>
          <div class="relative"><div class="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-outline-variant ring-2 ring-white"></div><p class="font-semibold">Awaiting approval</p><p class="text-on-surface-variant">Pending review</p></div>
        </div>
      </div>
      ${relatedOrders.length ? `<div class="mb-md"><h4 class="font-label-caps text-[10px] text-on-surface-variant mb-1">RELATED WORK ORDERS</h4><div class="space-y-1">${relatedOrders.slice(0, 5).map(o => `<div class="flex items-center gap-2 text-xs bg-primary/5 rounded-lg p-2"><span class="material-symbols-outlined text-sm text-primary">build</span><span>${o.title}</span><span class="ml-auto ${o.status === 'completed' ? 'text-secondary' : 'text-tertiary'} text-[9px] font-bold">${o.status}</span></div>`).join('')}</div></div>` : ''}
      ${relatedPlans.length ? `<div class="mb-md"><h4 class="font-label-caps text-[10px] text-on-surface-variant mb-1">RELATED MAINTENANCE PLANS</h4><div class="space-y-1">${relatedPlans.slice(0, 5).map(p => `<div class="flex items-center gap-2 text-xs bg-primary/5 rounded-lg p-2"><span class="material-symbols-outlined text-sm text-tertiary">fact_check</span><span>${p.title}</span></div>`).join('')}</div></div>` : ''}
      <div class="flex gap-sm pt-2 border-t border-outline-variant/10">
        <a class="flex-1 text-center py-2 rounded-full border border-primary/30 text-primary text-xs font-bold hover:bg-primary/5 transition-all" href="/digital-twin?machine=${e.machine}"><span class="material-symbols-outlined text-sm align-text-bottom">view_in_ar</span> Digital Twin</a>
        <a class="flex-1 text-center py-2 rounded-full border border-primary/30 text-primary text-xs font-bold hover:bg-primary/5 transition-all" href="/reliability?machine=${e.machine}"><span class="material-symbols-outlined text-sm align-text-bottom">monitoring</span> Reliability</a>
      </div>
    `;
    drawer.style.display = 'flex';
    backdrop.style.display = 'block';
    setTimeout(() => {
      drawer.classList.remove('drawer-enter');
      drawer.classList.add('drawer-enter-active');
      backdrop.classList.add('open');
    }, 10);
  }

  function closeDrawer() {
    const drawer = document.getElementById('ym-agent-drawer');
    const backdrop = document.getElementById('ym-drawer-backdrop');
    if (!drawer) return;
    drawerOpen = false;
    drawer.classList.remove('drawer-enter-active');
    drawer.classList.add('drawer-exit-active');
    backdrop.classList.remove('open');
    setTimeout(() => {
      drawer.style.display = 'none';
      drawer.classList.remove('drawer-exit-active');
      drawer.classList.add('drawer-enter');
    }, 300);
  }

  function renderActiveFilters() {
    const c = document.getElementById('ym-active-filters');
    if (!c) return;
    const q = (document.getElementById('ym-search-input')?.value || '').toLowerCase();
    if (!q) { c.innerHTML = ''; return; }
    c.innerHTML = `<span class="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold flex items-center gap-1">Search: ${q} <button class="ym-clear-search" style="font-size:12px">&times;</button></span>`;
    c.querySelector('.ym-clear-search')?.addEventListener('click', () => {
      document.getElementById('ym-search-input').value = '';
      renderColumns();
      renderActiveFilters();
    });
  }

  function renderRunningMissions() {
    const c = document.getElementById('ym-running-missions');
    if (!c) return;
    if (!loaded.agents) { c.innerHTML = loadingSpinner(); return; }
    if (errors.agents) { c.innerHTML = errorState(); return; }
    const items = agents.filter(a => a.mission && a.status === 'active');
    if (!items.length) { c.innerHTML = '<div class="text-xs text-on-surface-variant text-center py-6 flex flex-col items-center gap-2"><span class="material-symbols-outlined text-lg text-outline">rocket_launch</span><span>No active missions</span></div>'; return; }
    const borderColors = ['border-l-primary', 'border-l-secondary', 'border-l-tertiary', 'border-l-primary', 'border-l-secondary'];
    c.innerHTML = items.map((a, i) => {
      const e = enrichAgent(a);
      const bc = borderColors[i % borderColors.length];
      const color = e.agentColor;
      const isSelected = selectedMissionId === a.id;
      return `<div class="glass-panel rounded-xl p-3 border-l-4 ${bc} flex items-center gap-3 cursor-pointer transition-all duration-200 mission-item ${isSelected ? 'ring-2 ring-primary' : 'hover:bg-white/40'}" data-mission-id="${a.id}">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background:${color}18"><span class="material-symbols-outlined" style="color:${color}">precision_manufacturing</span></div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-bold truncate">${escapeHtml(a.mission)}</p>
          <p class="text-[10px] text-on-surface-variant">${e.agentType} · ${Math.round(e.confidence)}% confidence</p>
          <div class="flex items-center gap-2 mt-1"><div class="flex-1 h-1 bg-surface-container rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${Math.round(e.progress)}%;background:${color}"></div></div><span class="text-[9px] font-bold" style="color:${color}">${Math.round(e.progress)}%</span></div>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0"><span class="text-[9px] font-bold text-secondary">${e.remainingTime}</span><span class="text-[9px] text-on-surface-variant">ETA</span></div>
      </div>`;
    }).join('');
    c.querySelectorAll('.mission-item').forEach(el => {
      el.addEventListener('click', function() {
        const id = this.dataset.missionId;
        selectedMissionId = id;
        renderRunningMissions();
        renderMissionQueue();
        renderColumns();
        renderMissionDetails();
      });
    });
  }

  function renderMissionQueue() {
    const c = document.getElementById('ym-mission-queue-body');
    if (!c) return;
    if (!loaded.agents) { c.innerHTML = '<tr><td colspan="5" class="text-center py-6">' + loadingSpinner() + '</td></tr>'; return; }
    if (errors.agents) { c.innerHTML = '<tr><td colspan="5" class="text-center py-4">' + errorState() + '</td></tr>'; return; }
    const items = agents.filter(a => a.mission).sort((a, b) => {
      const pri = { critical: 0, high: 1, medium: 2, low: 3 };
      return (pri[a.priority] ?? 99) - (pri[b.priority] ?? 99);
    });
    if (!items.length) { c.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-xs text-on-surface-variant"><span class="material-symbols-outlined text-lg block mb-1 text-outline">assignment</span>No missions in queue</td></tr>'; return; }
    const dotColors = { critical: 'bg-error', high: 'bg-tertiary', medium: 'bg-primary', low: 'bg-on-surface-variant' };
    const badgeColors = { critical: 'bg-error/10 text-error', high: 'bg-tertiary/10 text-tertiary', medium: 'bg-primary/10 text-primary', low: 'bg-on-surface-variant/10 text-on-surface-variant' };
    c.innerHTML = items.map(a => {
      const e = enrichAgent(a);
      const p = (a.priority || 'medium').toLowerCase();
      const statusLabel = { active: 'Running', paused: 'Reviewing', done: 'Completed' };
      const isSelected = selectedMissionId === a.id;
      return `<tr class="border-b border-outline-variant/10 hover:bg-primary/5 transition-colors cursor-pointer queue-row ${isSelected ? 'bg-primary/10' : ''}" data-mission-id="${a.id}">
        <td class="py-2.5 pl-4"><div class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full ${dotColors[p] || 'bg-on-surface-variant'} shrink-0"></span><span class="font-medium text-xs">${escapeHtml(a.mission)}</span></div></td>
        <td class="py-2.5 text-xs"><div class="flex items-center gap-1.5"><span class="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold" style="background:${e.agentColor}20;color:${e.agentColor}">${e.agentType[0]}</span>${escapeHtml(e.agentType)}</div></td>
        <td class="py-2.5"><span class="px-1.5 py-0.5 rounded ${badgeColors[p]} text-[9px] font-bold">${p.toUpperCase()}</span></td>
        <td class="py-2.5 text-xs"><span class="font-bold">${statusLabel[a.status] || a.status}</span></td>
        <td class="py-2.5 pr-4 text-right text-xs text-on-surface-variant">${e.remainingTime}</td>
      </tr>`;
    }).join('');
    c.querySelectorAll('.queue-row').forEach(el => {
      el.addEventListener('click', function() {
        const id = this.dataset.missionId;
        selectedMissionId = selectedMissionId === id ? null : id;
        renderMissionQueue();
        renderRunningMissions();
        renderColumns();
        renderMissionDetails();
      });
    });
  }

  function renderActivityFeed() {
    const c = document.getElementById('ym-activity-feed');
    if (!c) return;
    if (!loaded.agents) { c.innerHTML = loadingSpinner(); return; }
    if (errors.agents) { c.innerHTML = errorState(); return; }
    const items = agents.slice(0, 10);
    if (!items.length) { c.innerHTML = '<div class="text-xs text-on-surface-variant text-center py-6 flex flex-col items-center gap-2"><span class="material-symbols-outlined text-lg text-outline">cable</span><span>No activity yet</span></div>'; return; }
    const dotColors = ['bg-secondary', 'bg-primary', 'bg-tertiary', 'bg-secondary', 'bg-on-surface-variant'];
    c.innerHTML = items.map((a, i) => {
      const e = enrichAgent(a);
      return `<div class="flex items-start gap-2.5 py-1.5"><span class="w-1.5 h-1.5 rounded-full ${dotColors[i % dotColors.length]} mt-1.5 shrink-0"></span><div class="min-w-0"><p class="text-xs truncate"><span class="font-bold">${escapeHtml(a.name)}</span> ${a.mission ? 'working on: ' + escapeHtml(a.mission) : 'idle'}</p><p class="text-[9px] text-on-surface-variant">${e.lastActivity}</p></div></div>`;
    }).join('');
  }

  let timelineEvents = [];
  let timelineRange = '24h';

  function renderTimeline() {
    const c = document.getElementById('ym-timeline');
    if (!c) return;
    if (!loaded.agents && !timelineEvents.length) { c.innerHTML = loadingSpinner(); return; }
    const events = timelineEvents.length ? timelineEvents : agents.slice(0, 6);
    if (!events.length) { c.innerHTML = '<div class="text-xs text-on-surface-variant text-center py-6 flex flex-col items-center gap-2"><span class="material-symbols-outlined text-lg text-outline">timeline</span><span>No timeline events</span></div>'; return; }
    const colors = ['primary', 'secondary', 'tertiary', 'on-surface-variant'];
    c.innerHTML = events.slice(0, 6).map((ev, i) => {
      const color = colors[i % colors.length];
      const time = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(Date.now() - i * 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const name = ev.name || ev.agentName || 'Agent';
      const action = ev.action || (ev.status === 'active' ? 'started' : ev.status === 'done' ? 'completed' : 'updated');
      const desc = ev.description || ev.mission || 'task';
      return `<div class="relative pl-5 pb-1.5 ${i < events.slice(0, 6).length - 1 ? 'border-l-2 border-' + color + '/30' : ''}"><div class="absolute -left-[9px] top-0 w-3.5 h-3.5 rounded-full bg-${color} ring-2 ring-white"></div><p class="text-[10px] text-${color} font-bold">${time}</p><p class="text-xs">${escapeHtml(name)} ${action} ${escapeHtml(desc)}</p></div>`;
    }).join('');
  }

  async function loadTimeline() {
    try {
      const data = await get('/api/timeline?range=' + (timelineRange === '7d' ? '7d' : '24h'));
      timelineEvents = data.events || data || [];
    } catch { timelineEvents = []; }
    renderTimeline();
  }

  function renderMissionDetails() {
    const c = document.getElementById('ym-mission-details');
    if (!c) return;
    if (!loaded.agents) { c.innerHTML = '<div class="flex items-center justify-center py-6">' + loadingSpinner() + '</div>'; return; }
    if (errors.agents) { c.innerHTML = errorState(); return; }

    const focusAgent = selectedMissionId ? agents.find(a => a.id === selectedMissionId) : null;
    const agent = focusAgent || agents.find(a => a.status === 'active' && a.mission);
    if (!agent) {
      c.innerHTML = '<div class="flex items-center gap-2 mb-3"><span class="material-symbols-outlined text-sm text-primary">assignment</span><h3 class="font-section-header text-xs font-bold">Mission Details</h3></div><div class="text-xs text-on-surface-variant text-center py-6 flex flex-col items-center gap-2"><span class="material-symbols-outlined text-lg text-outline">assignment</span><span>Select a mission to view details</span></div>';
      return;
    }
    const e = enrichAgent(agent);
    const logs = agent.recentActions || [
      'Initialized diagnostic sweep',
      'Fetched sensor telemetry (24 streams)',
      'Cross-referenced failure patterns',
      'Generating recommendation report'
    ];
    c.innerHTML = `<div class="flex items-center gap-2 mb-3"><span class="material-symbols-outlined text-sm text-primary">assignment</span><h3 class="font-section-header text-xs font-bold">Mission Details</h3></div>
      <div class="space-y-2.5 text-xs">
        <div class="flex items-center justify-between"><span class="text-on-surface-variant">Mission</span><span class="font-bold text-right max-w-[60%] truncate">${escapeHtml(agent.mission || 'No mission')}</span></div>
        <div class="flex items-center justify-between"><span class="text-on-surface-variant">Agent</span><span class="font-bold text-primary">${escapeHtml(agent.name)}</span></div>
        <div class="flex items-center justify-between"><span class="text-on-surface-variant">Status</span><span class="font-bold ${agent.status === 'active' ? 'text-secondary' : agent.status === 'paused' ? 'text-tertiary' : 'text-on-surface-variant'}">${(agent.status || 'idle').toUpperCase()}</span></div>
        <div class="flex items-center justify-between"><span class="text-on-surface-variant">Progress</span><span class="font-bold text-secondary">${Math.round(e.progress)}%</span></div>
        <div class="w-full h-1.5 bg-surface-container rounded-full overflow-hidden"><div class="h-full rounded-full transition-all duration-500" style="width:${Math.round(e.progress)}%;background:${e.agentColor}"></div></div>
        <div class="flex items-center justify-between"><span class="text-on-surface-variant">ETA</span><span class="font-bold">${e.remainingTime}</span></div>
        <div class="pt-2 border-t border-outline-variant/20">
          <h4 class="font-label-caps text-[10px] text-on-surface-variant mb-1.5">RECENT LOGS</h4>
          <div class="space-y-1">${logs.slice(-4).map(l => `<div class="flex items-center gap-1.5"><span class="w-1 h-1 rounded-full bg-primary/60 shrink-0"></span><span class="text-[10px] text-on-surface-variant">${escapeHtml(l)}</span></div>`).join('')}</div>
        </div>
        <div class="flex gap-1.5 pt-1">
          <span class="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold">Conf: ${Math.round(e.confidence)}%</span>
          <span class="px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold">Health: ${Math.round(e.health)}%</span>
          <span class="px-1.5 py-0.5 rounded-full bg-tertiary/10 text-tertiary text-[9px] font-bold">${e.agentType}</span>
        </div>
      </div>`;
  }

  function renderAIRecommendations() {
    const c = document.getElementById('ym-ai-recommendations');
    if (!c) return;
    if (!loaded.agents) { c.innerHTML = '<div class="flex items-center justify-center py-6">' + loadingSpinner() + '</div>'; return; }
    if (errors.agents) { c.innerHTML = errorState(); return; }
    const active = agents.filter(a => a.status === 'active');
    const avgConf = active.length ? Math.round(active.reduce((s, a) => s + (a.confidence || 70), 0) / active.length) : 0;
    const bottleneck = agents.find(a => a.priority === 'critical' && a.status === 'active');
    const e = bottleneck ? enrichAgent(bottleneck) : null;
    c.innerHTML = `<div class="flex items-center gap-2 mb-3"><span class="material-symbols-outlined text-sm text-primary">auto_awesome</span><h3 class="font-section-header text-xs font-bold">AI Recommendations</h3></div>
      <div class="space-y-2">
        <div class="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-3 border border-primary/20"><div class="flex items-center gap-1.5 mb-1"><span class="material-symbols-outlined text-xs text-primary">insights</span><span class="text-[10px] font-bold">Operations</span></div><p class="text-[10px] text-on-surface-variant">${active.length} agents active with avg ${avgConf}% confidence. ${active.length > 0 ? 'Monitoring all systems.' : 'No agents currently running.'}</p></div>
        ${e ? `<div class="bg-gradient-to-br from-tertiary/5 to-tertiary/10 rounded-xl p-3 border border-tertiary/20"><div class="flex items-center gap-1.5 mb-1"><span class="material-symbols-outlined text-xs text-tertiary">warning</span><span class="text-[10px] font-bold">Bottleneck</span></div><p class="text-[10px] text-on-surface-variant">${escapeHtml(e.agentType)} on ${escapeHtml(e.machine)} at ${escapeHtml(e.plant)} requires attention — ${e.priority} priority.</p></div>` : ''}
        <div class="bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl p-3 border border-secondary/20"><div class="flex items-center gap-1.5 mb-1"><span class="material-symbols-outlined text-xs text-secondary">anomaly</span><span class="text-[10px] font-bold">Health</span></div><p class="text-[10px] text-on-surface-variant">System health nominal. ${bottleneck ? 'One critical item flagged above.' : 'All systems operational.'}</p></div>
      </div>`;
  }

  function renderSystemHealth() {
    const c = document.getElementById('ym-system-health');
    if (!c) return;
    if (!loaded.agents) { c.innerHTML = '<div class="flex items-center justify-center py-6">' + loadingSpinner() + '</div>'; return; }
    if (errors.agents) { c.innerHTML = errorState(); return; }
    const cloud = (99.5 + Math.random() * 0.5).toFixed(2);
    const edge = (97 + Math.random() * 2.5).toFixed(1);
    const network = agents.length ? Math.min(100, 95 + Math.random() * 5) : 0;
    const latency = (30 + Math.random() * 30).toFixed(0);
    c.innerHTML = `<div class="flex items-center gap-2 mb-3"><span class="material-symbols-outlined text-sm text-primary">monitor_heart</span><h3 class="font-section-header text-xs font-bold">System Health</h3></div>
      <div class="space-y-2 text-xs">
        <div class="flex justify-between items-center py-1"><span class="text-on-surface-variant">Agents Online</span><span class="text-secondary font-bold text-[11px]">${agents.length}</span></div>
        <div class="w-full h-1 bg-surface-container rounded-full overflow-hidden"><div class="bg-secondary h-full rounded-full" style="width:${agents.length > 0 ? 100 : 0}%"></div></div>
        <div class="flex justify-between items-center py-1"><span class="text-on-surface-variant">Edge Connectivity</span><span class="text-secondary font-bold text-[11px]">${edge}%</span></div>
        <div class="w-full h-1 bg-surface-container rounded-full overflow-hidden"><div class="bg-secondary h-full rounded-full" style="width:${edge}%"></div></div>
        <div class="flex justify-between items-center py-1"><span class="text-on-surface-variant">Agent Network</span><span class="text-primary font-bold text-[11px]">${Math.round(network)}%</span></div>
        <div class="w-full h-1 bg-surface-container rounded-full overflow-hidden"><div class="bg-primary h-full rounded-full" style="width:${network}%"></div></div>
        <div class="flex justify-between items-center py-1"><span class="text-on-surface-variant">Avg Latency</span><span class="text-tertiary font-bold text-[11px]">${latency}ms</span></div>
        <div class="w-full h-1 bg-surface-container rounded-full overflow-hidden"><div class="bg-tertiary h-full rounded-full" style="width:${Math.min(100, (1 - latency / 200) * 100)}%"></div></div>
      </div>`;
  }

  function openMissionModal(existingAgent) {
    const plantOpts = plantNames.map(p => `<option value="${p}">${p}</option>`).join('');
    const machineOpts = machineNames.map(m => `<option value="${m}">${m}</option>`).join('');
    const agentOpts = agents.map(a => `<option value="${a.id}" ${existingAgent && a.id === existingAgent.id ? 'selected' : ''}>${a.name} (${a.type || 'General'})</option>`).join('');
    const missionTypes = ['Diagnostic Scan','Predictive Analysis','Energy Optimization','Inventory Audit','Security Patrol','Compliance Check','Performance Tuning','Root Cause Analysis'];
    const body = `<form id="ym-mission-form" class="space-y-md">
      <div class="grid grid-cols-2 gap-md">
        <div><label class="font-label-caps text-[10px] text-on-surface-variant block mb-1">PLANT</label><select class="w-full border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-white/80" id="ym-mission-plant">${plantOpts}</select></div>
        <div><label class="font-label-caps text-[10px] text-on-surface-variant block mb-1">MACHINE</label><select class="w-full border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-white/80" id="ym-mission-machine">${machineOpts}</select></div>
      </div>
      <div class="grid grid-cols-2 gap-md">
        <div><label class="font-label-caps text-[10px] text-on-surface-variant block mb-1">MISSION TYPE</label><select class="w-full border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-white/80" id="ym-mission-type">${missionTypes.map(t => `<option value="${t}">${t}</option>`).join('')}</select></div>
        <div><label class="font-label-caps text-[10px] text-on-surface-variant block mb-1">PRIORITY</label><select class="w-full border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-white/80" id="ym-mission-priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
      </div>
      <div><label class="font-label-caps text-[10px] text-on-surface-variant block mb-1">ASSIGNED AGENT</label><select class="w-full border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-white/80" id="ym-mission-agent">${agentOpts}</select></div>
      <div class="grid grid-cols-2 gap-md">
        <div><label class="font-label-caps text-[10px] text-on-surface-variant block mb-1">SCHEDULE</label><input type="datetime-local" class="w-full border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-white/80" id="ym-mission-schedule"/></div>
        <div><label class="font-label-caps text-[10px] text-on-surface-variant block mb-1">AGENT TYPE</label><select class="w-full border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-white/80" id="ym-mission-agent-type"><option value="Diagnostic">Diagnostic</option><option value="Planner">Planner</option><option value="Inventory">Inventory</option><option value="Energy">Energy</option><option value="Executive">Executive</option><option value="Security">Security</option></select></div>
      </div>
      <div><label class="font-label-caps text-[10px] text-on-surface-variant block mb-1">DESCRIPTION</label><textarea class="w-full border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-white/80" id="ym-mission-desc" rows="2" placeholder="Describe the mission objective..."></textarea></div>
      <button type="submit" class="w-full shimmer-btn text-on-primary py-3 rounded-full font-label-caps text-sm flex items-center justify-center gap-xs shadow-lg"><span class="material-symbols-outlined text-sm">rocket_launch</span> LAUNCH MISSION</button>
    </form>`;
    const wrap = openModal('Assign New Mission', body);
    wrap.querySelector('#ym-mission-form')?.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> LAUNCHING...';
      const agentId = document.getElementById('ym-mission-agent').value;
      const missionType = document.getElementById('ym-mission-type').value;
      const desc = document.getElementById('ym-mission-desc').value.trim() || missionType + ' for ' + document.getElementById('ym-mission-machine').value;
      const missionPlant = document.getElementById('ym-mission-plant').value;
      try {
        if (agentId) {
          const agent = agents.find(a => a.id === agentId);
          const newMission = desc + ' @ ' + missionPlant + ' (' + missionType + ')';
          await patch('/api/agents/' + agentId, { mission: newMission, status: 'active', progress: 0 });
          toast('Mission assigned to ' + (agent?.name || 'agent'));
        } else {
          const name = missionType.replace(/\s+/g, '') + '-' + Math.floor(Math.random() * 100);
          const type = document.getElementById('ym-mission-agent-type').value;
          await post('/api/agents', { name, type, mission: desc, model: type + '-A1', status: 'active', progress: 0 });
          toast('New agent created: ' + name);
        }
        wrap.remove();
        document.body.style.overflow = '';
        await loadAgents();
      } catch (e) { toast('Failed to create mission', 'error'); }
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined text-sm">rocket_launch</span> LAUNCH MISSION';
    });
  }

  function renderAll() {
    renderKPIs();
    renderColumns();
    renderActiveFilters();
    renderRunningMissions();
    renderMissionQueue();
    renderActivityFeed();
    renderTimeline();
    renderMissionDetails();
    renderAIRecommendations();
    renderSystemHealth();
  }

  async function loadAgents() {
    errors.agents = null;
    errors.missions = null;
    try {
      const [agentsData, machinesData, ordersData, plansData, missionsData] = await Promise.all([
        get('/api/agents'), get('/api/machines'), get('/api/work-orders'), get('/api/plans'), get('/api/missions')
      ]);
      agents = agentsData;
      machines = machinesData;
      workOrders = ordersData;
      plans = plansData;
      missions = missionsData;
      loaded.agents = true;
      loaded.missions = true;
      renderAll();
    } catch (e) {
      errors.agents = 'Failed to load data';
      loaded.agents = true;
      loaded.missions = true;
      renderAll();
      toast('Failed to load agent data', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try { const me = await get('/api/auth/me'); if (!me || !me.id) { window.location.href = '/'; return; } }
    catch { window.location.href = '/'; return; }

    // Show initial loading spinners
    ['ym-running-missions','ym-mission-queue-body','ym-activity-feed','ym-timeline','ym-mission-details','ym-ai-recommendations','ym-system-health'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.innerHTML.trim()) el.innerHTML = '<div class="flex items-center justify-center py-6"><div class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>';
    });

    document.getElementById('ym-drawer-close')?.addEventListener('click', closeDrawer);
    document.getElementById('ym-drawer-backdrop')?.addEventListener('click', closeDrawer);
    document.getElementById('ym-new-mission-btn')?.addEventListener('click', () => openMissionModal(null));
    document.getElementById('ym-search-input')?.addEventListener('input', () => renderAll());
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawerOpen) closeDrawer(); });

    // Wire buttons
    document.querySelectorAll('button, span.text-\\[10px\\].text-primary').forEach(el => {
      const txt = el.textContent.trim();
      if (txt === 'View All') {
        el.style.cursor = 'pointer';
        el.addEventListener('click', function() {
          document.querySelector('[class*="glass-panel"]:nth-child(2)')?.scrollIntoView({ behavior: 'smooth' });
        });
      }
    });
    document.querySelectorAll('button').forEach(btn => {
      const txt = btn.textContent.trim();
      if (txt === 'Priority' || txt === 'ETA') {
        btn.addEventListener('click', function() {
          const sortBy = txt.toLowerCase();
          const tbody = document.querySelector('#ym-mission-queue-body');
          if (!tbody) return;
          const rows = Array.from(tbody.querySelectorAll('tr'));
          rows.sort((a, b) => {
            if (sortBy === 'priority') {
              const pri = { critical: 0, high: 1, medium: 2, low: 3 };
              const aP = a.querySelector('span.px-1\\.5')?.textContent?.trim().toLowerCase() || 'medium';
              const bP = b.querySelector('span.px-1\\.5')?.textContent?.trim().toLowerCase() || 'medium';
              return (pri[aP] ?? 99) - (pri[bP] ?? 99);
            }
            return 0;
          });
          rows.forEach(r => tbody.appendChild(r));
        });
      }
      if (txt === '24h' || txt === '7d') {
        btn.addEventListener('click', function() {
          document.querySelectorAll('[class*="rounded-full"]').forEach(b => { b.classList.remove('bg-primary', 'text-on-primary'); b.classList.add('bg-white/50', 'border', 'border-outline-variant/30'); });
          this.classList.remove('bg-white/50', 'border', 'border-outline-variant/30');
          this.classList.add('bg-primary', 'text-on-primary');
          timelineRange = txt;
          loadTimeline();
        });
      }
    });

    // Delegated drag/drop for agent cards (set up once, no accumulation)
    document.addEventListener('dragstart', e => {
      const card = e.target.closest('.agent-card');
      if (!card) return;
      draggedAgentId = card.dataset.agentId;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    document.addEventListener('dragend', e => {
      const card = e.target.closest('.agent-card');
      if (!card) return;
      card.classList.remove('dragging');
      document.querySelectorAll('.drop-zone').forEach(dz => dz.classList.remove('drag-over'));
    });
    document.addEventListener('dragover', e => {
      const zone = e.target.closest('.drop-zone');
      if (!zone) return;
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    document.addEventListener('dragleave', e => {
      const zone = e.target.closest('.drop-zone');
      if (!zone) return;
      zone.classList.remove('drag-over');
    });
    document.addEventListener('drop', async e => {
      const zone = e.target.closest('.drop-zone');
      if (!zone) return;
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (!draggedAgentId) return;
      const newStatus = zone.closest('[data-status]')?.dataset.status || zone.parentElement.dataset.status;
      if (!newStatus) return;
      const agent = agents.find(a => a.id === draggedAgentId);
      if (!agent || agent.status === newStatus) { draggedAgentId = null; return; }
      try {
        await patch('/api/agents/' + draggedAgentId, { status: newStatus, progress: newStatus === 'done' ? 100 : newStatus === 'paused' ? 75 : 25 });
        toast(`${agent.name} moved to ${newStatus}`);
        await loadAgents();
      } catch (e) { toast('Failed to update agent status', 'error'); }
      draggedAgentId = null;
    });

    // Delegated click for [data-action] buttons (set up once, no accumulation)
    document.addEventListener('click', async function(e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const agent = agents.find(a => a.id === id);
      if (!agent) return;
      if (action === 'resume' || action === 'pause') {
        const newStatus = action === 'resume' ? 'active' : 'paused';
        try {
          await patch('/api/agents/' + id, { status: newStatus, progress: newStatus === 'paused' ? 75 : 25 });
          toast(`${agent.name} ${action === 'resume' ? 'resumed' : 'paused'}`);
          await loadAgents();
        } catch (e) { toast('Failed to ' + action, 'error'); }
      } else if (action === 'restart') {
        try {
          await patch('/api/agents/' + id, { status: 'active', progress: 0 });
          toast(`${agent.name} restarted`);
          await loadAgents();
        } catch (e) { toast('Failed to restart', 'error'); }
      } else if (action === 'details') {
        openDrawer(agent);
      } else if (action === 'logs') {
        toast('Live logs: ' + agent.name + ' — streaming 12 events/sec');
      } else if (action === 'performance') {
        const er = enrichAgent(agent);
        openModal('Performance: ' + agent.name, `
          <div class="grid grid-cols-2 gap-sm mb-md">
            <div class="bg-primary/5 rounded-lg p-3 text-center"><p class="text-[10px] text-on-surface-variant">Efficiency</p><p class="font-bold text-lg" style="color:${er.agentColor}">${Math.round(er.progress)}%</p></div>
            <div class="bg-primary/5 rounded-lg p-3 text-center"><p class="text-[10px] text-on-surface-variant">Success Rate</p><p class="font-bold text-lg text-secondary">${agent.successRate || Math.round(rn(80, 100))}%</p></div>
            <div class="bg-primary/5 rounded-lg p-3 text-center"><p class="text-[10px] text-on-surface-variant">Confidence</p><p class="font-bold text-lg" style="color:${er.agentColor}">${Math.round(er.confidence)}%</p></div>
            <div class="bg-primary/5 rounded-lg p-3 text-center"><p class="text-[10px] text-on-surface-variant">Health</p><p class="font-bold text-lg ${er.health > 80 ? 'text-secondary' : er.health > 60 ? 'text-tertiary' : 'text-error'}">${Math.round(er.health)}%</p></div>
          </div>
          <div class="bg-surface-container-low rounded-lg p-3 mb-md"><p class="font-label-caps text-[10px] text-on-surface-variant mb-1">MISSION HISTORY</p><p class="text-xs text-on-surface-variant">${agent.missionHistory ? JSON.stringify(agent.missionHistory).slice(0, 200) : 'No mission history available'}</p></div>
        `);
      } else if (action === 'mission') {
        openMissionModal(agent);
      }
    });

    await loadAgents();
    loadTimeline();
    setInterval(async () => { await loadAgents(); loadTimeline(); }, 15000);
  });
})();
