(function() {
  const API = { base: '' };
  async function get(path) { const r = await fetch(path, { credentials: 'same-origin' }); if (!r.ok) throw new Error(path); return r.json(); }
  async function post(path, body) { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) }); if (!r.ok) throw new Error(path); return r.json(); }
  async function patch(path, body) { const r = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) }); if (!r.ok) throw new Error(path); return r.json(); }

  let orders = [];
  let selectedOrder = null;
  let checklistItems = [];
  let currentUser = null;
  let drawerOpen = false;

  function toast(message, type) {
    const container = document.getElementById('ym-toast-container');
    const el = document.createElement('div');
    el.className = 'rounded-full border px-5 py-3 text-sm font-bold shadow-xl pointer-events-auto ' + (type === 'error' ? 'border-error/20 bg-error/95 text-white' : 'border-primary/20 bg-white/95 text-primary');
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2600);
  }

  function formatDate(d) {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  function statusBadge(status) {
    const map = { open: 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant', in_progress: 'bg-primary/10 text-primary', completed: 'bg-secondary-container text-on-secondary-container', blocked: 'bg-error-container text-on-error-container' };
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${map[status] || map.open}">${status.replace(/_/g, ' ').toUpperCase()}</span>`;
  }

  function priorityBadge(priority) {
    const map = { low: 'bg-surface-container text-on-surface-variant', medium: 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant', high: 'bg-primary/10 text-primary', critical: 'bg-error-container text-on-error-container' };
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${map[priority] || map.medium}">${priority.toUpperCase()}</span>`;
  }

  function orderIcon(order) {
    const icons = { 'Hydraulic': 'precision_manufacturing', 'Generator': 'bolt', 'Belt': 'conveyor_belt', 'Pump': 'water_pump', 'Motor': 'electric_bolt', 'Valve': 'settings_input_component', 'Sensor': 'sensors', 'Calibration': 'tune', 'Inspection': 'search_insights', 'Repair': 'build' };
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
  }

  function openTechModal(tech) {
    const skills = ['PLC Programming', 'Hydraulic Systems', 'CNC Calibration', 'Predictive Maintenance', 'Robotics', 'Welding'];
    const assignedMachines = ['RX-900 ARM', 'CNC Cell PNA-01', 'Conveyor C-404', 'Pump P-102'];
    const openOrders = orders.filter(o => o.assignedTo === tech.name && o.status !== 'completed');
    openModal('Technician Profile', `
      <div class="flex items-center gap-md mb-md">
        <img src="/images/ym-operator-avatar.jpg" class="w-20 h-20 rounded-full border-2 border-primary/20 object-cover"/>
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
        <div class="space-y-1">${assignedMachines.map(m => `<div class="flex items-center gap-xs text-sm text-on-surface"><span class="material-symbols-outlined text-sm text-primary">precision_manufacturing</span>${m}</div>`).join('')}</div>
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
    const compatibleMachines = ['RX-900 ARM', 'CNC Cell PNA-01', 'Conveyor C-404'];
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
      <div class="mb-md">
        <p class="font-label-caps text-label-caps text-on-surface-variant mb-xs">COMPATIBLE MACHINES</p>
        <div class="space-y-1">${compatibleMachines.map(m => `<div class="flex items-center gap-xs text-sm text-on-surface"><span class="material-symbols-outlined text-sm text-primary">precision_manufacturing</span>${m}</div>`).join('')}</div>
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
    try {
      sessionStorage.setItem('ym-checklist-' + orderId, JSON.stringify(items));
    } catch {}
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
        const done = checklistItems.filter(i => i.state === 'completed').length;
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
    document.getElementById('ym-drawer-location').textContent = order.location || 'Plant Floor';

    checklistItems = getChecklistForOrder(order);
    renderChecklist(order);
    renderParts(order);
    renderTimeline(order);

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

  async function loadOrders() {
    try {
      const data = await get('/api/work-orders');
      orders = data;
      const container = document.getElementById('ym-orders-list');
      if (!container) return;
      const actives = orders.filter(o => o.status !== 'completed');
      const completions = orders.filter(o => o.status === 'completed').length;
      const total = orders.length;
      const overdue = orders.filter(o => o.status !== 'completed' && o.dueDate && new Date(o.dueDate) < new Date()).length;
      const avgCompletion = total ? Math.round(completions / total * 100) : 0;
      document.getElementById('ym-active-count').textContent = actives.length;
      document.getElementById('ym-completed-count').textContent = completions;
      document.getElementById('ym-avg-completion').textContent = avgCompletion;
      document.getElementById('ym-overdue-count').textContent = overdue;

      const statusOrder = { 'in_progress': 0, 'open': 1, 'blocked': 2, 'completed': 3 };
      const sorted = [...orders].sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));
      container.innerHTML = sorted.map((o, idx) => {
        const isSelected = selectedOrder && selectedOrder.id === o.id;
        return `<div class="glass-card rounded-xl p-md flex items-center gap-md ${isSelected ? 'border-l-4 border-primary ring-2 ring-primary/20' : 'hover:bg-white/80 transition-all cursor-pointer'}" data-order-id="${o.id}">
          <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <span class="material-symbols-outlined text-primary">${orderIcon(o)}</span>
          </div>
          <div class="flex-grow min-w-0">
            <div class="flex items-center gap-xs">
              <h3 class="font-semibold text-on-surface truncate">${o.title}</h3>
              ${priorityBadge(o.priority)}
            </div>
            <p class="text-sm text-on-surface-variant mt-1 truncate">Asset: ${o.machine?.name || 'Unknown'} ${o.assignedTo ? '• ' + o.assignedTo : ''}</p>
          </div>
          <div class="text-right shrink-0">
            <div class="flex items-center justify-end gap-1.5">
              <div class="w-2 h-2 rounded-full ${o.status === 'in_progress' ? 'bg-secondary status-glow-teal' : o.status === 'completed' ? 'bg-outline-variant' : o.status === 'blocked' ? 'bg-error status-glow-coral' : 'bg-outline-variant'}"></div>
              ${statusBadge(o.status)}
            </div>
            <span class="text-xs text-on-surface-variant block mt-1">${o.dueDate ? 'Due ' + new Date(o.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</span>
          </div>
        </div>`;
      }).join('');
      container.querySelectorAll('[data-order-id]').forEach(el => {
        el.addEventListener('click', function() {
          const id = this.dataset.orderId;
          const order = orders.find(o => o.id === id);
          if (order) openDrawer(order);
        });
      });
    } catch (e) { console.error('loadOrders error:', e); }
  }

  async function pauseSession() {
    if (!selectedOrder) return toast('No work order selected', 'error');
    const btn = document.getElementById('ym-pause-btn');
    btn.disabled = true;
    const isPaused = selectedOrder.status === 'paused';
    const newStatus = isPaused ? 'in_progress' : 'paused';
    try {
      await patch('/api/work-orders/' + selectedOrder.id, { status: newStatus });
      await post('/api/timeline/event', { orderId: selectedOrder.id, event: isPaused ? 'resumed' : 'paused', actor: currentUser?.name || 'Operator' }).catch(() => {});
      selectedOrder.status = newStatus;
      btn.textContent = isPaused ? 'PAUSE SESSION' : 'RESUME SESSION';
      btn.classList.toggle('border-primary', !isPaused);
      btn.classList.toggle('text-primary', !isPaused);
      btn.classList.toggle('border-secondary', isPaused);
      btn.classList.toggle('text-secondary', isPaused);
      toast(isPaused ? 'Session resumed' : 'Session paused');
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
      await post('/api/timeline/event', { orderId: selectedOrder.id, event: 'completed', actor: currentUser?.name || 'Operator' }).catch(() => {});
      await post('/api/dashboard/kpi', { type: 'work_order_completed', value: 1 }).catch(() => {});
      selectedOrder.status = 'completed';
      btn.innerHTML = '<span class="material-symbols-outlined text-sm">check_circle</span> COMPLETED';
      toast('Work order marked complete. Dashboard KPIs updated.');
      await loadOrders();
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = 'MARK AS COMPLETE';
      }, 3000);
    } catch (e) { toast('Failed to complete order', 'error'); btn.disabled = false; btn.innerHTML = 'MARK AS COMPLETE'; }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const me = await get('/api/auth/me');
      if (!me || !me.id) { window.location.href = '/login'; return; }
      currentUser = me;
    } catch { window.location.href = '/login'; return; }
    await loadOrders();
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
    document.getElementById('ym-create-order')?.addEventListener('click', async function() {
      this.disabled = true;
      this.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> CREATING';
      try {
        await post('/api/work-orders', {
          title: 'Inspect Conveyor Line PN-601',
          description: 'Created from Work Orders dashboard',
          status: 'open',
          priority: 'high',
          assignedTo: 'Elias Thorne',
          dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        });
        toast('Work order created and assigned to Elias Thorne');
        await loadOrders();
      } catch (e) { toast('Failed to create order', 'error'); }
      this.disabled = false;
      this.innerHTML = '<span class="material-symbols-outlined text-[20px]">add</span> CREATE ORDER';
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawerOpen) closeDrawer();
    });
  });
})();