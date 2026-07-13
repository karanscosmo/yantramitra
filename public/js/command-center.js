(function() {
  'use strict';

  const state = {
    agents: [],
    plants: [],
    workOrders: [],
    summary: null,
    timelineEvents: [],
    missions: [],
    selectedMissionId: null,
    selectedMission: null,
    selectedPlantId: null,
    timelineRange: '24h',
    sortPriority: null,
    sortETA: null,
    filters: { plants: [], agents: [], statuses: [], priorities: [], timeRange: 'all' },
    activeFilterCount: 0,
    activityItems: [],
    completedMissions: [],
    autoScroll: true
  };

  const PLANT_COORDS = { pune: [33, 61], ahmedabad: [25, 42], chennai: [65, 78], bengaluru: [57, 76], nagpur: [47, 56] };
  const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  const STATUS_LABELS = { active: 'Active', paused: 'Paused', done: 'Completed', idle: 'Standby', error: 'Error' };
  const STATUS_COLORS = { active: 'text-secondary', paused: 'text-tertiary', done: 'text-on-surface-variant', idle: 'text-on-surface-variant', error: 'text-error' };
  const PRIORITY_STYLES = {
    critical: 'bg-error/10 text-error',
    high: 'bg-tertiary/10 text-tertiary',
    medium: 'bg-secondary/10 text-secondary',
    low: 'bg-on-surface-variant/10 text-on-surface-variant'
  };
  const INSIGHT_DATA = {
    operations: {
      title: 'Operations Summary',
      icon: 'insights',
      color: 'text-primary',
      affectedPlant: 'Pune, Chennai',
      affectedMachine: 'All monitored assets',
      confidence: '94%',
      recommendedAction: 'Continue monitoring; schedule quality review for Ahmedabad batch inputs',
      relatedMissions: 'Pune CNC Cell PM-01, Chennai Edge Security Audit',
      timeDetected: '2h ago',
      detail: 'Fleet-wide OEE improved 1.4% in the last 24h driven by Pune and Chennai facilities. Ahmedabad batch quality requires attention — raw material variance detected above threshold. Overall equipment effectiveness across all five plants remains above 82%.'
    },
    bottleneck: {
      title: 'Bottleneck',
      icon: 'warning',
      color: 'text-tertiary',
      affectedPlant: 'Pune',
      affectedMachine: 'CNC Cell PNA-01',
      confidence: '87%',
      recommendedAction: 'Dispatch maintenance team within 4 hours to inspect cavitation issue',
      relatedMissions: 'Pune CNC Cell PM-01 Diagnostics',
      timeDetected: '45m ago',
      detail: 'CNC Cell PNA-01 (Pune) cavitation may reduce throughput by 12% if unresolved within 4h. Vibration analysis suggests bearing wear in the spindle assembly.'
    },
    anomaly: {
      title: 'Anomaly Detected',
      icon: 'anomaly',
      color: 'text-secondary',
      affectedPlant: 'Chennai',
      affectedMachine: 'Conveyor L4',
      confidence: '92%',
      recommendedAction: 'Schedule inspection during next maintenance window',
      relatedMissions: 'Chennai Edge Security Audit',
      timeDetected: '1h ago',
      detail: 'Chennai Conveyor L4 vibration signature deviates 8.3% from baseline. Recommend inspection. Historical pattern suggests this precedes bearing failure within 72 hours.'
    },
    optimization: {
      title: 'Optimization Opportunity',
      icon: 'trending_up',
      color: 'text-primary',
      affectedPlant: 'Nagpur',
      affectedMachine: 'AGV Fleet',
      confidence: '89%',
      recommendedAction: 'Rebalance AGV route assignments to minimize deadhead travel',
      relatedMissions: 'Nagpur ASRS Inventory Sync',
      timeDetected: '3h ago',
      detail: 'Nagpur logistics slot utilization at 94%. Rebalancing AGV routes could yield 7% energy savings and improve throughput by 5%. Current route efficiency: 87%.'
    }
  };

  async function get(path) {
    const r = await fetch(path, { credentials: 'same-origin' });
    if (!r.ok) throw new Error(path + ' returned ' + r.status);
    return r.json();
  }

  async function post(path, body) {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
    if (!r.ok) throw new Error(path + ' returned ' + r.status);
    return r.json();
  }

  async function patch(path, body) {
    const r = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
    if (!r.ok) throw new Error(path + ' returned ' + r.status);
    return r.json();
  }

  async function del(path) {
    const r = await fetch(path, { method: 'DELETE', credentials: 'same-origin' });
    if (!r.ok) throw new Error(path + ' returned ' + r.status);
    return r.json();
  }

  function rn(min, max) { return Math.round((Math.random() * (max - min) + min) * 10) / 10; }

  function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function toast(msg, type) {
    const c = document.getElementById('ym-toast-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = 'rounded-full border px-5 py-3 text-sm font-bold shadow-xl pointer-events-auto transition-opacity duration-300 ' + (type === 'error' ? 'border-error/20 bg-error/95 text-white' : 'border-primary/20 bg-white/95 text-primary');
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2600);
  }

  function openModal(title, body, wide) {
    const existing = document.querySelector('.ym-modal-bd');
    if (existing) { existing.classList.remove('open'); setTimeout(() => existing.remove(), 250); }
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop ym-modal-bd';
    setTimeout(() => wrap.classList.add('open'), 10);
    wrap.innerHTML = '<div class="modal-card" style="' + (wide ? 'width:min(860px,calc(100vw - 32px))' : '') + '" role="dialog" aria-modal="true">' +
      '<div style="display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:14px">' +
      '<h2 style="font:900 24px/1.2 Inter,system-ui,sans-serif;color:#191a28">' + title + '</h2>' +
      '<button class="ym-close-modal" style="border:0;background:#eeecff;border-radius:999px;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center" aria-label="Close"><span class="material-symbols-outlined">close</span></button>' +
      '</div><div>' + body + '</div></div>';
    wrap.addEventListener('click', function(e) {
      if (e.target === wrap || e.target.closest('.ym-close-modal')) {
        wrap.classList.remove('open');
        setTimeout(function() { wrap.remove(); }, 250);
      }
    });
    document.body.appendChild(wrap);
    return wrap;
  }

  function formatTime(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
  }

  function formatETA(progress) {
    const base = [12, 45, 135, 240, 360, 30, 60, 180];
    const idx = Math.floor(progress / 14) % base.length;
    const mins = Math.round(base[idx] * (1 - progress / 100));
    if (mins < 60) return mins + ' min';
    return Math.round(mins / 60) + 'h ' + (mins % 60) + 'm';
  }

  function saveState() {
    try {
      sessionStorage.setItem('ym-dash-state', JSON.stringify({
        selectedMissionId: state.selectedMissionId,
        timelineRange: state.timelineRange,
        sortPriority: state.sortPriority,
        sortETA: state.sortETA,
        filters: state.filters
      }));
    } catch (e) {}
  }

  function restoreState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem('ym-dash-state'));
      if (saved) {
        state.selectedMissionId = saved.selectedMissionId || null;
        state.timelineRange = saved.timelineRange || '24h';
        state.sortPriority = saved.sortPriority || null;
        state.sortETA = saved.sortETA || null;
        state.filters = saved.filters || { plants: [], agents: [], statuses: [], priorities: [], timeRange: 'all' };
      }
    } catch (e) {}
  }

  async function checkAuth() {
    try {
      const me = await get('/api/auth/me');
      if (!me || !me.id) { window.location.href = '/'; return null; }
      return me;
    } catch { window.location.href = '/'; return null; }
  }

  async function loadAllData() {
    try {
      const [agentsData, plantsData, ordersData, summaryData, missionsData, timelineData] = await Promise.all([
        get('/api/agents').catch(() => []),
        get('/api/plants').catch(() => []),
        get('/api/work-orders').catch(() => []),
        get('/api/dashboard/summary').catch(() => ({})),
        get('/api/missions').catch(() => []),
        get('/api/timeline?range=' + state.timelineRange).catch(() => [])
      ]);
      state.agents = agentsData;
      state.plants = plantsData;
      state.workOrders = ordersData;
      state.summary = summaryData;
      state.missions = missionsData;
      state.timelineEvents = timelineData;
      const doneMissions = missionsData.filter(function(m) { return m.status === 'done'; });
      state.completedMissions = doneMissions.length ? doneMissions : Array.from({ length: 5 }, function(_, i) {
        return { id: 'sample-' + i, name: ['Pune CNC Cell PM-01 Diagnostics','Chennai Edge Security Audit','Bengaluru Metrology Calibration','Nagpur ASRS Inventory Sync','Ahmedabad Batch Quality Check'][i], mission: ['Pune CNC Cell PM-01 Diagnostics','Chennai Edge Security Audit','Bengaluru Metrology Calibration','Nagpur ASRS Inventory Sync','Ahmedabad Batch Quality Check'][i], status: 'done', progress: 100, type: ['Diagnostic','Security','Inspection','Logistics','QA'][i], color: '#006b5f', plant: ['Pune','Chennai','Bengaluru','Nagpur','Ahmedabad'][i], agentName: ['Diagnostic Agent','Sentinel','Inspection Agent','Logistics Agent','QA Agent'][i] };
      });
      state.activityItems = generateActivityFeed();
      renderAll();
    } catch (e) {
      console.error('Dashboard data load failed:', e);
      toast('Failed to load dashboard data', 'error');
    }
  }

  function generateActivityFeed() {
    const agents = state.agents.filter(function(a) { return a.mission; });
    if (agents.length >= 6) {
      return agents.slice(0, 8).map(function(a, i) {
        const minAgo = [2, 8, 18, 24, 35, 60, 90, 120][i] || (i + 1) * 15;
        return { id: a.id, agentName: a.name, text: a.mission, time: minAgo < 60 ? minAgo + 'm ago' : Math.round(minAgo / 60) + 'h ago', color: a.status === 'active' ? 'bg-secondary' : a.status === 'paused' ? 'bg-tertiary' : 'bg-primary' };
      });
    }
    return [
      { id: 'a1', agentName: 'Sentinel', text: 'Blocked unauthorized API call from 192.168.1.1 on Pune network', time: '2m ago', color: 'bg-secondary' },
      { id: 'a2', agentName: 'Diagnostic Agent', text: 'Completed analysis on CNC Cell PNA-01 — cavitation confirmed', time: '8m ago', color: 'bg-primary' },
      { id: 'a3', agentName: 'Planner Agent', text: 'Optimized Shift B schedule in Pune for material arrival at 14:00', time: '18m ago', color: 'bg-tertiary' },
      { id: 'a4', agentName: 'Sentinel', text: 'Completed security handshake with Chennai production network', time: '24m ago', color: 'bg-secondary' },
      { id: 'a5', agentName: 'Maintenance Agent', text: 'Flagged Conveyor L4 (Chennai) for predictive maintenance', time: '35m ago', color: 'bg-primary' },
      { id: 'a6', agentName: 'Inspection Agent', text: 'Completed metrology calibration at Bengaluru facility', time: '1h ago', color: 'bg-tertiary' },
      { id: 'a7', agentName: 'Energy Agent', text: 'Nagpur power consumption dropped 3.2% after load balancing', time: '2h ago', color: 'bg-secondary' },
      { id: 'a8', agentName: 'Logistics Agent', text: 'AGV route optimization completed — 7% energy savings projected', time: '3h ago', color: 'bg-primary' }
    ];
  }

  function enrichMission(m) {
    const at = m.type || 'Diagnostic';
    const iconMap = { Diagnostic: 'psychology', Planner: 'calendar_month', Inventory: 'inventory', Energy: 'bolt', Executive: 'shield', Security: 'security', Analytics: 'insights', Inspection: 'search', Logistics: 'local_shipping', Maintenance: 'build' };
    const eta = m.progress != null ? formatETA(m.progress) : randomFrom(['12 min','45 min','2h 15m','4h','6h','30 min']);
    return {
      ...m,
      icon: iconMap[at] || 'smart_toy',
      eta: eta,
      statusLabel: STATUS_LABELS[m.status] || m.status,
      statusColor: STATUS_COLORS[m.status] || 'text-on-surface-variant',
      priorityStyle: PRIORITY_STYLES[m.priority] || PRIORITY_STYLES.medium
    };
  }

  function renderAll() {
    renderKPIs();
    renderRunningMissions();
    renderLiveAgentStatus();
    renderMissionQueue();
    renderSelectedAgentDetails();
    renderTimeline();
    renderCompletedMissions();
    renderActivityFeed();
    renderFacilityNetwork();
    updateTimelineTabs();
    updateSortButtons();
    syncSelectedMission();
  }

  function renderKPIs() {
    const s = state.summary || {};
    const missions = state.missions;
    const activeCount = missions.filter(function(m) { return m.status === 'active'; }).length;
    const criticalCount = missions.filter(function(m) { return m.priority === 'critical'; }).length;
    const agentsOnline = state.agents.filter(function(a) { return a.status === 'active'; }).length;
    const totalAgents = Math.max(state.agents.length || 1, 1);
    const kpiCards = document.querySelectorAll('.col-span-12.grid-cols-4 > button');
    if (kpiCards.length >= 4) {
      kpiCards[0].querySelector('.font-kpi-numeric').textContent = (s.oee || s.oee === 0 ? s.oee + '%' : '84.2%');
      kpiCards[1].querySelector('.font-kpi-numeric').textContent = activeCount;
      var queuedSpan = kpiCards[1].querySelector('.text-on-surface-variant');
      if (queuedSpan) queuedSpan.textContent = missions.filter(function(m) { return m.status === 'idle' || m.status === 'paused'; }).length + ' queued';
      kpiCards[2].querySelector('.font-kpi-numeric').textContent = criticalCount;
      kpiCards[3].querySelector('.font-kpi-numeric').textContent = Math.round(agentsOnline / totalAgents * 100) + '%';
    }
  }

  function renderRunningMissions() {
    const host = document.getElementById('ym-top-facilities');
    if (!host) return;
    const active = state.missions.filter(function(m) { return m.status === 'active'; }).slice(0, 6);
    var images = { pune: '/assets/images/home-pune-automotive.jpg', ahmedabad: '/assets/images/home-ahmedabad-process.jpg', chennai: '/assets/images/home-chennai-electronics.jpg', bengaluru: '/assets/images/home-bengaluru-precision.jpg', nagpur: '/assets/images/home-nagpur-logistics.jpg' };
    if (!active.length) {
      host.innerHTML = '<div class="col-span-2 text-sm text-on-surface-variant py-4 text-center">No active missions</div>';
      return;
    }
    host.innerHTML = active.map(function(m) {
      var plantKey = Object.keys(images).find(function(k) { return String(m.plant).toLowerCase().includes(k); });
      var img = images[plantKey] || images.pune;
      var em = enrichMission(m);
      return '<article class="glass-panel rounded-xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer" data-mission-id="' + m.id + '">' +
        '<div class="h-28 relative">' +
        '<img class="w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-500" src="' + img + '" alt="' + m.plant + '"/>' +
        '<div class="absolute inset-0 bg-gradient-to-t from-surface to-transparent"></div>' +
        '<div class="absolute top-3 left-3 flex items-center gap-1.5"><span class="material-symbols-outlined text-sm" style="color:' + m.color + ';font-variation-settings:\'FILL\' 1">' + em.icon + '</span><span class="text-[10px] font-bold" style="color:' + m.color + '">' + m.type + '</span></div>' +
        '<div class="absolute top-3 right-3"><span class="px-1.5 py-0.5 rounded text-[8px] font-bold ' + m.priorityStyle + '">' + (m.priority || 'medium').toUpperCase() + '</span></div>' +
        '</div>' +
        '<div class="p-3 pt-2"><h3 class="font-bold text-sm leading-tight mb-0.5">' + (m.mission || m.name) + '</h3>' +
        '<p class="text-[10px] text-on-surface-variant mb-2">' + m.plant + ' · ' + em.eta + ' ETA</p>' +
        '<div class="w-full h-1.5 bg-surface-container rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:' + m.progress + '%;background:' + m.color + '"></div></div>' +
        '<div class="flex justify-between mt-1"><span class="text-[9px] font-bold ' + em.statusColor + '">' + em.statusLabel + '</span><span class="text-[9px] text-on-surface-variant">' + m.progress + '%</span></div>' +
        '</div></article>';
    }).join('');
    host.querySelectorAll('[data-mission-id]').forEach(function(el) {
      el.addEventListener('click', function() {
        selectMission(this.dataset.missionId);
      });
    });
  }

  function renderLiveAgentStatus() {
    var host = document.getElementById('ym-agent-activity');
    if (!host) return;
    var agents = state.agents.filter(function(a) { return a.mission; }).slice(0, 4);
    if (!agents.length) {
      var summary = state.summary || {};
      var alarms = summary.recentAlarms || [];
      var plants = state.plants;
      var firstAlarm = alarms[0];
      var firstPlant = plants[0];
      var items = [
        { icon: 'psychology', color: 'bg-secondary-container text-on-secondary-container', agent: 'Diagnostic Agent', text: firstAlarm ? 'Analyzing ' + (firstAlarm.machine?.name || 'machine') + ' at ' + (firstPlant?.name || 'plant') : 'All monitored machines inside normal diagnostic review', time: 'Just now' },
        { icon: 'security', color: 'bg-primary-container text-on-primary-container', agent: 'Sentinel', text: 'Security handshake completed with edge network. All protocols green.', time: '2m ago' },
        { icon: 'event_note', color: 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant', agent: 'Planner Agent', text: state.workOrders[0] ? 'Tracking ' + state.workOrders[0].title : 'No urgent work order backlog', time: '12m ago' },
        { icon: 'precision_manufacturing', color: 'bg-secondary-container text-on-secondary-container', agent: 'Maintenance Agent', text: 'Predictive maintenance queue refreshed for monitored facilities.', time: '24m ago' }
      ];
      host.innerHTML = items.map(function(item) {
        return '<button type="button" data-agent-context="' + encodeURIComponent(item.agent) + '" class="w-full text-left p-sm rounded-xl bg-white/40 border border-outline-variant/20 flex gap-sm hover:bg-white/60 transition-colors cursor-pointer">' +
          '<div class="w-10 h-10 rounded-full ' + item.color + ' flex items-center justify-center flex-shrink-0"><span class="material-symbols-outlined" style="font-variation-settings:\'FILL\' 1">' + item.icon + '</span></div>' +
          '<div><p class="text-xs font-bold text-on-surface">' + item.agent + '</p><p class="text-xs text-on-surface-variant leading-relaxed">' + item.text + '</p><p class="text-[10px] text-primary mt-xs font-medium uppercase tracking-wider">' + item.time + '</p></div></button>';
      }).join('');
      host.querySelectorAll('[data-agent-context]').forEach(function(btn) {
        btn.addEventListener('click', function() { window.location.href = '/agents?focus=' + btn.dataset.agentContext; });
      });
      return;
    }
    host.innerHTML = agents.slice(0, 4).map(function(a) {
      var color = a.status === 'active' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant';
      var icon = a.type === 'Diagnostic' ? 'psychology' : a.type === 'Security' ? 'security' : 'smart_toy';
      return '<button type="button" class="w-full text-left p-sm rounded-xl bg-white/40 border border-outline-variant/20 flex gap-sm hover:bg-white/60 transition-colors cursor-pointer" data-mission-id="' + a.id + '">' +
        '<div class="w-10 h-10 rounded-full ' + color + ' flex items-center justify-center flex-shrink-0"><span class="material-symbols-outlined" style="font-variation-settings:\'FILL\' 1">' + icon + '</span></div>' +
        '<div><p class="text-xs font-bold text-on-surface">' + a.name + '</p><p class="text-xs text-on-surface-variant leading-relaxed">' + (a.mission || 'No active mission').slice(0, 60) + '</p><p class="text-[10px] text-primary mt-xs font-medium uppercase tracking-wider">' + formatTime(a.updatedAt) + '</p></div></button>';
    }).join('');
    host.querySelectorAll('[data-mission-id]').forEach(function(el) {
      el.addEventListener('click', function() { selectMission(this.dataset.missionId); });
    });
  }

  function renderMissionQueue() {
    var tbody = document.getElementById('ym-mission-queue-body');
    if (!tbody) return;
    var missions = state.missions.filter(function(m) { return m.status !== 'done'; });
    var f = state.filters;
    if (f.plants.length) missions = missions.filter(function(m) { return f.plants.includes(m.plant); });
    if (f.agents.length) missions = missions.filter(function(m) { return f.agents.includes(m.name); });
    if (f.statuses.length) missions = missions.filter(function(m) { return f.statuses.includes(m.status); });
    if (f.priorities.length) missions = missions.filter(function(m) { return f.priorities.includes(m.priority); });
    if (state.sortPriority === 'asc') missions.sort(function(a, b) { return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; });
    else if (state.sortPriority === 'desc') missions.sort(function(a, b) { return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]; });
    if (state.sortETA === 'asc') missions.sort(function(a, b) { return (a.progress || 0) - (b.progress || 0); });
    else if (state.sortETA === 'desc') missions.sort(function(a, b) { return (b.progress || 0) - (a.progress || 0); });
    var countSpan = document.querySelector('.col-span-8 .glass-panel .rounded-full');
    if (countSpan && countSpan.parentElement) {
      var header = countSpan.closest('.flex.items-center');
      if (header) {
        var badge = header.querySelector('.rounded-full');
        if (badge) badge.textContent = missions.length + ' queued';
      }
    }
    if (!missions.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-sm text-on-surface-variant">No missions in queue</td></tr>';
      return;
    }
    tbody.innerHTML = missions.map(function(m) {
      var em = enrichMission(m);
      var dotColor = m.status === 'active' ? 'bg-secondary' : m.status === 'paused' ? 'bg-tertiary' : 'bg-on-surface-variant';
      var isSelected = state.selectedMissionId === m.id;
      return '<tr class="border-b border-outline-variant/10 hover:bg-primary/5 transition-colors cursor-pointer mission-row' + (isSelected ? ' selected' : '') + '" data-mission-id="' + m.id + '" tabindex="0" role="button" aria-selected="' + isSelected + '">' +
        '<td class="py-2.5 pl-1"><div class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full ' + dotColor + '"></span><span class="font-medium text-xs">' + (m.mission || m.name) + '</span></div></td>' +
        '<td class="py-2.5"><span class="px-1.5 py-0.5 rounded ' + em.priorityStyle + ' text-[9px] font-bold">' + (m.priority || 'medium').toUpperCase() + '</span></td>' +
        '<td class="py-2.5"><div class="flex items-center gap-1.5"><span class="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold" style="background:' + m.color + '20;color:' + m.color + '">' + (m.type ? m.type.slice(0, 2) : 'AG').toUpperCase() + '</span><span class="text-[10px]">' + m.name + '</span></div></td>' +
        '<td class="py-2.5"><span class="font-bold text-[10px] ' + em.statusColor + '">' + em.statusLabel + '</span></td>' +
        '<td class="py-2.5 text-right pr-1 text-on-surface-variant text-[10px]">' + em.eta + '</td></tr>';
    }).join('');
    tbody.querySelectorAll('[data-mission-id]').forEach(function(el) {
      el.addEventListener('click', function() { selectMission(this.dataset.missionId); });
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectMission(this.dataset.missionId); }
      });
    });
  }

  function renderSelectedAgentDetails() {
    var host = document.getElementById('ym-selected-agent-details');
    if (!host) return;
    var mission = state.selectedMission;
    if (!mission) {
      host.querySelector('#ym-agent-name').textContent = 'No Agent Selected';
      host.querySelector('#ym-agent-status').textContent = '—';
      host.querySelector('#ym-agent-uptime').textContent = '—';
      host.querySelector('#ym-agent-tasks').textContent = '—';
      host.querySelector('#ym-agent-tasks-bar').style.width = '0%';
      host.querySelector('#ym-agent-resolution').textContent = '—';
      host.querySelector('#ym-agent-resolution-bar').style.width = '0%';
      host.querySelector('#ym-agent-response').textContent = '—';
      host.querySelector('#ym-agent-response-bar').style.width = '0%';
      host.querySelector('#ym-agent-models').textContent = '—';
      host.querySelector('#ym-agent-current-task').textContent = 'Select a mission to view agent details';
      return;
    }
    var em = enrichMission(mission);
    var agentObj = state.agents.find(function(a) { return a.id === mission.id; });
    var agentName = mission.name || (agentObj ? agentObj.name : 'Unknown Agent');
    var status = mission.status || 'active';
    var uptime = agentObj ? rn(97, 99.9) + '%' : randomFrom(['99.7%', '98.2%', '99.1%']);
    var activeTasks = Math.max(1, Math.round(mission.progress / 30) + 1);
    var resolution = agentObj ? Math.round(rn(82, 99)) + '%' : randomFrom(['94%', '88%', '96%']);
    var responseTime = randomFrom(['1.2s', '0.8s', '2.1s', '0.5s']);
    var modelsLoaded = Math.floor(rn(20, 40));
    var currentTask = mission.mission || 'Analyzing ' + mission.plant + ' operations';
    host.querySelector('#ym-agent-name').textContent = agentName;
    host.querySelector('#ym-agent-status').textContent = status.charAt(0).toUpperCase() + status.slice(1);
    host.querySelector('#ym-agent-uptime').textContent = uptime;
    host.querySelector('#ym-agent-tasks').textContent = activeTasks;
    host.querySelector('#ym-agent-tasks-bar').style.width = Math.min(mission.progress + 10, 100) + '%';
    host.querySelector('#ym-agent-resolution').textContent = resolution;
    host.querySelector('#ym-agent-resolution-bar').style.width = resolution;
    host.querySelector('#ym-agent-response').textContent = responseTime;
    host.querySelector('#ym-agent-response-bar').style.width = Math.min(100 - parseInt(responseTime) * 10 + 80, 100) + '%';
    host.querySelector('#ym-agent-models').textContent = modelsLoaded;
    host.querySelector('#ym-agent-current-task').textContent = currentTask;
  }

  function renderTimeline() {
    var host = document.querySelector('.col-span-6 .glass-panel .flex-1');
    if (!host) return;
    var events = state.timelineEvents;
    if (state.selectedMissionId) {
      events = events.filter(function(e) { return e.agentName === state.selectedMission?.name || e.id.includes(state.selectedMissionId); });
    }
    if (!events.length) {
      var agents = state.agents.filter(function(a) { return a.mission; });
      if (agents.length) {
        events = agents.map(function(a) {
          var statusLabels = { active: 'started', paused: 'paused', done: 'completed', idle: 'idle' };
          return {
            id: a.id + '-tl', type: 'mission',
            title: a.mission || 'Mission',
            description: a.name + ' ' + (statusLabels[a.status] || 'updated') + ' — ' + (a.mission || 'No mission'),
            timestamp: a.updatedAt,
            agentName: a.name,
            color: a.status === 'done' ? '#006b5f' : a.status === 'paused' ? '#774f00' : '#413fd6'
          };
        }).sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
      }
    }
    if (!events.length) {
      host.innerHTML = '<div class="text-sm text-on-surface-variant py-6 text-center">No timeline events for selected range</div>';
      return;
    }
    var maxEvents = state.timelineRange === '24h' ? 5 : state.timelineRange === '7d' ? 8 : 10;
    events = events.slice(0, maxEvents);
    host.innerHTML = events.map(function(e, i) {
      var isLast = i === events.length - 1;
      var border = isLast ? '' : ' border-l-2';
      var borderColor = e.color === '#006b5f' ? 'border-secondary/30' : e.color === '#774f00' ? 'border-tertiary/30' : i % 2 === 0 ? 'border-primary/30' : 'border-secondary/30';
      var timeStr = formatTime(e.timestamp);
      return '<div class="relative pl-6 pb-2' + border + ' ' + borderColor + '">' +
        '<div class="absolute left-[-7px] top-0 w-3 h-3 rounded-full" style="background:' + e.color + '"></div>' +
        '<p class="text-[10px] font-bold" style="color:' + e.color + '">' + timeStr + '</p>' +
        '<p class="text-xs font-medium">' + e.description + '</p></div>';
    }).join('');
  }

  function renderCompletedMissions() {
    var host = document.getElementById('ym-completed-missions');
    if (!host) return;
    var missions = state.completedMissions;
    if (!missions.length) {
      host.innerHTML = '<div class="text-sm text-on-surface-variant py-4 text-center">No completed missions</div>';
      return;
    }
    var badge = document.querySelector('.col-span-6 .glass-panel .rounded-full');
    if (badge && badge.parentElement) {
      var hdr = badge.closest('.flex.items-center');
      if (hdr) {
        var b2 = hdr.querySelector('.rounded-full');
        if (b2) b2.textContent = missions.length + ' today';
      }
    }
    host.innerHTML = missions.map(function(m, i) {
      var agentName = m.agentName || m.type || 'Agent';
      var timeStr = m.updatedAt ? formatTime(m.updatedAt) : randomFrom(['8m ago', '24m ago', '1h ago', '2h ago', '3h ago']);
      return '<div class="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/40 transition-colors cursor-pointer" data-completed-mission="' + i + '" tabindex="0" role="button">' +
        '<div class="flex items-center gap-2.5"><span class="material-symbols-outlined text-sm text-secondary">check_circle</span>' +
        '<div><p class="text-xs font-medium">' + (m.mission || m.name) + '</p><p class="text-[9px] text-on-surface-variant">Completed by ' + agentName + ' · ' + timeStr + '</p></div></div>' +
        '<span class="text-[9px] text-on-surface-variant">' + m.progress + '%</span></div>';
    }).join('');
    host.querySelectorAll('[data-completed-mission]').forEach(function(el) {
      el.addEventListener('click', function() {
        var idx = parseInt(this.dataset.completedMission);
        var m = state.completedMissions[idx];
        if (m) openMissionDetailModal(m);
      });
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var idx = parseInt(this.dataset.completedMission);
          var m = state.completedMissions[idx];
          if (m) openMissionDetailModal(m);
        }
      });
    });
  }

  function renderActivityFeed() {
    var host = document.getElementById('ym-activity-feed');
    if (!host) return;
    var items = state.activityItems;
    host.innerHTML = items.map(function(item) {
      return '<div class="flex items-start gap-2.5 py-1.5 cursor-pointer hover:bg-white/40 rounded-lg px-2 -mx-2 transition-colors" data-activity-id="' + item.id + '" tabindex="0" role="button">' +
        '<span class="w-1.5 h-1.5 rounded-full ' + item.color + ' mt-1.5 shrink-0"></span>' +
        '<div><p class="text-xs"><span class="font-bold">' + item.agentName + '</span> ' + item.text + '</p><p class="text-[9px] text-on-surface-variant">' + item.time + '</p></div></div>';
    }).join('');
    host.querySelectorAll('[data-activity-id]').forEach(function(el) {
      el.addEventListener('click', function() {
        var id = this.dataset.activityId;
        var mission = state.missions.find(function(m) { return m.id === id || m.name === id; });
        if (mission) { selectMission(mission.id); toast('Navigated to mission: ' + (mission.mission || mission.name)); }
        else window.location.href = '/agents';
      });
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.click(); }
      });
    });
  }

  function renderFacilityNetwork() {
    var host = document.getElementById('ym-dashboard-map');
    if (!host) return;
    host.querySelectorAll('.ym-network-pin').forEach(function(n) { n.remove(); });
    var plants = state.plants;
    if (!plants.length) {
      var fallbackPlants = ['Pune', 'Ahmedabad', 'Chennai', 'Bengaluru', 'Nagpur'];
      fallbackPlants.forEach(function(name) {
        var key = name.toLowerCase();
        var coords = PLANT_COORDS[key];
        if (!coords) return;
        var pin = document.createElement('button');
        pin.className = 'ym-network-pin absolute w-3 h-3 rounded-full bg-primary shadow-[0_0_12px_rgba(65,63,214,.9)] network-node-pulse';
        pin.style.left = coords[0] + '%';
        pin.style.top = coords[1] + '%';
        pin.title = name;
        pin.setAttribute('aria-label', 'Open ' + name + ' details');
        pin.addEventListener('click', function(e) {
          e.stopPropagation();
          state.selectedPlantId = name;
          openPlantDetailModal(name);
        });
        host.appendChild(pin);
      });
      return;
    }
    plants.forEach(function(plant) {
      var key = Object.keys(PLANT_COORDS).find(function(k) { return String(plant.name).toLowerCase().includes(k); });
      if (!key) return;
      var coords = PLANT_COORDS[key];
      if (!coords) return;
      var pin = document.createElement('button');
      pin.className = 'ym-network-pin absolute w-3 h-3 rounded-full bg-primary shadow-[0_0_12px_rgba(65,63,214,.9)] network-node-pulse';
      pin.style.left = coords[0] + '%';
      pin.style.top = coords[1] + '%';
      pin.title = plant.name + ' · ' + (plant.oee || 'N/A') + '% OEE';
      pin.setAttribute('aria-label', 'Open ' + plant.name + ' details');
      pin.addEventListener('click', function(e) {
        e.stopPropagation();
        state.selectedPlantId = plant.id;
        openPlantDetailModal(plant);
      });
      host.appendChild(pin);
    });
  }

  function updateTimelineTabs() {
    document.querySelectorAll('.ym-region-tab').forEach(function(tab) {
      var range = tab.dataset.timeline;
      if (range === state.timelineRange) {
        tab.className = 'ym-region-tab px-2 py-1 bg-primary text-on-primary rounded-full text-[9px] font-bold';
      } else {
        tab.className = 'ym-region-tab px-2 py-1 bg-white/50 border border-outline-variant/30 rounded-full text-[9px] font-bold';
      }
    });
  }

  function updateSortButtons() {
    var pBtn = document.getElementById('ym-sort-priority');
    var eBtn = document.getElementById('ym-sort-eta');
    if (pBtn) {
      var icon = pBtn.querySelector('.material-symbols-outlined');
      if (state.sortPriority === 'asc') { icon.textContent = 'sort_by_alpha'; } else if (state.sortPriority === 'desc') { icon.textContent = 'sort_by_alpha'; } else { icon.textContent = 'sort'; }
    }
    if (eBtn) {
      var icon2 = eBtn.querySelector('.material-symbols-outlined');
      if (state.sortETA === 'asc') { icon2.textContent = 'schedule'; } else if (state.sortETA === 'desc') { icon2.textContent = 'schedule'; } else { icon2.textContent = 'schedule'; }
    }
  }

  function syncSelectedMission() {
    if (state.selectedMissionId) {
      var found = state.missions.find(function(m) { return m.id === state.selectedMissionId; });
      if (found) {
        state.selectedMission = found;
        renderSelectedAgentDetails();
        renderTimeline();
      }
      document.querySelectorAll('.mission-row').forEach(function(row) {
        row.classList.toggle('selected', row.dataset.missionId === state.selectedMissionId);
        row.setAttribute('aria-selected', row.dataset.missionId === state.selectedMissionId ? 'true' : 'false');
      });
    }
  }

  function selectMission(id) {
    if (!id) return;
    state.selectedMissionId = id;
    var mission = state.missions.find(function(m) { return m.id === id; });
    if (mission) state.selectedMission = mission;
    saveState();
    renderMissionQueue();
    renderSelectedAgentDetails();
    renderTimeline();
    state.timelineEvents = []; // Force re-fetch next time
    toast('Selected: ' + ((mission && mission.mission) || id));
  }

  function openCreateMissionModal() {
    var plantOpts = state.plants.length ? state.plants.map(function(p) { return '<option value="' + p.name + '">' + p.name + '</option>'; }).join('') : '<option value="Pune">Pune</option><option value="Chennai">Chennai</option><option value="Bengaluru">Bengaluru</option>';
    var agentOpts = state.agents.map(function(a) { return '<option value="' + a.id + '">' + a.name + ' (' + (a.type || 'General') + ')</option>'; }).join('');
    var missionTypes = ['Diagnostic Scan','Predictive Analysis','Energy Optimization','Inventory Audit','Security Patrol','Compliance Check','Performance Tuning','Root Cause Analysis'];
    var body = '<form id="ym-dash-mission-form" class="space-y-3">' +
      '<div class="grid grid-cols-2 gap-3">' +
      '<div><label class="font-label-caps text-[10px] text-on-surface-variant block mb-1">PLANT</label><select id="ym-dash-mission-plant" class="w-full border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-white/80">' + plantOpts + '</select></div>' +
      '<div><label class="font-label-caps text-[10px] text-on-surface-variant block mb-1">MISSION TYPE</label><select id="ym-dash-mission-type" class="w-full border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-white/80">' + missionTypes.map(function(t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="grid grid-cols-2 gap-3">' +
      '<div><label class="font-label-caps text-[10px] text-on-surface-variant block mb-1">PRIORITY</label><select id="ym-dash-mission-priority" class="w-full border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-white/80"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>' +
      '<div><label class="font-label-caps text-[10px] text-on-surface-variant block mb-1">ASSIGNED AGENT</label><select id="ym-dash-mission-agent" class="w-full border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-white/80"><option value="">Create New Agent</option>' + agentOpts + '</select></div></div>' +
      '<div><label class="font-label-caps text-[10px] text-on-surface-variant block mb-1">DESCRIPTION</label><textarea id="ym-dash-mission-desc" class="w-full border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-white/80" rows="2" placeholder="Describe the mission objective..."></textarea></div>' +
      '<button type="submit" class="w-full bg-primary text-white py-3 rounded-full font-label-caps text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-primary/90 transition-colors"><span class="material-symbols-outlined text-sm">rocket_launch</span> LAUNCH MISSION</button></form>';
    var wrap = openModal('Create New Mission', body);
    wrap.querySelector('#ym-dash-mission-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      var btn = this.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> LAUNCHING...';
      var agentId = document.getElementById('ym-dash-mission-agent').value;
      var missionType = document.getElementById('ym-dash-mission-type').value;
      var plant = document.getElementById('ym-dash-mission-plant').value;
      var desc = document.getElementById('ym-dash-mission-desc').value.trim() || missionType + ' for ' + plant;
      try {
        if (agentId) {
          var agent = state.agents.find(function(a) { return a.id === agentId; });
          await patch('/api/agents/' + agentId, { mission: desc + ' @ ' + plant + ' (' + missionType + ')', status: 'active', progress: 0 });
          toast('Mission assigned to ' + (agent ? agent.name : 'agent'));
        } else {
          var name = missionType.replace(/\s+/g, '') + '-' + Math.floor(Math.random() * 100);
          var agentTypeSelect = document.getElementById('ym-dash-mission-agent-type');
          var at = agentTypeSelect ? agentTypeSelect.value : 'Diagnostic';
          await post('/api/agents', { name: name, type: at, mission: desc, model: at + '-A1', status: 'active', progress: 0 });
          toast('New agent created: ' + name);
        }
        wrap.classList.remove('open');
        setTimeout(function() { wrap.remove(); }, 250);
        await loadAllData();
      } catch (err) { toast('Failed to create mission: ' + err.message, 'error'); }
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined text-sm">rocket_launch</span> LAUNCH MISSION';
    });
  }

  function openFilterSheet() {
    var sheet = document.getElementById('ym-filter-sheet');
    var backdrop = document.getElementById('ym-filter-backdrop');
    if (!sheet || !backdrop) return;
    var f = state.filters;
    var plantOpts = state.plants.length ? state.plants : [{ name: 'Pune' }, { name: 'Ahmedabad' }, { name: 'Chennai' }, { name: 'Bengaluru' }, { name: 'Nagpur' }];
    var agentOpts = state.agents.length ? state.agents : [{ name: 'Diagnostic Agent' }, { name: 'Sentinel' }, { name: 'Planner Agent' }, { name: 'Inspection Agent' }];
    document.getElementById('ym-filter-plants').innerHTML = plantOpts.map(function(p) {
      var checked = !f.plants.length || f.plants.includes(p.name) ? 'checked' : '';
      return '<label class="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" value="' + p.name + '" ' + checked + ' class="rounded border-outline-variant/50 text-primary focus:ring-primary/30"/>' + p.name + '</label>';
    }).join('');
    document.getElementById('ym-filter-agents').innerHTML = agentOpts.map(function(a) {
      var checked = !f.agents.length || f.agents.includes(a.name) ? 'checked' : '';
      return '<label class="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" value="' + a.name + '" ' + checked + ' class="rounded border-outline-variant/50 text-primary focus:ring-primary/30"/>' + a.name + '</label>';
    }).join('');
    document.getElementById('ym-filter-statuses').innerHTML = ['active', 'paused', 'done', 'idle'].map(function(s) {
      var checked = !f.statuses.length || f.statuses.includes(s) ? 'checked' : '';
      return '<label class="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" value="' + s + '" ' + checked + ' class="rounded border-outline-variant/50 text-primary focus:ring-primary/30"/>' + s.charAt(0).toUpperCase() + s.slice(1) + '</label>';
    }).join('');
    document.getElementById('ym-filter-priorities').innerHTML = ['critical', 'high', 'medium', 'low'].map(function(p) {
      var checked = !f.priorities.length || f.priorities.includes(p) ? 'checked' : '';
      return '<label class="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" value="' + p + '" ' + checked + ' class="rounded border-outline-variant/50 text-primary focus:ring-primary/30"/>' + p.charAt(0).toUpperCase() + p.slice(1) + '</label>';
    }).join('');
    document.getElementById('ym-filter-time').value = f.timeRange || 'all';
    sheet.classList.add('open');
    backdrop.classList.add('open');
  }

  function closeFilterSheet() {
    document.getElementById('ym-filter-sheet')?.classList.remove('open');
    document.getElementById('ym-filter-backdrop')?.classList.remove('open');
  }

  function applyFilters() {
    var f = state.filters;
    f.plants = Array.from(document.querySelectorAll('#ym-filter-plants input:checked')).map(function(cb) { return cb.value; });
    f.agents = Array.from(document.querySelectorAll('#ym-filter-agents input:checked')).map(function(cb) { return cb.value; });
    f.statuses = Array.from(document.querySelectorAll('#ym-filter-statuses input:checked')).map(function(cb) { return cb.value; });
    f.priorities = Array.from(document.querySelectorAll('#ym-filter-priorities input:checked')).map(function(cb) { return cb.value; });
    f.timeRange = document.getElementById('ym-filter-time').value;
    var totalPlants = state.plants.length || 5;
    var totalAgents = state.agents.length || 4;
    state.activeFilterCount = [f.plants.length < totalPlants && f.plants.length > 0, f.agents.length < totalAgents && f.agents.length > 0, f.statuses.length < 4 && f.statuses.length > 0, f.priorities.length < 4 && f.priorities.length > 0].filter(Boolean).length;
    var filterBtn = document.getElementById('ym-filter-btn');
    if (filterBtn) {
      var existing = filterBtn.querySelector('.filter-count');
      if (existing) existing.remove();
      if (state.activeFilterCount > 0) {
        var badge = document.createElement('span');
        badge.className = 'filter-count ml-1 px-1 py-0.5 bg-primary text-white rounded-full text-[8px] font-bold';
        badge.textContent = state.activeFilterCount;
        filterBtn.appendChild(badge);
      }
    }
    closeFilterSheet();
    saveState();
    renderMissionQueue();
    toast('Filters applied');
  }

  function resetFilters() {
    state.filters = { plants: [], agents: [], statuses: [], priorities: [], timeRange: 'all' };
    state.activeFilterCount = 0;
    closeFilterSheet();
    saveState();
    renderMissionQueue();
    toast('Filters reset');
  }

  async function openReportModal() {
    var wrap = openModal('Generating Report...', '<div class="text-center py-8"><span class="material-symbols-outlined animate-spin text-4xl text-primary">sync</span><p class="mt-2 text-sm text-on-surface-variant">Compiling operational data...</p></div>', true);
    try {
      var report = await post('/api/report/generate', {});
      var body = '<div class="space-y-3">' +
        '<div class="grid grid-cols-2 gap-3"><div class="bg-primary/5 rounded-xl p-3 text-center"><p class="text-[10px] text-on-surface-variant">Total Missions</p><p class="font-bold text-2xl text-primary">' + report.missionSummary.total + '</p></div>' +
        '<div class="bg-primary/5 rounded-xl p-3 text-center"><p class="text-[10px] text-on-surface-variant">Active</p><p class="font-bold text-2xl text-secondary">' + report.missionSummary.active + '</p></div></div>' +
        '<div class="bg-tertiary/5 rounded-xl p-3 border border-tertiary/20"><p class="font-bold text-xs mb-1">Detected Bottlenecks</p><ul class="text-[10px] text-on-surface-variant space-y-0.5">' + report.detectedBottlenecks.map(function(b) { return '<li>• ' + b.area + ': ' + b.impact + '</li>'; }).join('') + '</ul></div>' +
        '<div class="bg-secondary/5 rounded-xl p-3 border border-secondary/20"><p class="font-bold text-xs mb-1">Recommendations</p><ul class="text-[10px] text-on-surface-variant space-y-0.5">' + report.recommendations.map(function(r) { return '<li>• ' + r + '</li>'; }).join('') + '</ul></div>' +
        '<div class="flex gap-2"><button id="ym-export-pdf" class="flex-1 py-2.5 bg-primary text-on-primary rounded-full text-xs font-bold cursor-pointer hover:bg-primary/90 transition-colors">Export PDF</button>' +
        '<button id="ym-export-csv" class="flex-1 py-2.5 border border-primary/30 text-primary rounded-full text-xs font-bold cursor-pointer hover:bg-primary/5 transition-colors">Export CSV</button>' +
        '<button id="ym-export-json" class="flex-1 py-2.5 border border-primary/30 text-primary rounded-full text-xs font-bold cursor-pointer hover:bg-primary/5 transition-colors">Export JSON</button></div>' +
        '<p class="text-[9px] text-on-surface-variant text-center">Generated: ' + report.timestamp + '</p></div>';
      wrap.innerHTML = '<div class="modal-card" style="width:min(860px,calc(100vw - 32px))" role="dialog" aria-modal="true">' +
        '<div style="display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:14px">' +
        '<h2 style="font:900 24px/1.2 Inter,system-ui,sans-serif;color:#191a28">Operations Report</h2>' +
        '<button class="ym-close-modal" style="border:0;background:#eeecff;border-radius:999px;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center" aria-label="Close"><span class="material-symbols-outlined">close</span></button></div>' +
        '<div>' + body + '</div></div>';
      wrap.querySelector('#ym-export-pdf')?.addEventListener('click', function() {
        var content = 'YANTRAMITRA OPERATIONS REPORT\n' + report.timestamp + '\n\nMISSION SUMMARY\nTotal: ' + report.missionSummary.total + ' | Active: ' + report.missionSummary.active + ' | Completed: ' + report.missionSummary.completed + '\n\nBOTTLENECKS\n' + report.detectedBottlenecks.map(function(b) { return '- ' + b.area + ': ' + b.impact; }).join('\n') + '\n\nRECOMMENDATIONS\n' + report.recommendations.map(function(r) { return '- ' + r; }).join('\n') + '\n\nKPIs\nOEE: ' + report.kpis.oee + '% | Critical: ' + report.kpis.critical + ' | Agent Availability: ' + report.kpis.agentAvailability;
        var blob = new Blob([content], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'yantramitra-report-' + Date.now() + '.txt';
        a.click();
        URL.revokeObjectURL(url);
        toast('Report exported as TXT');
      });
      wrap.querySelector('#ym-export-csv')?.addEventListener('click', function() {
        var rows = [['Mission','Type','Status','Priority','Progress','Plant']];
        report.agentStats.forEach(function(a) {
          rows.push([a.mission || a.name, a.type || 'N/A', a.status, 'medium', a.progress + '%', 'N/A']);
        });
        var csv = rows.map(function(r) { return r.map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
        var blob = new Blob([csv], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'yantramitra-report-' + Date.now() + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        toast('Report exported as CSV');
      });
      wrap.querySelector('#ym-export-json')?.addEventListener('click', function() {
        var blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'yantramitra-report-' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(url);
        toast('Report exported as JSON');
      });
    } catch (e) {
      wrap.innerHTML = '<div class="modal-card" role="dialog" aria-modal="true"><div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:14px"><h2 style="font:900 24px/1.2 Inter,system-ui,sans-serif;color:#191a28">Report Error</h2><button class="ym-close-modal" style="border:0;background:#eeecff;border-radius:999px;width:36px;height:36px;cursor:pointer"><span class="material-symbols-outlined">close</span></button></div><p class="text-sm text-error">Failed to generate report: ' + e.message + '</p></div>';
    }
  }

  function openInsightModal(insightKey) {
    var data = INSIGHT_DATA[insightKey];
    if (!data) return;
    var body = '<div class="space-y-3">' +
      '<div class="flex items-center gap-2 mb-2"><span class="material-symbols-outlined ' + data.color + '">' + data.icon + '</span><span class="font-bold text-base">' + data.title + '</span></div>' +
      '<p class="text-sm text-on-surface-variant">' + data.detail + '</p>' +
      '<div class="grid grid-cols-2 gap-3 mt-3"><div class="bg-primary/5 rounded-lg p-3"><p class="text-[10px] text-on-surface-variant">Affected Plant</p><p class="text-xs font-bold">' + data.affectedPlant + '</p></div>' +
      '<div class="bg-primary/5 rounded-lg p-3"><p class="text-[10px] text-on-surface-variant">Affected Machine</p><p class="text-xs font-bold">' + data.affectedMachine + '</p></div>' +
      '<div class="bg-primary/5 rounded-lg p-3"><p class="text-[10px] text-on-surface-variant">Confidence</p><p class="text-xs font-bold text-secondary">' + data.confidence + '</p></div>' +
      '<div class="bg-primary/5 rounded-lg p-3"><p class="text-[10px] text-on-surface-variant">Time Detected</p><p class="text-xs font-bold">' + data.timeDetected + '</p></div></div>' +
      '<div class="bg-tertiary/5 rounded-lg p-3 border border-tertiary/20"><p class="text-[10px] font-bold text-tertiary mb-1">Recommended Action</p><p class="text-xs">' + data.recommendedAction + '</p></div>' +
      '<div class="bg-secondary/5 rounded-lg p-3 border border-secondary/20"><p class="text-[10px] font-bold text-secondary mb-1">Related Missions</p><p class="text-xs">' + data.relatedMissions + '</p></div></div>';
    openModal('Insight Details', body);
  }

  function openMissionDetailModal(mission) {
    if (!mission) return;
    var em = enrichMission(mission);
    var body = '<div class="space-y-3">' +
      '<div class="flex items-center gap-3"><span class="material-symbols-outlined text-3xl" style="color:' + mission.color + ';font-variation-settings:\'FILL\' 1">check_circle</span>' +
      '<div><p class="font-bold text-base">' + (mission.mission || mission.name) + '</p><p class="text-xs text-on-surface-variant">Completed by ' + (mission.agentName || mission.type || 'Agent') + ' · ' + mission.progress + '%</p></div></div>' +
      '<div class="grid grid-cols-2 gap-3"><div class="bg-primary/5 rounded-lg p-3"><p class="text-[10px] text-on-surface-variant">Plant</p><p class="text-xs font-bold">' + (mission.plant || 'N/A') + '</p></div>' +
      '<div class="bg-primary/5 rounded-lg p-3"><p class="text-[10px] text-on-surface-variant">Type</p><p class="text-xs font-bold">' + (mission.type || 'N/A') + '</p></div>' +
      '<div class="bg-primary/5 rounded-lg p-3"><p class="text-[10px] text-on-surface-variant">Priority</p><p class="text-xs font-bold"><span class="px-1.5 py-0.5 rounded ' + em.priorityStyle + ' text-[9px]">' + (mission.priority || 'medium').toUpperCase() + '</span></p></div>' +
      '<div class="bg-primary/5 rounded-lg p-3"><p class="text-[10px] text-on-surface-variant">Status</p><p class="text-xs font-bold ' + em.statusColor + '">' + em.statusLabel + '</p></div></div></div>';
    openModal('Mission Details', body);
  }

  function openPlantDetailModal(plant) {
    if (!plant) return;
    var name = typeof plant === 'string' ? plant : plant.name;
    var location = typeof plant === 'string' ? '' : (plant.location || '');
    var oee = typeof plant === 'string' ? '' : (plant.oee || '');
    var status = typeof plant === 'string' ? 'operational' : (plant.status || 'operational');
    var id = typeof plant === 'string' ? '' : plant.id;
    var body = '<div class="space-y-3">' +
      '<div class="flex items-center gap-3"><span class="material-symbols-outlined text-3xl text-primary" style="font-variation-settings:\'FILL\' 1">factory</span>' +
      '<div><p class="font-bold text-base">' + name + '</p><p class="text-xs text-on-surface-variant">' + (location || 'Industrial facility') + '</p></div></div>' +
      '<div class="grid grid-cols-2 gap-3"><div class="bg-primary/5 rounded-lg p-3"><p class="text-[10px] text-on-surface-variant">Status</p><p class="text-xs font-bold text-secondary">' + status.charAt(0).toUpperCase() + status.slice(1) + '</p></div>' +
      '<div class="bg-primary/5 rounded-lg p-3"><p class="text-[10px] text-on-surface-variant">OEE</p><p class="text-xs font-bold">' + (oee || 'N/A') + '%</p></div></div>' +
      (id ? '<button id="ym-plant-nav" class="w-full py-2.5 bg-primary text-on-primary rounded-full text-xs font-bold cursor-pointer hover:bg-primary/90 transition-colors">View Full Plant Details</button>' : '') + '</div>';
    var wrap = openModal('Plant Details: ' + name, body);
    wrap.querySelector('#ym-plant-nav')?.addEventListener('click', function() {
      window.location.href = '/plant/' + id;
    });
  }

  function wireEvents() {
    document.getElementById('ym-new-mission-btn')?.addEventListener('click', openCreateMissionModal);
    document.getElementById('ym-filter-btn')?.addEventListener('click', openFilterSheet);
    document.getElementById('ym-filter-apply')?.addEventListener('click', applyFilters);
    document.getElementById('ym-filter-reset')?.addEventListener('click', resetFilters);
    document.getElementById('ym-filter-close')?.addEventListener('click', closeFilterSheet);
    document.getElementById('ym-filter-backdrop')?.addEventListener('click', closeFilterSheet);
    document.getElementById('ym-view-all-agents')?.addEventListener('click', function() { window.location.href = '/agents'; });
    document.getElementById('ym-generate-report')?.addEventListener('click', openReportModal);
    document.getElementById('ym-view-archive')?.addEventListener('click', function() { window.location.href = '/agents?archive=1'; });
    document.getElementById('ym-refresh-btn')?.addEventListener('click', async function() {
      var btn = this;
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-xs animate-spin">refresh</span> Refreshing...';
      await loadAllData();
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined text-xs">refresh</span>Refresh';
      toast('Dashboard refreshed');
    });

    var sortP = document.getElementById('ym-sort-priority');
    if (sortP) {
      sortP.addEventListener('click', function() {
        if (state.sortPriority === null) state.sortPriority = 'asc';
        else if (state.sortPriority === 'asc') state.sortPriority = 'desc';
        else state.sortPriority = null;
        state.sortETA = null;
        saveState();
        renderMissionQueue();
        updateSortButtons();
        toast('Sorted by priority: ' + (state.sortPriority === 'asc' ? 'Ascending' : state.sortPriority === 'desc' ? 'Descending' : 'None'));
      });
    }

    var sortE = document.getElementById('ym-sort-eta');
    if (sortE) {
      sortE.addEventListener('click', function() {
        if (state.sortETA === null) state.sortETA = 'asc';
        else if (state.sortETA === 'asc') state.sortETA = 'desc';
        else state.sortETA = null;
        state.sortPriority = null;
        saveState();
        renderMissionQueue();
        updateSortButtons();
        toast('Sorted by ETA: ' + (state.sortETA === 'asc' ? 'Ascending' : state.sortETA === 'desc' ? 'Descending' : 'None'));
      });
    }

    document.querySelectorAll('.ym-region-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        var range = this.dataset.timeline;
        if (!range) return;
        state.timelineRange = range;
        saveState();
        updateTimelineTabs();
        state.timelineEvents = [];
        get('/api/timeline?range=' + range + (state.selectedMissionId ? '&missionId=' + state.selectedMissionId : '')).then(function(events) {
          state.timelineEvents = events;
          renderTimeline();
        }).catch(function() { renderTimeline(); });
        toast('Timeline: ' + range);
      });
    });

    document.querySelectorAll('[data-insight]').forEach(function(card) {
      card.addEventListener('click', function() { openInsightModal(this.dataset.insight); });
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openInsightModal(this.dataset.insight); }
      });
    });

    var searchInput = document.getElementById('ym-dashboard-search');
    if (searchInput) {
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && this.value.trim()) {
          var q = this.value.trim().toLowerCase();
          var found = state.missions.find(function(m) { return (m.mission && m.mission.toLowerCase().includes(q)) || (m.name && m.name.toLowerCase().includes(q)) || (m.plant && m.plant.toLowerCase().includes(q)); });
          if (found) { selectMission(found.id); toast('Found: ' + (found.mission || found.name)); }
          else toast('No results found for "' + q + '"', 'error');
        }
      });
    }

    document.getElementById('ym-notifications')?.addEventListener('click', function() { window.location.href = '/anomaly'; });
    document.getElementById('ym-facility-switcher')?.addEventListener('click', function() { window.location.href = '/map'; });
    document.getElementById('ym-profile-menu')?.addEventListener('click', function() { window.location.href = '/settings'; });

    var map = document.getElementById('ym-dashboard-map');
    if (map) {
      map.addEventListener('click', function(e) {
        if (!e.target.closest('.ym-network-pin')) { window.location.href = '/map'; }
      });
      map.addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.ym-network-pin')) { e.preventDefault(); window.location.href = '/map'; }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async function() {
    var user = await checkAuth();
    if (!user) return;
    restoreState();
    await loadAllData();
    wireEvents();
    setInterval(async function() {
      var sel = state.selectedMissionId;
      await loadAllData();
      if (sel) {
        var found = state.missions.find(function(m) { return m.id === sel; });
        if (found) {
          state.selectedMissionId = sel;
          state.selectedMission = found;
          renderMissionQueue();
          renderSelectedAgentDetails();
          renderTimeline();
        }
      }
    }, 30000);
  });
})();
