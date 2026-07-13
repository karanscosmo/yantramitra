(function() {
  async function get(p) { const r = await fetch(p, { credentials: 'same-origin' }); if (!r.ok) throw new Error(p); return r.json(); }
  async function post(p, b) { const r = await fetch(p, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body:JSON.stringify(b) }); if (!r.ok) throw new Error(p); return r.json(); }
  async function patch(p, b) { const r = await fetch(p, { method:'PATCH', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body:JSON.stringify(b) }); if (!r.ok) throw new Error(p); return r.json(); }

  let agents = [], machines = [], workOrders = [], plans = [];
  let selectedAgent = null;
  let drawerOpen = false;
  let draggedAgentId = null;

  const plantNames = ['Pune Automotive','Chennai Electronics','Ahmedabad Process','Bengaluru Precision','Nagpur Logistics'];
  const machineNames = ['CNC-7740','EV-LOADER','CONVEYOR-B','HVAC-SYS','Turbine-7','RX-900 ARM','Pump P-102'];
  const agentTypes = ['Diagnostic','Planner','Inventory','Energy','Executive','Security','Firmware','HVAC','Grid'];
  const statuses = ['active','paused','done'];
  const typeColors = { Diagnostic:'#413fd6', Planner:'#774f00', Inventory:'#986500', Energy:'#006b5f', Executive:'#ba1a1a', Security:'#2e2f3e', Firmware:'#4948de', HVAC:'#007165', Grid:'#624000' };

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
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop ym-modal-bd';
    setTimeout(() => wrap.classList.add('open'), 10);
    wrap.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:14px">
        <h2 style="font:900 24px/1.2 Inter,system-ui,sans-serif;color:#191a28">${title}</h2>
        <button class="ym-close-modal" style="border:0;background:#eeecff;border-radius:999px;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined">close</span></button>
      </div><div>${body}</div>
    </div>`;
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.ym-close-modal')) { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 250); } });
    document.body.appendChild(wrap);
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

  function renderKPIs() {
    const active = agents.filter(a => a.status === 'active').length;
    const paused = agents.filter(a => a.status === 'paused').length;
    const done = agents.filter(a => a.status === 'done').length;
    const completedToday = agents.filter(a => a.status === 'done' && new Date(a.updatedAt || Date.now()).toISOString().slice(0,10) === new Date().toISOString().slice(0,10)).length;
    const avgProgress = agents.length ? Math.round(agents.reduce((s, a) => s + (a.progress || 0), 0) / agents.length) : 0;
    const avgSuccess = agents.length ? Math.round(agents.reduce((s, a) => s + (a.successRate || rn(80, 100)), 0) / agents.length) : 0;
    document.getElementById('ym-kpi-active').textContent = active;
    document.getElementById('ym-kpi-running').textContent = active;
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

    return `<article class="glass-panel rounded-xl p-md flex flex-col gap-sm agent-card" draggable="true" data-agent-id="${e.id}" data-status="${e.status}">
      <div class="flex items-start gap-3">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style="background:${e.agentColor}18;border:2px solid ${e.agentColor}40">
          <span class="material-symbols-outlined" style="color:${e.agentColor};font-variation-settings:'FILL' 1">smart_toy</span>
        </div>
        <div class="flex-grow min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <h3 class="font-semibold text-on-surface text-sm truncate">${e.name}</h3>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${priorityColors[e.priority] || 'text-on-surface-variant'} bg-surface-container-high">${e.priority.toUpperCase()}</span>
          </div>
          <p class="text-xs text-on-surface-variant truncate">${e.agentType} · ${e.plant} · ${e.machine}</p>
        </div>
        <div class="w-2 h-2 rounded-full shrink-0 ${statusDots[e.status] || 'bg-outline-variant'}"></div>
      </div>
      <p class="text-xs text-on-surface font-medium truncate">${e.mission || 'No active mission'}</p>
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
      const items = filtered.filter(a => (a.status || 'idle') === status);
      container.innerHTML = items.map(a => renderAgentCard(a)).join('');
      if (countEl) countEl.textContent = items.length;
    });

    document.querySelectorAll('.agent-card').forEach(card => {
      card.addEventListener('dragstart', function(e) {
        draggedAgentId = this.dataset.agentId;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        document.querySelectorAll('.drop-zone').forEach(dz => dz.classList.remove('drag-over'));
      });
    });

    document.querySelectorAll('.drop-zone').forEach(zone => {
      zone.addEventListener('dragover', function(e) { e.preventDefault(); this.classList.add('drag-over'); });
      zone.addEventListener('dragleave', function() { this.classList.remove('drag-over'); });
      zone.addEventListener('drop', async function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        if (!draggedAgentId) return;
        const newStatus = this.closest('[data-status]')?.dataset.status || this.parentElement.dataset.status;
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
    });

    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.stopPropagation();
        const action = this.dataset.action;
        const id = this.dataset.id;
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
          const e = enrichAgent(agent);
          openModal('Performance: ' + agent.name, `
            <div class="grid grid-cols-2 gap-sm mb-md">
              <div class="bg-primary/5 rounded-lg p-3 text-center"><p class="text-[10px] text-on-surface-variant">Efficiency</p><p class="font-bold text-lg" style="color:${e.agentColor}">${Math.round(e.progress)}%</p></div>
              <div class="bg-primary/5 rounded-lg p-3 text-center"><p class="text-[10px] text-on-surface-variant">Success Rate</p><p class="font-bold text-lg text-secondary">${agent.successRate || Math.round(rn(80, 100))}%</p></div>
              <div class="bg-primary/5 rounded-lg p-3 text-center"><p class="text-[10px] text-on-surface-variant">Confidence</p><p class="font-bold text-lg" style="color:${e.agentColor}">${Math.round(e.confidence)}%</p></div>
              <div class="bg-primary/5 rounded-lg p-3 text-center"><p class="text-[10px] text-on-surface-variant">Health</p><p class="font-bold text-lg ${e.health > 80 ? 'text-secondary' : e.health > 60 ? 'text-tertiary' : 'text-error'}">${Math.round(e.health)}%</p></div>
            </div>
            <div class="bg-surface-container-low rounded-lg p-3 mb-md"><p class="font-label-caps text-[10px] text-on-surface-variant mb-1">MISSION HISTORY</p><p class="text-xs text-on-surface-variant">${agent.missionHistory ? JSON.stringify(agent.missionHistory).slice(0, 200) : 'No mission history available'}</p></div>
          `);
        } else if (action === 'mission') {
          openMissionModal(agent);
        }
      });
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
        wrap.classList.remove('open');
        setTimeout(() => wrap.remove(), 250);
        await loadAgents();
      } catch (e) { toast('Failed to create mission', 'error'); }
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined text-sm">rocket_launch</span> LAUNCH MISSION';
    });
  }

  async function loadAgents() {
    try {
      const [agentsData, machinesData, ordersData, plansData] = await Promise.all([
        get('/api/agents'), get('/api/machines'), get('/api/work-orders'), get('/api/plans')
      ]);
      agents = agentsData;
      machines = machinesData;
      workOrders = ordersData;
      plans = plansData;
      renderKPIs();
      renderColumns();
    } catch (e) { toast('Failed to load agents', 'error'); }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try { const me = await get('/api/auth/me'); if (!me || !me.id) { window.location.href = '/'; return; } }
    catch { window.location.href = '/'; return; }
    document.getElementById('ym-drawer-close')?.addEventListener('click', closeDrawer);
    document.getElementById('ym-drawer-backdrop')?.addEventListener('click', closeDrawer);
    document.getElementById('ym-new-mission-btn')?.addEventListener('click', () => openMissionModal(null));
    document.getElementById('ym-search-input')?.addEventListener('input', () => renderColumns());
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawerOpen) closeDrawer(); });
    await loadAgents();
    setInterval(async () => { await loadAgents(); }, 30000);
  });
})();
