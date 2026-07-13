(function() {
  async function get(p) { const r = await fetch(p, { credentials: 'same-origin' }); if (!r.ok) throw new Error(p); return r.json(); }
  async function patch(p, b) { const r = await fetch(p, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(b) }); if (!r.ok) throw new Error(p); return r.json(); }

  let plans = [], machines = [], workOrders = [], agents = [];
  let filteredPlans = [];

  const agentNames = ['Planner-Agent-P7','Diagnostic-Agent-D2','Energy-Agent-E1','Inventory-Agent-I3','Executive-Agent-X1','Security-Agent-S4','Firmware-Agent-C4','HVAC-Agent-A1','Grid-Agent-G2'];
  const machineTypes = ['CNC-7740','EV-LOADER','CONVEYOR-B','HVAC-SYS','Turbine-7','Main Line Controller','HVAC Compressor','Grid Load-Balancing','RX-900 ARM','Pump P-102'];
  const plantNames = ['Pune Automotive','Chennai Electronics','Ahmedabad Process','Bengaluru Precision','Nagpur Logistics'];

  function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rn(min, max) { return Math.round((Math.random() * (max - min) + min) * 10) / 10; }

  function toast(msg, type) {
    const c = document.getElementById('ym-toast-container');
    const el = document.createElement('div');
    el.className = 'rounded-full border px-5 py-3 text-sm font-bold shadow-xl pointer-events-auto ' + (type === 'error' ? 'border-error/20 bg-error/95 text-white' : 'border-primary/20 bg-white/95 text-primary');
    el.textContent = msg; c.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2600);
  }

  function openModal(title, body, wide) {
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

  function confidenceSvg(pct, size, color) {
    const r = 22, circ = 2 * Math.PI * r, offset = circ * (1 - pct / 100);
    return `<svg width="${size}" height="${size}" viewBox="0 0 54 54"><circle cx="27" cy="27" r="${r}" fill="none" stroke="rgba(199,196,215,0.3)" stroke-width="5"/><circle cx="27" cy="27" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round" class="confidence-ring" style="transition: stroke-dashoffset 1s ease"/><text x="27" y="27" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="700" fill="${color}">${pct}%</text></svg>`;
  }

  function riskBar(level) {
    const colors = { Low: '#006b5f', Medium: '#774f00', High: '#ba1a1a', Critical: '#ba1a1a' };
    const pcts = { Low: 25, Medium: 50, High: 75, Critical: 95 };
    const c = colors[level] || '#767586';
    return `<div class="flex items-center gap-2"><div class="flex-1 h-1.5 bg-outline-variant/30 rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${pcts[level]||50}%;background:${c}"></div></div><span class="text-[10px] font-bold" style="color:${c}">${level}</span></div>`;
  }

  function enrichPlan(plan, idx) {
    const machine = machines[idx % machines.length] || { name: randomFrom(machineTypes), plant: { name: randomFrom(plantNames) }, health: rn(40, 100) };
    return {
      ...plan,
      machineName: machine.name || plan.title,
      plantName: machine.plant?.name || randomFrom(plantNames),
      agentName: plan.agentName || randomFrom(agentNames),
      confidence: rn(75, 99.9),
      risk: randomFrom(['Low','Medium','High']),
      estimatedSavings: rn(0.8, 5.2).toFixed(1) + 'L',
      downtimeReduction: rn(4, 28).toFixed(1) + '%',
      energyImpact: '-' + rn(3, 18).toFixed(1) + '%',
      co2Reduction: rn(2, 15).toFixed(1) + 'T',
      roi: rn(120, 480).toFixed(0) + '%',
      implCost: '₹' + rn(0.5, 4.2).toFixed(1) + 'L',
      rulImpact: '+' + rn(400, 2400).toFixed(0) + ' hrs',
      maintWindow: randomFrom(['Next 7 days','Next 14 days','Next 30 days','Schedule within quarter']),
      machineHealth: machine.health,
      machineImage: null
    };
  }

  function getFilters() {
    return {
      plant: document.getElementById('ym-filter-plant')?.value || '',
      priority: document.getElementById('ym-filter-priority')?.value || '',
      status: document.getElementById('ym-filter-status')?.value || '',
      agent: document.getElementById('ym-filter-agent')?.value || '',
      date: document.getElementById('ym-filter-date')?.value || '',
      search: document.getElementById('ym-search-input')?.value || ''
    };
  }

  function applyFilters() {
    const f = getFilters();
    filteredPlans = plans.filter(p => {
      const ep = enrichPlan(p, plans.indexOf(p));
      if (f.plant && ep.plantName !== f.plant) return false;
      if (f.priority && p.priority !== f.priority) return false;
      if (f.status && p.status !== f.status) return false;
      if (f.agent && ep.agentName !== f.agent) return false;
      if (f.date && p.createdAt && new Date(p.createdAt).toISOString().slice(0,10) !== f.date) return false;
      if (f.search) {
        const q = f.search.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !ep.machineName.toLowerCase().includes(q) && !ep.plantName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    render();
  }

  function renderKPIs() {
    const today = new Date().toISOString().slice(0,10);
    const pending = plans.filter(p => p.status === 'pending').length;
    const approved = plans.filter(p => p.status === 'approved' && p.approvedAt && new Date(p.approvedAt).toISOString().slice(0,10) === today).length;
    const rejected = plans.filter(p => p.status === 'rejected').length;
    const totalSavings = plans.filter(p => p.status === 'approved').reduce((s, p, i) => {
      const ep = enrichPlan(p, i);
      return s + parseFloat(ep.estimatedSavings) || 0;
    }, 0);
    const totalDowntime = plans.filter(p => p.status === 'approved').reduce((s, p, i) => {
      const ep = enrichPlan(p, i);
      return s + parseFloat(ep.downtimeReduction) || 0;
    }, 0);
    const avgConf = filteredPlans.length ? Math.round(filteredPlans.reduce((s, p, i) => s + enrichPlan(p, i).confidence, 0) / filteredPlans.length) : 0;

    document.getElementById('ym-kpi-pending').textContent = pending;
    document.getElementById('ym-kpi-approved').textContent = approved;
    document.getElementById('ym-kpi-rejected').textContent = rejected;
    document.getElementById('ym-kpi-savings').textContent = '₹' + totalSavings.toFixed(1) + 'L';
    document.getElementById('ym-kpi-downtime').textContent = totalDowntime.toFixed(1) + '%';
    document.getElementById('ym-kpi-confidence').textContent = avgConf + '%';
  }

  function renderFilters() {
    const plantEl = document.getElementById('ym-filter-plant');
    const agentEl = document.getElementById('ym-filter-agent');
    if (!plantEl) return;
    const plants = [...new Set(machines.map(m => m.plant?.name).filter(Boolean))];
    const usedAgents = [...new Set(plans.map((_, i) => enrichPlan(plans[i], i).agentName))];
    plantEl.innerHTML = '<option value="">All Plants</option>' + plants.map(p => `<option value="${p}">${p}</option>`).join('');
    agentEl.innerHTML = '<option value="">All Agents</option>' + usedAgents.map(a => `<option value="${a}">${a}</option>`).join('');

    [plantEl, document.getElementById('ym-filter-priority'), document.getElementById('ym-filter-status'), agentEl, document.getElementById('ym-filter-date')].forEach(el => {
      el?.addEventListener('change', applyFilters);
    });
    document.getElementById('ym-filter-reset')?.addEventListener('click', () => {
      document.querySelectorAll('#ym-filter-bar select, #ym-filter-bar input').forEach(el => el.value = '');
      document.getElementById('ym-search-input').value = '';
      applyFilters();
    });
    document.getElementById('ym-search-input')?.addEventListener('input', applyFilters);
  }

  function renderActiveFilters() {
    const c = document.getElementById('ym-active-filters');
    if (!c) return;
    const f = getFilters();
    const chips = [];
    if (f.plant) chips.push({ label: f.plant, key: 'plant' });
    if (f.priority) chips.push({ label: f.priority.toUpperCase(), key: 'priority' });
    if (f.status) chips.push({ label: f.status.toUpperCase(), key: 'status' });
    if (f.agent) chips.push({ label: f.agent, key: 'agent' });
    if (f.date) chips.push({ label: f.date, key: 'date' });
    if (!chips.length) { c.innerHTML = ''; return; }
    c.innerHTML = chips.map(ch => `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-label-caps cursor-pointer hover:bg-primary/20 transition-all filter-chip-remove" data-key="${ch.key}">${ch.label} <span class="material-symbols-outlined text-[12px]">close</span></span>`).join('');
    c.querySelectorAll('.filter-chip-remove').forEach(el => {
      el.addEventListener('click', function() {
        const el2 = document.getElementById('ym-filter-' + this.dataset.key);
        if (el2) el2.value = '';
        if (this.dataset.key === 'search') document.getElementById('ym-search-input').value = '';
        applyFilters();
      });
    });
  }

  function renderCards() {
    const container = document.getElementById('ym-plans-container');
    if (!container) return;
    if (!filteredPlans.length) {
      container.innerHTML = '<div class="flex flex-col items-center justify-center py-20 text-on-surface-variant"><span class="material-symbols-outlined text-5xl mb-sm">fact_check</span><p class="font-label-caps text-sm">No plans match your filters</p><button class="text-xs text-primary hover:underline mt-1 cursor-pointer" id="ym-empty-reset">Reset filters</button></div>';
      document.getElementById('ym-empty-reset')?.addEventListener('click', () => { document.querySelectorAll('#ym-filter-bar select, #ym-filter-bar input').forEach(el => el.value = ''); document.getElementById('ym-search-input').value = ''; applyFilters(); });
      return;
    }

    const statusColors = { pending: { bg: 'bg-tertiary-fixed-dim', text: 'text-on-tertiary-fixed-variant' }, approved: { bg: 'bg-secondary-container', text: 'text-on-secondary-container' }, rejected: { bg: 'bg-error-container', text: 'text-on-error-container' } };
    const priorityColors = { critical: { bg: '#ba1a1a', border: 'priority-border-critical' }, high: { bg: '#413fd6', border: 'priority-border-high' }, medium: { bg: '#774f00', border: 'priority-border-medium' }, low: { bg: '#006b5f', border: 'priority-border-low' } };
    const agentColorMap = { 'Planner-Agent-P7': '#413fd6','Diagnostic-Agent-D2': '#006b5f','Energy-Agent-E1': '#774f00','Inventory-Agent-I3': '#986500','Executive-Agent-X1': '#ba1a1a','Security-Agent-S4': '#2e2f3e','Firmware-Agent-C4': '#4948de','HVAC-Agent-A1': '#007165','Grid-Agent-G2': '#624000' };

    container.innerHTML = filteredPlans.map((plan, idx) => {
      const ep = enrichPlan(plan, plans.indexOf(plan));
      const sc = statusColors[plan.status] || statusColors.pending;
      const pc = priorityColors[plan.priority] || priorityColors.medium;
      const isPending = plan.status === 'pending';
      const agentColor = agentColorMap[ep.agentName] || '#413fd6';
      const confColor = ep.confidence > 90 ? '#006b5f' : ep.confidence > 75 ? '#774f00' : '#ba1a1a';

      return `<div class="approval-card glass-panel rounded-xl overflow-hidden ${pc.border} ${plan.status === 'approved' ? 'opacity-70' : ''}" id="plan-${plan.id}">
        <div class="p-md cursor-pointer flex items-start gap-md" data-toggle="${plan.id}">
          <div class="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center shrink-0 overflow-hidden border border-outline-variant/20">
            <span class="material-symbols-outlined text-2xl" style="color:${agentColor}">smart_toy</span>
          </div>
          <div class="flex-grow min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-section-header text-lg font-bold text-on-surface">${plan.title}</h3>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" style="background:${pc.bg}18;color:${pc.bg};border:1px solid ${pc.bg}40">${plan.priority.toUpperCase()}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}">${plan.status.toUpperCase()}</span>
            </div>
            <div class="flex items-center gap-md mt-2 text-sm text-on-surface-variant flex-wrap">
              <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">precision_manufacturing</span>${ep.machineName}</span>
              <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">business</span>${ep.plantName}</span>
              <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm" style="color:${agentColor}">psychology</span><span style="color:${agentColor}" class="font-semibold">${ep.agentName}</span></span>
              <span class="text-xs">${new Date(plan.createdAt || Date.now()).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
            </div>
          </div>
          <div class="flex items-center gap-sm shrink-0">
            ${confidenceSvg(ep.confidence, 56, confColor)}
            <span class="material-symbols-outlined text-outline transition-transform chevron text-2xl">expand_more</span>
          </div>
        </div>
        <div class="expand-content">
          <div class="overflow-hidden">
            <div class="px-md pb-md border-t border-outline-variant/20 pt-md">
              <div class="grid grid-cols-12 gap-md">
                <div class="col-span-12 lg:col-span-8 space-y-md">
                  <p class="text-sm text-on-surface-variant">${plan.description || 'AI-generated strategy based on multi-modal sensor fusion and historical performance analysis.'}</p>
                  ${isPending ? `
                  <div>
                    <h4 class="font-label-caps text-sm text-on-surface-variant mb-sm flex items-center gap-1"><span class="material-symbols-outlined text-sm">psychology</span> AI Reasoning</h4>
                    <div class="ml-3 border-l-2 border-outline-variant/20 space-y-md pl-5">
                      <div><p class="font-semibold text-sm">Anomaly Detection</p><p class="text-xs text-on-surface-variant mt-0.5">Temperature variance in ${ep.machineName} exceeded baseline. Vibration signatures match fatigue patterns.</p></div>
                      <div><p class="font-semibold text-sm">Hypothesis Testing</p><p class="text-xs text-on-surface-variant mt-0.5">Evaluated partial calibration vs full replacement. Full replacement ensures ${ep.rulImpact} stability.</p></div>
                      <div><p class="font-semibold text-sm">Outcome Optimization</p><p class="text-xs text-on-surface-variant mt-0.5">Recommended strategy optimizes for Zero Unscheduled Downtime with ${ep.energyImpact} energy reduction.</p></div>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-sm">
                    <div class="bg-surface-container-low rounded-lg p-3 border border-outline-variant/20">
                      <h4 class="font-label-caps text-[10px] text-on-surface-variant mb-1">BEFORE</h4>
                      <p class="text-sm">Current MTBF: <span class="font-bold text-error">1,240 hrs</span></p>
                      <p class="text-sm">Energy: <span class="font-bold">84 MWh</span></p>
                      <p class="text-sm">Downtime: <span class="font-bold text-error">4.2%</span></p>
                    </div>
                    <div class="bg-surface-container-low rounded-lg p-3 border border-outline-variant/20">
                      <h4 class="font-label-caps text-[10px] text-on-surface-variant mb-1">AFTER</h4>
                      <p class="text-sm">MTBF: <span class="font-bold text-secondary">3,600 hrs</span></p>
                      <p class="text-sm">Energy: <span class="font-bold text-secondary">72 MWh</span></p>
                      <p class="text-sm">Downtime: <span class="font-bold text-secondary">2.8%</span></p>
                    </div>
                  </div>
                  ` : `<div class="bg-surface-container-low rounded-lg p-4 text-center"><p class="text-on-surface-variant text-sm">Plan ${plan.status}. ${plan.approvedAt ? 'Approved on ' + new Date(plan.approvedAt).toLocaleDateString() : ''}</p></div>`}
                </div>
                <div class="col-span-12 lg:col-span-4 space-y-sm">
                  <div class="bg-surface-container-low rounded-lg p-3 border border-outline-variant/20 space-y-2">
                    <div class="flex justify-between items-center text-xs"><span class="text-on-surface-variant">Risk</span>${riskBar(ep.risk)}</div>
                    <div class="flex justify-between items-center text-xs"><span class="text-on-surface-variant">Savings</span><span class="font-bold">₹${ep.estimatedSavings}</span></div>
                    <div class="flex justify-between items-center text-xs"><span class="text-on-surface-variant">Downtime</span><span class="font-bold text-primary">${ep.downtimeReduction}</span></div>
                    <div class="flex justify-between items-center text-xs"><span class="text-on-surface-variant">Energy</span><span class="font-bold text-secondary">${ep.energyImpact}</span></div>
                    <div class="flex justify-between items-center text-xs"><span class="text-on-surface-variant">CO₂</span><span class="font-bold text-tertiary">${ep.co2Reduction}</span></div>
                    <div class="flex justify-between items-center text-xs"><span class="text-on-surface-variant">ROI</span><span class="font-bold">${ep.roi}</span></div>
                    <div class="flex justify-between items-center text-xs"><span class="text-on-surface-variant">Cost</span><span class="font-bold">${ep.implCost}</span></div>
                    <div class="flex justify-between items-center text-xs"><span class="text-on-surface-variant">RUL</span><span class="font-bold text-secondary">${ep.rulImpact}</span></div>
                    <div class="flex justify-between items-center text-xs"><span class="text-on-surface-variant">Window</span><span class="font-bold">${ep.maintWindow}</span></div>
                    <div class="flex justify-between items-center text-xs"><span class="text-on-surface-variant">Machine Health</span><div class="flex items-center gap-1"><div class="w-2 h-2 rounded-full ${ep.machineHealth > 80 ? 'bg-secondary' : ep.machineHealth > 60 ? 'bg-tertiary' : 'bg-error'}"></div><span class="font-bold">${ep.machineHealth}%</span></div></div>
                  </div>
                  <div class="bg-surface-container-low rounded-lg p-3 border border-outline-variant/20 text-xs">
                    <div class="flex justify-between items-center"><span class="text-on-surface-variant">Predicted outcome</span><span class="font-bold text-secondary">+${ep.roi}</span></div>
                    <div class="flex justify-between items-center mt-1"><span class="text-on-surface-variant">Timeline</span><span class="font-bold">${ep.maintWindow}</span></div>
                  </div>
                </div>
              </div>
              <div class="flex gap-sm pt-4 border-t border-outline-variant/10 mt-md flex-wrap">
                ${isPending ? `
                <button class="shimmer-btn text-on-primary py-2.5 px-5 rounded-full font-label-caps text-xs flex items-center gap-1.5 transition-all" data-action="approve" data-id="${plan.id}"><span class="material-symbols-outlined text-sm">check_circle</span> APPROVE</button>
                <button class="py-2.5 px-5 rounded-full border border-error/30 text-error font-label-caps text-xs hover:bg-error/5 transition-all flex items-center gap-1.5" data-action="reject" data-id="${plan.id}"><span class="material-symbols-outlined text-sm">cancel</span> REJECT</button>
                <button class="py-2.5 px-5 rounded-full border border-tertiary/30 text-tertiary font-label-caps text-xs hover:bg-tertiary/5 transition-all flex items-center gap-1.5" data-action="revision" data-id="${plan.id}"><span class="material-symbols-outlined text-sm">refresh</span> REVISION</button>
                <button class="py-2.5 px-5 rounded-full border border-outline/30 text-on-surface-variant font-label-caps text-xs hover:bg-primary/5 transition-all flex items-center gap-1.5" data-action="simulate" data-id="${plan.id}"><span class="material-symbols-outlined text-sm">science</span> SIMULATION</button>
                <button class="py-2.5 px-5 rounded-full border border-primary/30 text-primary font-label-caps text-xs hover:bg-primary/5 transition-all flex items-center gap-1.5" data-action="diagnostic" data-id="${plan.id}"><span class="material-symbols-outlined text-sm">assignment</span> DIAGNOSTIC</button>
                ` : `
                <button class="py-2.5 px-5 rounded-full border border-primary/30 text-primary font-label-caps text-xs hover:bg-primary/5 transition-all flex items-center gap-1.5" data-action="diagnostic" data-id="${plan.id}"><span class="material-symbols-outlined text-sm">assignment</span> VIEW DIAGNOSTIC</button>
                `}
              </div>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('[data-toggle]').forEach(el => {
      el.addEventListener('click', function() {
        const id = this.dataset.toggle;
        const card = document.getElementById('plan-' + id);
        if (!card) return;
        const was = card.classList.contains('expanded');
        document.querySelectorAll('.approval-card.expanded').forEach(c => {
          c.classList.remove('expanded');
          c.querySelector('.chevron').style.transform = 'rotate(0deg)';
        });
        if (!was) {
          card.classList.add('expanded');
          card.querySelector('.chevron').style.transform = 'rotate(180deg)';
        }
      });
    });

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.stopPropagation();
        const action = this.dataset.action;
        const planId = this.dataset.id;
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;
        if (action === 'approve') {
          try { await patch('/api/plans/' + planId, { status: 'approved' }); toast('Approved: ' + plan.title); await loadPlans(); }
          catch (e) { toast('Failed to approve', 'error'); }
        } else if (action === 'reject') {
          try { await patch('/api/plans/' + planId, { status: 'rejected' }); toast('Rejected: ' + plan.title); await loadPlans(); }
          catch (e) { toast('Failed to reject', 'error'); }
        } else if (action === 'revision') {
          toast('Sent for revision: ' + plan.title);
        } else if (action === 'simulate') {
          window.location.href = '/simulator?plan=' + planId;
        } else if (action === 'diagnostic') {
          const ep = enrichPlan(plan, plans.indexOf(plan));
          const m = machines.find(m => m.name === ep.machineName);
          if (m) window.location.href = '/diagnostics/' + m.id;
          else toast('Machine not found for diagnostics', 'error');
        }
      });
    });
  }

  function render() {
    renderKPIs();
    renderActiveFilters();
    renderCards();
  }

  async function loadPlans() {
    try {
      const [plansData, machinesData, ordersData, agentsData] = await Promise.all([
        get('/api/plans'), get('/api/machines'), get('/api/work-orders'), get('/api/agents')
      ]);
      plans = plansData;
      machines = machinesData;
      workOrders = ordersData;
      agents = agentsData;
      renderFilters();
      applyFilters();
    } catch (e) { toast('Failed to load data', 'error'); }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try { const me = await get('/api/auth/me'); if (!me || !me.id) { window.location.href = '/'; return; } }
    catch { window.location.href = '/'; return; }
    await loadPlans();
  });
})();
