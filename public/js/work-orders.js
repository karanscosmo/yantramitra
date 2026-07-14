(function() {
  const API = { base: '' };
  async function get(path) { const r = await fetch(path, { credentials: 'same-origin' }); if (!r.ok) throw new Error(path); return r.json(); }
  async function post(path, body) { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) }); if (!r.ok) throw new Error(path); return r.json(); }
  async function patch(path, body) { const r = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) }); if (!r.ok) throw new Error(path); return r.json(); }

  let orders = [];
  let machines = [];
  let filteredOrders = [];
  let selectedOrder = null;
  let checklistItems = [];
  let currentUser = null;
  let drawerOpen = false;

  const FILTER_KEYS = { status: 'st', priority: 'pr', location: 'lo', search: 'q' };

  function getFiltersFromURL() {
    const p = new URLSearchParams(window.location.search);
    return {
      status: p.get(FILTER_KEYS.status) ? p.get(FILTER_KEYS.status).split(',') : [],
      priority: p.get(FILTER_KEYS.priority) ? p.get(FILTER_KEYS.priority).split(',') : [],
      location: p.get(FILTER_KEYS.location) ? p.get(FILTER_KEYS.location).split(',') : [],
      search: p.get(FILTER_KEYS.search) || ''
    };
  }

  function getActiveFilters() {
    return getFiltersFromURL();
  }

  function setFiltersToURL(filters) {
    const p = new URLSearchParams();
    if (filters.status.length) p.set(FILTER_KEYS.status, filters.status.join(','));
    if (filters.priority.length) p.set(FILTER_KEYS.priority, filters.priority.join(','));
    if (filters.location.length) p.set(FILTER_KEYS.location, filters.location.join(','));
    if (filters.search) p.set(FILTER_KEYS.search, filters.search);
    const qs = p.toString();
    const url = qs ? window.location.pathname + '?' + qs : window.location.pathname;
    window.history.replaceState(null, '', url);
  }

  function toast(message, type) {
    const container = document.getElementById('ym-toast-container');
    const el = document.createElement('div');
    el.className = 'rounded-full border px-5 py-3 text-sm font-bold shadow-xl pointer-events-auto ' + (type === 'error' ? 'border-error/20 bg-error/95 text-white' : 'border-primary/20 bg-white/95 text-primary');
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2600);
  }

  function formatDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  function statusBadge(status) {
    const map = {
      open: 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant',
      assigned: 'bg-primary/10 text-primary',
      in_progress: 'bg-primary/10 text-primary',
      completed: 'bg-secondary-container text-on-secondary-container',
      blocked: 'bg-error-container text-on-error-container',
      waiting_parts: 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant',
      approved: 'bg-secondary-container text-on-secondary-container',
      rejected: 'bg-error-container text-on-error-container',
      cancelled: 'bg-outline-variant/50 text-on-surface-variant'
    };
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${map[status] || map.open}">${status.replace(/_/g, ' ').toUpperCase()}</span>`;
  }

  function priorityBadge(priority) {
    const map = { low: 'bg-surface-container text-on-surface-variant', medium: 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant', high: 'bg-primary/10 text-primary', critical: 'bg-error-container text-on-error-container' };
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${map[priority] || map.medium}">${priority.toUpperCase()}</span>`;
  }

  function orderIcon(order) {
    const icons = { 'Hydraulic': 'precision_manufacturing', 'Generator': 'bolt', 'Belt': 'conveyor_belt', 'Pump': 'water_pump', 'Motor': 'electric_bolt', 'Valve': 'settings_input_component', 'Sensor': 'sensors', 'Calibration': 'tune', 'Inspection': 'search_insights', 'Repair': 'build', 'Replace': 'swap_horiz', 'Upgrade': 'upgrade', 'Lubrication': 'oil_barrel' };
    for (const [key, icon] of Object.entries(icons)) {
      if (order.title?.includes(key)) return icon;
    }
    return 'precision_manufacturing';
  }

  function openModal(title, body) {
    document.querySelector('.ym-modal-backdrop')?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop ym-modal-backdrop';
    setTimeout(() => wrap.classList.add('open'), 10);
    wrap.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:14px">
        <h2 style="font:900 24px/1.2 Inter,system-ui,sans-serif;color:#191a28">${title}</h2>
        <button class="ym-close-modal" style="border:0;background:#eeecff;border-radius:999px;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div>${body}</div>
    </div>`;
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.ym-close-modal')) { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 250); } });
    document.body.appendChild(wrap);
    return wrap;
  }

  function openTechModal(tech) {
    const skills = ['PLC Programming', 'Hydraulic Systems', 'CNC Calibration', 'Predictive Maintenance', 'Robotics', 'Welding'];
    const assignedMachines = machines.filter(m => m.workOrders?.some(o => o.assignedTo === tech.name)).slice(0, 4);
    const openOrders = orders.filter(o => o.assignedTo === tech.name && o.status !== 'completed');
    const techUser = { name: tech.name, email: tech.email || '', role: 'maintenance', status: 'active' };
    const techAvatarSrc = YMAvatar ? YMAvatar.dataURI(YMAvatar.generateSVG(techUser)) : '/assets/images/ym-operator-avatar.jpg';
    const techInit = YMAvatar ? YMAvatar.initials(tech.name) : '';
    const techS = YMAvatar ? YMAvatar.styleForRole('maintenance') : { primary: '#413fd6', bg: '#e1dfff' };
    openModal('Technician Profile', `
      <div class="flex items-center gap-md mb-md">
        <div class="w-20 h-20 rounded-full overflow-hidden shrink-0" style="border:2px solid ${techS.primary}30"><img src="${techAvatarSrc}" alt="${tech.name}" class="w-full h-full object-cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;background:${techS.bg};color:${techS.primary};font-weight:800;font-size:26px;font-family:Inter,Geist,sans-serif">${techInit}</div></div>
        <div>
          <p class="font-bold text-lg text-on-surface">${tech.name}</p>
          <p class="text-sm text-on-surface-variant">${tech.role || 'Lead Technician'}</p>
          <div class="flex items-center gap-xs mt-1">
            <span class="text-xs font-bold text-secondary">Performance: ${tech.score || 98}%</span>
            <span class="text-xs text-on-surface-variant">· ${tech.experience || '8 yrs'} exp</span>
          </div>
        </div>
      </div>
      <div class="mb-md">
        <p class="font-label-caps text-label-caps text-on-surface-variant mb-xs">SKILLS</p>
        <div class="flex flex-wrap gap-1">${skills.map(s => `<span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">${s}</span>`).join('')}</div>
      </div>
      <div class="mb-md">
        <p class="font-label-caps text-label-caps text-on-surface-variant mb-xs">ASSIGNED MACHINES</p>
        <div class="space-y-1">${(assignedMachines.length ? assignedMachines : machines.slice(0, 3)).map(m => `<div class="flex items-center gap-xs text-sm text-on-surface"><span class="material-symbols-outlined text-sm text-primary">precision_manufacturing</span>${m.name}</div>`).join('')}</div>
      </div>
      <div class="mb-md">
        <p class="font-label-caps text-label-caps text-on-surface-variant mb-xs">OPEN WORK ORDERS (${openOrders.length})</p>
        ${openOrders.length ? openOrders.map(o => `<div class="text-sm text-on-surface flex items-center gap-xs"><span class="material-symbols-outlined text-sm text-tertiary">build</span>${o.title}</div>`).join('') : '<p class="text-sm text-on-surface-variant">No open work orders</p>'}
      </div>
      <div class="grid grid-cols-2 gap-sm">
        <div class="bg-primary/5 rounded-lg p-3 text-center">
          <p class="text-xs text-on-surface-variant">Phone</p>
          <p class="font-semibold text-sm">+91 98765 43210</p>
        </div>
        <div class="bg-primary/5 rounded-lg p-3 text-center">
          <p class="text-xs text-on-surface-variant">Email</p>
          <p class="font-semibold text-sm">${tech.name?.toLowerCase().replace(' ', '.') || 'tech'}@yantramitra.com</p>
        </div>
      </div>
    `);
  }

  function openPartsDrawer(part) {
    const compatibleMachines = machines.slice(0, 3).map(m => m.name);
    openModal('Inventory: ' + part.name, `
      <div class="grid grid-cols-2 gap-sm mb-md">
        <div class="bg-primary/5 rounded-lg p-3">
          <p class="text-[10px] text-on-surface-variant">STOCK</p>
          <p class="font-bold text-lg" style="color:${part.quantity > 5 ? '#006b5f' : part.quantity > 0 ? '#774f00' : '#ba1a1a'}">${part.quantity || 0} units</p>
        </div>
        <div class="bg-primary/5 rounded-lg p-3">
          <p class="text-[10px] text-on-surface-variant">WAREHOUSE</p>
          <p class="font-bold text-sm">Main Stores - Bay A${Math.floor(Math.random() * 20) + 1}</p>
        </div>
        <div class="bg-primary/5 rounded-lg p-3">
          <p class="text-[10px] text-on-surface-variant">SUPPLIER</p>
          <p class="font-bold text-sm">${['Industrial Parts Co.', 'Precision Components Ltd', 'Tech Supply Corp'][Math.floor(Math.random() * 3)]}</p>
        </div>
        <div class="bg-primary/5 rounded-lg p-3">
          <p class="text-[10px] text-on-surface-variant">LEAD TIME</p>
          <p class="font-bold text-sm">${Math.floor(Math.random() * 14) + 2} days</p>
        </div>
        <div class="bg-primary/5 rounded-lg p-3">
          <p class="text-[10px] text-on-surface-variant">EXPECTED ARRIVAL</p>
          <p class="font-bold text-sm">${new Date(Date.now() + (Math.floor(Math.random() * 14) + 2) * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        </div>
        <div class="bg-primary/5 rounded-lg p-3">
          <p class="text-[10px] text-on-surface-variant">SKU</p>
          <p class="font-bold text-sm font-mono">${part.sku || 'PRT-' + String(Math.floor(Math.random() * 9000) + 1000)}</p>
        </div>
      </div>
      <button class="w-full shimmer-btn py-3 rounded-full text-on-primary font-label-caps text-label-caps shadow-lg" data-reserve-part="${part.sku || part.name}">
        <span class="material-symbols-outlined text-sm">inventory_2</span> RESERVE PART
      </button>
    `);
    document.querySelector('[data-reserve-part]')?.addEventListener('click', async function() {
      this.disabled = true;
      this.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> RESERVING...';
      await post('/api/inventory/reserve', { sku: part.sku || part.name, orderId: selectedOrder?.id }).catch(() => {});
      toast('Part reserved for work order');
      this.innerHTML = '<span class="material-symbols-outlined text-sm">check_circle</span> RESERVED';
    });
  }

  function getChecklistForOrder(order) {
    const defaults = [
      { text: 'System Diagnostic Run', state: 'completed' },
      { text: 'Isolation Protocol Active', state: 'completed' },
      { text: 'Calibrate Pressure Valves', state: 'running' },
      { text: 'Final Stress Testing', state: 'pending' }
    ];
    if (!order) return defaults;
    try {
      const stored = JSON.parse(sessionStorage.getItem('ym-checklist-' + order.id));
      if (stored && stored.length) return stored;
    } catch {}
    return defaults;
  }

  function saveChecklist(orderId, items) {
    try { sessionStorage.setItem('ym-checklist-' + orderId, JSON.stringify(items)); } catch {}
  }

  function renderChecklist(order) {
    const container = document.getElementById('ym-checklist');
    const pctEl = document.getElementById('ym-checklist-pct');
    const bar = document.getElementById('ym-progress-bar');
    if (!container) return;
    const items = checklistItems;
    const total = items.length;
    const done = items.filter(i => i.state === 'completed').length;
    const pct = total ? Math.round(done / total * 100) : 0;
    if (pctEl) pctEl.textContent = pct + '%';
    if (bar) bar.style.width = pct + '%';
    container.innerHTML = items.map((item, idx) => {
      const states = { pending: 'radio_button_unchecked', running: 'progress_activity', completed: 'check_circle', blocked: 'error' };
      const colors = { pending: 'text-outline', running: 'text-primary', completed: 'text-secondary', blocked: 'text-error' };
      const labels = { pending: 'PENDING', running: 'RUNNING', completed: 'DONE', blocked: 'BLOCKED' };
      return `<div class="checklist-state flex items-center gap-sm p-3 bg-white/40 rounded-lg border border-outline-variant/10" data-idx="${idx}">
        <span class="material-symbols-outlined ${colors[item.state] || 'text-outline'}" style="font-variation-settings: 'FILL' 1;">${states[item.state] || 'radio_button_unchecked'}</span>
        <div class="flex-1">
          <span class="text-sm ${item.state === 'completed' ? 'text-on-surface-variant line-through' : 'text-on-surface font-medium'}">${item.text}</span>
          <span class="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${item.state === 'completed' ? 'bg-secondary/10 text-secondary' : item.state === 'running' ? 'bg-primary/10 text-primary' : item.state === 'blocked' ? 'bg-error/10 text-error' : 'bg-outline-variant/30 text-on-surface-variant'}">${labels[item.state]}</span>
        </div>
        <div class="flex gap-1">
          ${['pending','running','completed','blocked'].map(s => `<button class="checklist-state-btn w-5 h-5 rounded-full border border-outline-variant/30 flex items-center justify-center text-[9px] font-bold hover:bg-primary/10 transition-all ${item.state === s ? 'bg-primary/20 text-primary' : 'text-on-surface-variant'}" data-state="${s}" title="${s}">${s[0].toUpperCase()}</button>`).join('')}
        </div>
      </div>`;
    }).join('');
    container.querySelectorAll('.checklist-state-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const idx = parseInt(this.closest('[data-idx]').dataset.idx);
        const newState = this.dataset.state;
        checklistItems[idx].state = newState;
        saveChecklist(order?.id, checklistItems);
        renderChecklist(order);
        toast(`Task "${checklistItems[idx].text}" → ${newState.toUpperCase()}`);
      });
    });
  }

  function renderTimeline(order) {
    const container = document.getElementById('ym-timeline');
    if (!container) return;
    if (!order || !order.createdAt) {
      container.innerHTML = '<p class="text-sm text-on-surface-variant">No timeline available</p>';
      return;
    }
    const events = [
      { icon: 'robot_2', bg: 'bg-outline-variant', label: 'Work Order Created', time: formatDate(order.createdAt), detail: 'Auto-generated from maintenance trigger' },
      { icon: 'person', bg: 'bg-primary', label: 'Assigned to ' + (order.assignedTo || 'Unassigned'), time: formatDate(order.createdAt), detail: 'Technician assigned' },
    ];
    if (order.status === 'in_progress') {
      events.push({ icon: 'play_arrow', bg: 'bg-secondary', label: 'Work Started', time: formatDate(order.updatedAt), detail: 'In progress' });
    }
    if (order.status === 'completed') {
      events.push({ icon: 'check_circle', bg: 'bg-secondary', label: 'Completed', time: formatDate(order.updatedAt), detail: 'Marked complete' });
    }
    container.innerHTML = events.map(e => `<div class="relative">
      <div class="absolute -left-[23px] top-1 w-4 h-4 rounded-full ${e.bg} ring-4 ring-white flex items-center justify-center">
        <span class="material-symbols-outlined text-[10px] text-white">${e.icon}</span>
      </div>
      <div class="flex items-start gap-sm">
        <div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"><span class="material-symbols-outlined text-[14px]">${e.icon}</span></div>
        <div>
          <p class="text-xs font-semibold">${e.label}</p>
          <p class="text-[10px] text-on-surface-variant">${e.time} • ${e.detail}</p>
        </div>
      </div>
    </div>`).join('');
  }

  function renderParts(order) {
    const container = document.getElementById('ym-parts-list');
    if (!container) return;
    const parts = [
      { name: 'Hydraulic Valve V2', sku: 'PRT-0092', quantity: 8, status: 'ok' },
      { name: 'Synthetic Lubricant', sku: 'FLD-4412', quantity: 2, status: 'low' }
    ];
    container.innerHTML = parts.map(p => `<div class="flex justify-between items-center p-sm glass-card rounded-lg border-none bg-white/30 cursor-pointer" data-part="${p.name}">
      <div class="flex items-center gap-sm">
        <div class="w-10 h-10 rounded bg-white flex items-center justify-center">
          <span class="material-symbols-outlined text-on-surface-variant text-[20px]">${p.name.includes('Lubricant') ? 'oil_barrel' : 'settings_input_component'}</span>
        </div>
        <div>
          <p class="text-sm font-medium">${p.name}</p>
          <p class="text-[10px] text-on-surface-variant">ID: ${p.sku} · Stock: ${p.quantity}</p>
        </div>
      </div>
      <span class="font-label-caps text-[11px] ${p.status === 'ok' ? 'text-secondary' : 'text-tertiary'}">${p.status === 'ok' ? 'STOCK OK' : 'LOW'}</span>
    </div>`).join('');
    container.querySelectorAll('[data-part]').forEach(el => {
      el.addEventListener('click', () => {
        const name = el.dataset.part;
        const part = parts.find(p => p.name === name);
        if (part) openPartsDrawer(part);
      });
    });
  }

  function renderHistory(order) {
    const container = document.getElementById('ym-history-log');
    if (!container) return;
    if (!order) { container.innerHTML = ''; return; }
    const history = order.statusHistory || [];
    if (!history.length) {
      container.innerHTML = '<p class="text-xs text-on-surface-variant">No status changes recorded</p>';
      return;
    }
    container.innerHTML = history.map(e => `<div class="flex items-start gap-xs text-xs py-1.5 border-b border-outline-variant/10 last:border-0">
      <span class="material-symbols-outlined text-[14px] text-outline mt-0.5">schedule</span>
      <div>
        <span class="font-medium capitalize text-on-surface">${e.status ? e.status.replace(/_/g, ' ') : 'Created'}</span>
        <span class="text-on-surface-variant"> — ${formatDate(e.timestamp || e.createdAt)}</span>
        ${e.note ? `<p class="text-on-surface-variant mt-0.5">${e.note}</p>` : ''}
      </div>
    </div>`).join('');
  }

  function openDrawer(order) {
    const drawer = document.getElementById('ym-detail-drawer');
    const backdrop = document.getElementById('ym-drawer-backdrop');
    if (!drawer) return;
    selectedOrder = order;
    drawerOpen = true;
    document.getElementById('ym-drawer-title').textContent = order.title || 'Work Order Detail';
    document.getElementById('ym-drawer-priority').textContent = (order.priority || 'medium').toUpperCase();
    document.getElementById('ym-drawer-priority').className = 'px-2 py-0.5 rounded-full text-[10px] font-bold ' + (order.priority === 'critical' ? 'bg-error-container text-on-error-container' : order.priority === 'high' ? 'bg-primary/10 text-primary' : 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant');
    document.getElementById('ym-drawer-status').textContent = (order.status || 'open').replace(/_/g, ' ').toUpperCase();
    document.getElementById('ym-drawer-status').className = 'px-2 py-0.5 rounded-full text-[10px] font-bold ' + (order.status === 'completed' ? 'bg-secondary-container text-on-secondary-container' : order.status === 'in_progress' ? 'bg-primary/10 text-primary' : 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant');
    document.getElementById('ym-drawer-machine-name').textContent = order.machine?.name || 'Unknown Machine';
    const machineObj = machines.find(m => m.id === order.machineId);
    document.getElementById('ym-drawer-location').textContent = machineObj?.plant?.name || order.location || 'Plant Floor';

    document.getElementById('ym-tech-name').textContent = order.assignedTo || 'Unassigned';
    document.getElementById('ym-tech-role').textContent = 'L3 Automation Specialist';
    document.getElementById('ym-tech-score').textContent = '98%';

    const statusSelect = document.getElementById('ym-drawer-status-select');
    const prioritySelect = document.getElementById('ym-drawer-priority-select');
    const assignInput = document.getElementById('ym-drawer-assign-input');
    const notesTextarea = document.getElementById('ym-drawer-notes');
    if (statusSelect) statusSelect.value = order.status || 'open';
    if (prioritySelect) prioritySelect.value = order.priority || 'medium';
    if (assignInput) assignInput.value = order.assignedTo || '';
    if (notesTextarea) notesTextarea.value = order.notes || '';

    checklistItems = getChecklistForOrder(order);
    renderChecklist(order);
    renderParts(order);
    renderTimeline(order);
    renderHistory(order);

    drawer.style.display = 'flex';
    backdrop.style.display = 'block';
    setTimeout(() => {
      drawer.classList.remove('drawer-enter');
      drawer.classList.add('drawer-enter-active');
      backdrop.classList.add('open');
    }, 10);
  }

  function closeDrawer() {
    const drawer = document.getElementById('ym-detail-drawer');
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

  function renderFilters() {
    const f = getActiveFilters();

    const statusContainer = document.getElementById('ym-status-filters');
    if (statusContainer) {
      const statuses = ['open', 'in_progress', 'completed', 'blocked'];
      statusContainer.innerHTML = statuses.map(s => {
        const active = f.status.includes(s);
        return `<label class="flex items-center gap-1.5 p-1.5 hover:bg-primary/5 rounded-lg cursor-pointer transition-colors">
          <input type="checkbox" value="${s}" ${active ? 'checked' : ''} class="rounded border-outline-variant text-primary focus:ring-primary status-filter"/>
          <span class="text-sm capitalize">${s.replace(/_/g, ' ')}</span>
        </label>`;
      }).join('');
      statusContainer.querySelectorAll('.status-filter').forEach(cb => {
        cb.addEventListener('change', function() {
          const nf = getActiveFilters();
          const val = this.value;
          if (this.checked) { if (!nf.status.includes(val)) nf.status.push(val); }
          else { nf.status = nf.status.filter(v => v !== val); }
          setFiltersToURL(nf);
          applyFilters();
        });
      });
    }

    const priorityContainer = document.getElementById('ym-priority-filters');
    if (priorityContainer) {
      const priorities = ['critical', 'high', 'medium', 'low'];
      priorityContainer.innerHTML = priorities.map(p => {
        const active = f.priority.includes(p);
        return `<label class="flex items-center gap-1.5 p-1.5 hover:bg-primary/5 rounded-lg cursor-pointer transition-colors">
          <input type="checkbox" value="${p}" ${active ? 'checked' : ''} class="rounded border-outline-variant text-primary focus:ring-primary priority-filter"/>
          <span class="text-sm capitalize">${p}</span>
        </label>`;
      }).join('');
      priorityContainer.querySelectorAll('.priority-filter').forEach(cb => {
        cb.addEventListener('change', function() {
          const nf = getActiveFilters();
          const val = this.value;
          if (this.checked) { if (!nf.priority.includes(val)) nf.priority.push(val); }
          else { nf.priority = nf.priority.filter(v => v !== val); }
          setFiltersToURL(nf);
          applyFilters();
        });
      });
    }

    const locationContainer = document.getElementById('ym-location-filters');
    if (locationContainer) {
      const locations = [...new Set(machines.map(m => m.plant?.name).filter(Boolean))];
      locationContainer.innerHTML = locations.map(l => {
        const active = f.location.includes(l);
        return `<label class="flex items-center gap-1.5 p-1.5 hover:bg-primary/5 rounded-lg cursor-pointer transition-colors">
          <input type="checkbox" value="${l}" ${active ? 'checked' : ''} class="rounded border-outline-variant text-primary focus:ring-primary location-filter"/>
          <span class="text-sm">${l}</span>
        </label>`;
      }).join('');
      locationContainer.querySelectorAll('.location-filter').forEach(cb => {
        cb.addEventListener('change', function() {
          const nf = getActiveFilters();
          const val = this.value;
          if (this.checked) { if (!nf.location.includes(val)) nf.location.push(val); }
          else { nf.location = nf.location.filter(v => v !== val); }
          setFiltersToURL(nf);
          applyFilters();
        });
      });
    }

  }

  function attachResetHandlers() {
    document.getElementById('ym-reset-status')?.addEventListener('click', () => {
      const nf = getActiveFilters(); nf.status = []; setFiltersToURL(nf); applyFilters();
    });
    document.getElementById('ym-reset-priority')?.addEventListener('click', () => {
      const nf = getActiveFilters(); nf.priority = []; setFiltersToURL(nf); applyFilters();
    });
    document.getElementById('ym-reset-location')?.addEventListener('click', () => {
      const nf = getActiveFilters(); nf.location = []; setFiltersToURL(nf); applyFilters();
    });
    document.getElementById('ym-reset-all')?.addEventListener('click', () => {
      window.history.replaceState(null, '', window.location.pathname);
      applyFilters();
    });
  }

  function renderActiveFilters() {
    const container = document.getElementById('ym-active-filters');
    if (!container) return;
    const f = getActiveFilters();
    const chips = [];
    f.status.forEach(s => chips.push({ label: s.replace(/_/g, ' ').toUpperCase(), group: 'status', value: s }));
    f.priority.forEach(p => chips.push({ label: p.toUpperCase(), group: 'priority', value: p }));
    f.location.forEach(l => chips.push({ label: l, group: 'location', value: l }));
    if (!chips.length) { container.innerHTML = ''; return; }
    container.innerHTML = chips.map(c => `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-label-caps cursor-pointer hover:bg-primary/20 transition-all active-filter-chip" data-group="${c.group}" data-value="${c.value}">${c.label} <span class="material-symbols-outlined text-[12px]">close</span></span>`).join('');
    container.querySelectorAll('.active-filter-chip').forEach(chip => {
      chip.addEventListener('click', function() {
        const nf = getActiveFilters();
        const g = this.dataset.group;
        const v = this.dataset.value;
        nf[g] = nf[g].filter(x => x !== v);
        setFiltersToURL(nf);
        applyFilters();
      });
    });
  }

  function applyFilters() {
    const f = getActiveFilters();
    filteredOrders = orders.filter(o => {
      if (f.status.length && !f.status.includes(o.status)) return false;
      if (f.priority.length && !f.priority.includes(o.priority)) return false;
      if (f.location.length) {
        const machineObj = machines.find(m => m.id === o.machineId);
        const loc = machineObj?.plant?.name || '';
        if (!f.location.includes(loc)) return false;
      }
      if (f.search) {
        const q = f.search.toLowerCase();
        const machineObj = machines.find(m => m.id === o.machineId);
        const plant = machineObj?.plant?.name || '';
        const matchesId = String(o.id).toLowerCase().includes(q);
        const matchesAsset = (o.machine?.name || '').toLowerCase().includes(q);
        const matchesEngineer = (o.assignedTo || '').toLowerCase().includes(q);
        const matchesPlant = plant.toLowerCase().includes(q);
        const matchesIssue = (o.title || '').toLowerCase().includes(q);
        if (!matchesId && !matchesAsset && !matchesEngineer && !matchesPlant && !matchesIssue) return false;
      }
      return true;
    });
    renderOrders();
    renderFilters();
  }

  function renderStats() {
    const target = filteredOrders.length ? filteredOrders : orders;
    const totalOrders = target.length;
    const activeOrders = target.filter(o => o.status !== 'completed').length;
    const todayStr = new Date().toDateString();
    const completedToday = target.filter(o => o.status === 'completed' && o.updatedAt && new Date(o.updatedAt).toDateString() === todayStr).length;
    const overdueOrders = target.filter(o => o.status !== 'completed' && o.dueDate && new Date(o.dueDate) < new Date()).length;
    const completedTotal = target.filter(o => o.status === 'completed').length;
    const avgCompletion = totalOrders ? Math.round(completedTotal / totalOrders * 100) : 0;
    document.getElementById('ym-active-count').textContent = activeOrders;
    document.getElementById('ym-completed-count').textContent = completedToday;
    document.getElementById('ym-avg-completion').textContent = avgCompletion;
    document.getElementById('ym-overdue-count').textContent = overdueOrders;
  }

  let sortBy = 'status', sortAsc = true;
  let pageSize = 10, currentPage = 1;

  function renderTable() {
    const tbody = document.getElementById('ym-table-body');
    const container = document.getElementById('ym-table-container');
    if (!tbody || !container) return;
    if (!filteredOrders.length) {
      container.style.display = 'block';
      tbody.innerHTML = '';
      return;
    }
    container.style.display = 'block';

    const sorted = [...filteredOrders].sort((a, b) => {
      let va, vb;
      if (sortBy === 'machine') { va = (a.machine?.name || '').toLowerCase(); vb = (b.machine?.name || '').toLowerCase(); }
      else if (sortBy === 'plant') { const pa = machines.find(m => m.id === a.machineId); const pb = machines.find(m => m.id === b.machineId); va = (pa?.plant?.name || '').toLowerCase(); vb = (pb?.plant?.name || '').toLowerCase(); }
      else if (sortBy === 'dueDate') { va = a.dueDate || ''; vb = b.dueDate || ''; }
      else { va = (a[sortBy] || '').toString().toLowerCase(); vb = (b[sortBy] || '').toString().toLowerCase(); }
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const page = sorted.slice(start, start + pageSize);

    tbody.innerHTML = page.map(o => {
      const machineObj = machines.find(m => m.id === o.machineId);
      const plant = machineObj?.plant?.name || o.location || '—';
      return `<tr class="border-b border-outline-variant/10 hover:bg-primary/5 cursor-pointer transition-colors" data-order-id="${o.id}">
        <td class="px-4 py-3 font-mono text-xs text-on-surface-variant whitespace-nowrap">#${String(o.id).substring(0, 8)}</td>
        <td class="px-4 py-3 font-medium text-on-surface text-sm whitespace-nowrap">${o.machine?.name || '—'}</td>
        <td class="px-4 py-3 text-on-surface text-sm">${o.title || '—'}</td>
        <td class="px-4 py-3 whitespace-nowrap">${priorityBadge(o.priority)}</td>
        <td class="px-4 py-3 text-on-surface text-sm whitespace-nowrap">${o.assignedTo || '—'}</td>
        <td class="px-4 py-3 text-on-surface-variant text-xs whitespace-nowrap">${o.dueDate ? new Date(o.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
        <td class="px-4 py-3 text-on-surface-variant text-xs whitespace-nowrap">${plant}</td>
        <td class="px-4 py-3 whitespace-nowrap">${statusBadge(o.status)}</td>
      </tr>`;
    }).join('');
    tbody.querySelectorAll('[data-order-id]').forEach(el => {
      el.addEventListener('click', function() {
        const id = this.dataset.orderId;
        const order = orders.find(o => o.id === id);
        if (order) openDrawer(order);
      });
    });

    document.getElementById('ym-table-info').textContent = sorted.length + ' orders' + (filteredOrders.length < orders.length ? ' (' + filteredOrders.length + ' filtered)' : '');
    document.getElementById('ym-page-info').textContent = currentPage + ' / ' + totalPages;
    document.getElementById('ym-page-prev').disabled = currentPage <= 1;
    document.getElementById('ym-page-next').disabled = currentPage >= totalPages;

    /* Update sort arrows */
    document.querySelectorAll('#ym-orders-table th[data-sort]').forEach(th => {
      const key = th.dataset.sort;
      th.classList.toggle('is-sorted', key === sortBy);
      const arrow = th.querySelector('.sort-arrow');
      if (arrow) arrow.textContent = key === sortBy ? (sortAsc ? '\u25B2' : '\u25BC') : '\u25B2';
    });
  }

  function renderOrders() {
    const loadingEl = document.getElementById('ym-loading-state');
    if (loadingEl) loadingEl.style.display = 'none';
    renderStats();
    renderActiveFilters();

    const emptyEl = document.getElementById('ym-table-empty');
    const emptyMsg = document.getElementById('ym-empty-msg');

    if (!filteredOrders.length) {
      const hasFilters = getActiveFilters().status.length || getActiveFilters().priority.length || getActiveFilters().location.length || getActiveFilters().search;
      if (emptyMsg) emptyMsg.textContent = hasFilters ? 'No work orders match your filters' : 'No work orders yet';
      if (emptyEl) emptyEl.style.display = 'flex';
      renderTable();
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    renderTable();
  }

  async function pauseSession() {
    if (!selectedOrder) return toast('No work order selected', 'error');
    const btn = document.getElementById('ym-pause-btn');
    btn.disabled = true;
    const isBlocked = selectedOrder.status === 'blocked';
    const newStatus = isBlocked ? 'in_progress' : 'blocked';
    try {
      await patch('/api/work-orders/' + selectedOrder.id, { status: newStatus });
      selectedOrder.status = newStatus;
      btn.textContent = isBlocked ? 'BLOCK SESSION' : 'MARK BLOCKED';
      toast(isBlocked ? 'Session resumed' : 'Session blocked');
      await loadOrders();
    } catch (e) { toast('Failed to update session', 'error'); }
    btn.disabled = false;
  }

  async function markComplete() {
    if (!selectedOrder) return toast('No work order selected', 'error');
    const incomplete = checklistItems.filter(i => i.state !== 'completed');
    if (incomplete.length > 0) {
      toast(incomplete.length + ' task(s) not completed. Complete all tasks first.', 'error');
      return;
    }
    const btn = document.getElementById('ym-complete-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> PROCESSING...';
    try {
      await patch('/api/work-orders/' + selectedOrder.id, { status: 'completed' });
      selectedOrder.status = 'completed';
      btn.innerHTML = '<span class="material-symbols-outlined text-sm">check_circle</span> COMPLETED';
      toast('Work order marked complete.');
      await loadOrders();
      setTimeout(() => { btn.disabled = false; btn.innerHTML = 'MARK AS COMPLETE'; }, 3000);
    } catch (e) { toast('Failed to complete order', 'error'); btn.disabled = false; btn.innerHTML = 'MARK AS COMPLETE'; }
  }

  async function saveDrawerChanges() {
    if (!selectedOrder) return;
    const statusSelect = document.getElementById('ym-drawer-status-select');
    const prioritySelect = document.getElementById('ym-drawer-priority-select');
    const assignInput = document.getElementById('ym-drawer-assign-input');
    const notesTextarea = document.getElementById('ym-drawer-notes');
    const status = statusSelect?.value;
    const priority = prioritySelect?.value;
    const assignedTo = assignInput?.value.trim();
    const notes = notesTextarea?.value.trim();
    const payload = {};
    if (status && status !== selectedOrder.status) payload.status = status;
    if (priority && priority !== selectedOrder.priority) payload.priority = priority;
    if (assignedTo && assignedTo !== (selectedOrder.assignedTo || '')) payload.assignedTo = assignedTo;
    if (notes && notes !== (selectedOrder.notes || '')) payload.notes = notes;
    if (!Object.keys(payload).length) return toast('No changes to save');
    const btn = document.getElementById('ym-drawer-save-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> SAVING...'; }
    try {
      await patch('/api/work-orders/' + selectedOrder.id, payload);
      toast('Work order updated');
      const updatedOrder = { ...selectedOrder, ...payload };
      if (payload.status && payload.status !== selectedOrder.status) {
        if (!updatedOrder.statusHistory) updatedOrder.statusHistory = [];
        updatedOrder.statusHistory.push({ status: payload.status, timestamp: new Date().toISOString(), note: 'Updated via drawer' });
      }
      selectedOrder = updatedOrder;
      openDrawer(selectedOrder);
      await loadOrders();
    } catch (e) { toast('Failed to update work order', 'error'); }
    if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-sm">save</span> SAVE CHANGES'; }
  }

  async function closeOrder() {
    if (!selectedOrder) return;
    if (!confirm('Are you sure you want to close this work order?')) return;
    const btn = document.getElementById('ym-close-order-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> CLOSING...'; }
    try {
      await patch('/api/work-orders/' + selectedOrder.id, { status: 'cancelled' });
      toast('Work order closed');
      closeDrawer();
      await loadOrders();
    } catch (e) { toast('Failed to close order', 'error'); }
    if (btn) { btn.disabled = false; btn.innerHTML = 'CLOSE ORDER'; }
  }

  function createOrderModal() {
    const machineOptions = machines.map(m => `<option value="${m.id}">${m.name} (${m.plant?.name || ''})</option>`).join('');
    const body = `<form id="ym-create-form" class="space-y-md">
      <div>
        <label class="font-label-caps text-label-caps text-on-surface-variant block mb-1">TITLE</label>
        <input required class="w-full border border-outline-variant/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none bg-white/80" id="ym-form-title" placeholder="e.g., Inspect Conveyor Line PN-601"/>
      </div>
      <div>
        <label class="font-label-caps text-label-caps text-on-surface-variant block mb-1">DESCRIPTION</label>
        <textarea class="w-full border border-outline-variant/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none bg-white/80" id="ym-form-description" placeholder="Describe the work needed..." rows="2"></textarea>
      </div>
      <div class="grid grid-cols-2 gap-md">
        <div>
          <label class="font-label-caps text-label-caps text-on-surface-variant block mb-1">MACHINE</label>
          <select class="w-full border border-outline-variant/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none bg-white/80" id="ym-form-machine">
            <option value="">Select machine...</option>
            ${machineOptions}
          </select>
        </div>
        <div>
          <label class="font-label-caps text-label-caps text-on-surface-variant block mb-1">PRIORITY</label>
          <select class="w-full border border-outline-variant/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none bg-white/80" id="ym-form-priority">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-md">
        <div>
          <label class="font-label-caps text-label-caps text-on-surface-variant block mb-1">ASSIGNED TO</label>
          <input class="w-full border border-outline-variant/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none bg-white/80" id="ym-form-assignee" placeholder="Technician name"/>
        </div>
        <div>
          <label class="font-label-caps text-label-caps text-on-surface-variant block mb-1">DUE DATE</label>
          <input type="date" class="w-full border border-outline-variant/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none bg-white/80" id="ym-form-duedate"/>
        </div>
      </div>
      <button type="submit" class="w-full shimmer-btn py-3.5 rounded-full text-on-primary font-label-caps text-label-caps shadow-lg text-sm flex items-center justify-center gap-xs">
        <span class="material-symbols-outlined text-[20px]">add_task</span> CREATE WORK ORDER
      </button>
    </form>`;
    const wrap = openModal('Create Work Order', body);
    const form = wrap.querySelector('#ym-create-form');
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const title = document.getElementById('ym-form-title').value.trim();
      if (!title) return toast('Title is required', 'error');
      const btn = this.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> CREATING...';
      try {
        const payload = {
          title,
          description: document.getElementById('ym-form-description').value.trim(),
          machineId: document.getElementById('ym-form-machine').value || undefined,
          priority: document.getElementById('ym-form-priority').value,
          assignedTo: document.getElementById('ym-form-assignee').value.trim() || undefined,
          dueDate: document.getElementById('ym-form-duedate').value ? new Date(document.getElementById('ym-form-duedate').value).toISOString() : undefined
        };
        await post('/api/work-orders', payload);
        toast('Work order created successfully');
        wrap.classList.remove('open');
        setTimeout(() => wrap.remove(), 250);
        await loadOrders();
      } catch (e) { toast('Failed to create order', 'error'); }
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">add_task</span> CREATE WORK ORDER';
    });
  }

/* Removed old askYantraNklan - replaced by work-chat.js module */

  async function loadOrders() {
    try {
      const data = await get('/api/work-orders');
      orders = data;
      applyFilters();
    } catch (e) {
      console.error('loadOrders error:', e);
      const loadingEl = document.getElementById('ym-loading-state');
      if (loadingEl) loadingEl.innerHTML = '<span class="material-symbols-outlined text-error">error</span><span class="text-sm font-bold text-error">Failed to load work orders</span>';
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const me = await get('/api/auth/me');
      if (!me || !me.id) { window.location.href = '/'; return; }
      currentUser = me;
    } catch { window.location.href = '/'; return; }

    try {
      const machinesData = await get('/api/machines');
      machines = machinesData;
    } catch {}

    renderFilters();
    attachResetHandlers();
    await loadOrders();

    document.getElementById('ym-empty-reset')?.addEventListener('click', () => {
      window.history.replaceState(null, '', window.location.pathname);
      document.getElementById('ym-search-input').value = '';
      applyFilters();
    });

    const f = getActiveFilters();
    if (f.search) {
      document.getElementById('ym-search-input').value = f.search;
    }

    document.getElementById('ym-drawer-close')?.addEventListener('click', closeDrawer);
    document.getElementById('ym-drawer-backdrop')?.addEventListener('click', closeDrawer);
    document.getElementById('ym-tech-card')?.addEventListener('click', () => {
      if (selectedOrder) openTechModal({ name: selectedOrder.assignedTo || 'Elias Thorne', role: 'L3 Automation Specialist', score: 98, experience: '8 yrs' });
    });
    document.getElementById('ym-tech-view')?.addEventListener('click', () => {
      if (selectedOrder) openTechModal({ name: selectedOrder.assignedTo || 'Elias Thorne', role: 'L3 Automation Specialist', score: 98, experience: '8 yrs' });
    });
    document.getElementById('ym-pause-btn')?.addEventListener('click', pauseSession);
    document.getElementById('ym-complete-btn')?.addEventListener('click', markComplete);
    document.getElementById('ym-create-order')?.addEventListener('click', createOrderModal);
    document.getElementById('ym-drawer-save-btn')?.addEventListener('click', saveDrawerChanges);
    document.getElementById('ym-close-order-btn')?.addEventListener('click', closeOrder);

    document.getElementById('ym-search-input')?.addEventListener('input', function() {
      const nf = getActiveFilters();
      nf.search = this.value;
      setFiltersToURL(nf);
      applyFilters();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawerOpen) closeDrawer();
    });

    /* Table sorting */
    document.querySelectorAll('#ym-orders-table th[data-sort]').forEach(th => {
      th.addEventListener('click', function() {
        const key = this.dataset.sort;
        if (sortBy === key) sortAsc = !sortAsc;
        else { sortBy = key; sortAsc = true; }
        currentPage = 1;
        renderTable();
      });
    });

    /* Pagination */
    document.getElementById('ym-page-prev')?.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderTable(); }
    });
    document.getElementById('ym-page-next')?.addEventListener('click', () => {
      const total = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
      if (currentPage < total) { currentPage++; renderTable(); }
    });

    window.addEventListener('popstate', () => {
      const nf = getFiltersFromURL();
      document.getElementById('ym-search-input').value = nf.search || '';
      renderFilters();
      applyFilters();
    });
  });
})();
