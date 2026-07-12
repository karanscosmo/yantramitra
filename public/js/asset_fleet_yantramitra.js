(function() {
  const pageSize = 10;
  let machines = [];
  let filtered = [];
  let activeFilter = 'all';
  let page = 1;

  async function get(path) {
    const response = await fetch(path, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(path);
    return response.json();
  }

  async function post(path, body) {
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || 'Request failed');
    return json;
  }

  function statusOf(machine) {
    const health = Number(machine.health || 0);
    if (machine.status === 'maintenance' || health < 55) return 'critical';
    if (machine.status === 'warning' || health < 80) return 'warning';
    return 'healthy';
  }

  function statusLabel(machine) {
    const status = statusOf(machine);
    if (status === 'critical') return { label: 'Critical', text: 'text-error', dot: 'bg-error pulse-coral' };
    if (status === 'warning') return { label: 'Warning', text: 'text-tertiary', dot: 'bg-tertiary-fixed-dim pulse-amber' };
    return { label: 'Optimal', text: 'text-secondary', dot: 'bg-secondary pulse-teal' };
  }

  function agentIcons(machine) {
    const activeAlarm = (machine.alarms || []).some(alarm => alarm.status === 'active');
    const icons = ['smart_toy'];
    if (activeAlarm || statusOf(machine) !== 'healthy') icons.push('sensors');
    return icons.map((icon, index) => `<button data-agent="${machine.id}" class="w-7 h-7 rounded-full bg-surface-container border border-outline-variant/20 flex items-center justify-center material-symbols-outlined text-[16px] ${index ? 'text-secondary' : 'text-primary'}" title="Open agent context">${icon}</button>`).join('');
  }

  function row(machine) {
    const s = statusLabel(machine);
    const health = Math.round(machine.health || 0);
    const last = machine.updatedAt ? new Date(machine.updatedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Live feed';
    return `<tr class="group hover:bg-primary/[0.03] transition-colors" data-status="${statusOf(machine)}" data-machine-id="${machine.id}">
      <td class="py-sm px-md">
        <div class="flex flex-col">
          <span class="font-kpi-numeric text-on-surface">${machine.name}</span>
          <span class="text-xs text-on-surface-variant">${machine.type ? machine.type.replace(/_/g, ' ') : machine.plant?.name || 'Monitored asset'}</span>
        </div>
      </td>
      <td class="py-sm px-md">
        <div class="flex items-center gap-sm">
          <div class="w-2.5 h-2.5 rounded-full ${s.dot}"></div>
          <span class="${s.text} font-bold text-xs uppercase tracking-wider">${s.label}</span>
        </div>
      </td>
      <td class="py-sm px-md">
        <div class="flex items-center gap-sm">
          <span class="font-kpi-numeric ${s.text}">${health}%</span>
          <div class="w-24 h-1.5 bg-outline-variant/20 rounded-full overflow-hidden">
            <div class="${statusOf(machine) === 'critical' ? 'bg-error' : statusOf(machine) === 'warning' ? 'bg-tertiary' : 'bg-secondary'} h-full rounded-full" style="width:${health}%"></div>
          </div>
        </div>
      </td>
      <td class="py-sm px-md"><div class="flex -space-x-2">${agentIcons(machine)}</div></td>
      <td class="py-sm px-md text-on-surface-variant text-sm">${last}</td>
      <td class="py-sm px-md text-right">
        <div class="flex justify-end gap-xs">
          <button data-view="${machine.id}" class="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors material-symbols-outlined" title="View Details">visibility</button>
          <button data-order="${machine.id}" class="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors material-symbols-outlined" title="Create Work Order">add_task</button>
        </div>
      </td>
    </tr>`;
  }

  function updateFilterButtons() {
    document.querySelectorAll('[data-fleet-filter]').forEach(button => {
      const active = button.dataset.fleetFilter === activeFilter;
      button.classList.toggle('bg-primary-container/20', active);
      button.classList.toggle('text-primary', active);
      button.classList.toggle('border-primary/20', active);
    });
  }

  function applyFilter() {
    filtered = activeFilter === 'all' ? machines.slice() : machines.filter(machine => statusOf(machine) === activeFilter);
    const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(page, maxPage);
  }

  function render() {
    applyFilter();
    updateFilterButtons();
    const tbody = document.querySelector('tbody');
    if (!tbody) return;
    const start = (page - 1) * pageSize;
    const visible = filtered.slice(start, start + pageSize);
    tbody.innerHTML = visible.map(row).join('') || `<tr><td colspan="6" class="py-lg px-md text-center text-on-surface-variant">No assets match this filter.</td></tr>`;

    tbody.querySelectorAll('[data-view]').forEach(button => {
      button.addEventListener('click', () => {
        if (button.dataset.view.startsWith('local-')) return showAssetModal(machines.find(item => item.id === button.dataset.view));
        window.location.href = '/assets/' + button.dataset.view;
      });
    });
    tbody.querySelectorAll('[data-agent]').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        window.location.href = '/agents?asset=' + encodeURIComponent(button.dataset.agent);
      });
    });
    tbody.querySelectorAll('[data-order]').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        createWorkOrder(button.dataset.order, button);
      });
    });
    tbody.querySelectorAll('tr[data-machine-id]').forEach(tr => {
      tr.addEventListener('dblclick', () => { window.location.href = '/assets/' + tr.dataset.machineId; });
    });

    const footerText = document.querySelector('.glass-card .border-t span');
    if (footerText) {
      const end = Math.min(filtered.length, start + visible.length);
      footerText.textContent = `Showing ${filtered.length ? start + 1 : 0}-${end} of ${filtered.length} Assets`;
    }
    renderPagination();
    updateStats();
    updateFilterCounts();
  }

  function renderPagination() {
    const controls = document.querySelector('.glass-card .border-t .flex.gap-xs');
    if (!controls) return;
    const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pageButtons = Array.from({ length: Math.min(3, maxPage) }, (_, i) => i + 1);
    controls.innerHTML = `
      <button data-page-prev class="p-1 border border-outline-variant/30 rounded hover:bg-primary/10 transition-colors material-symbols-outlined text-[18px]" ${page === 1 ? 'disabled' : ''}>chevron_left</button>
      ${pageButtons.map(num => `<button data-page="${num}" class="px-3 py-1 ${num === page ? 'bg-primary text-on-primary' : 'border border-outline-variant/30 text-on-surface-variant'} rounded font-label-caps text-[11px] hover:bg-primary/10 transition-colors">${num}</button>`).join('')}
      <button data-page-next class="p-1 border border-outline-variant/30 rounded hover:bg-primary/10 transition-colors material-symbols-outlined text-[18px]" ${page === maxPage ? 'disabled' : ''}>chevron_right</button>`;
    controls.querySelector('[data-page-prev]')?.addEventListener('click', () => { page = Math.max(1, page - 1); render(); });
    controls.querySelector('[data-page-next]')?.addEventListener('click', () => { page = Math.min(maxPage, page + 1); render(); });
    controls.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => { page = Number(button.dataset.page); render(); }));
  }

  function updateStats() {
    const stats = {
      healthy: machines.filter(machine => statusOf(machine) === 'healthy').length,
      warning: machines.filter(machine => statusOf(machine) === 'warning').length,
      critical: machines.filter(machine => statusOf(machine) === 'critical').length
    };
    const all = machines.length;
    const availability = all ? Math.round((stats.healthy / all) * 1000) / 10 : 0;
    const statValues = document.querySelectorAll('.grid.grid-cols-1.md\\:grid-cols-4 .font-kpi-numeric');
    if (statValues[0]) statValues[0].textContent = `${availability}%`;
    if (statValues[1]) statValues[1].textContent = String(stats.critical).padStart(2, '0');
    if (statValues[2]) statValues[2].textContent = String(Math.max(stats.warning + stats.critical, 1) * 4);
    if (statValues[3]) statValues[3].textContent = `${Math.min(98, Math.round((stats.healthy + stats.warning * 0.6) / Math.max(1, all) * 100))}%`;
  }

  function updateFilterCounts() {
    const counts = {
      all: machines.length,
      critical: machines.filter(machine => statusOf(machine) === 'critical').length,
      warning: machines.filter(machine => statusOf(machine) === 'warning').length,
      healthy: machines.filter(machine => statusOf(machine) === 'healthy').length
    };
    document.querySelectorAll('[data-fleet-filter]').forEach(button => {
      const label = button.dataset.fleetFilter === 'all' ? 'All Assets' : button.dataset.fleetFilter;
      button.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          node.textContent = ` ${label.toUpperCase()} (${counts[button.dataset.fleetFilter]}) `;
        }
      });
    });
  }

  function showAssetModal(machine) {
    if (!machine) return;
    document.querySelector('.ym-asset-register-modal')?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'ym-asset-register-modal fixed inset-0 z-[120] bg-on-surface/40 p-md flex items-center justify-center';
    wrap.innerHTML = `<section class="glass-card rounded-2xl p-lg w-full max-w-lg bg-white">
      <div class="flex items-start justify-between gap-md">
        <div><h2 class="font-section-header text-section-header">${machine.name}</h2><p class="text-sm text-on-surface-variant">${machine.type || 'Registered asset'} · ${statusOf(machine)}</p></div>
        <button type="button" data-close class="material-symbols-outlined p-2 rounded-full hover:bg-primary/10">close</button>
      </div>
      <div class="grid grid-cols-2 gap-sm mt-md">
        <div class="rounded-xl bg-surface-container-low p-sm"><p class="text-xs font-bold uppercase text-on-surface-variant">Health</p><p class="font-kpi-numeric text-primary text-2xl">${Math.round(machine.health || 0)}%</p></div>
        <div class="rounded-xl bg-surface-container-low p-sm"><p class="text-xs font-bold uppercase text-on-surface-variant">Plant</p><p class="font-bold">${machine.plant?.name || 'New facility'}</p></div>
      </div>
    </section>`;
    wrap.addEventListener('click', event => {
      if (event.target === wrap || event.target.closest('[data-close]')) wrap.remove();
    });
    document.body.appendChild(wrap);
  }

  async function createWorkOrder(machineId, button) {
    const machine = machines.find(item => item.id === machineId);
    if (!machine) return;
    button.disabled = true;
    button.textContent = 'sync';
    try {
      await post('/api/work-orders', {
        title: `Inspect ${machine.name}`,
        description: `Asset Fleet requested inspection for ${machine.name} at ${machine.plant?.name || 'plant'}.`,
        status: 'open',
        priority: statusOf(machine) === 'critical' ? 'critical' : statusOf(machine) === 'warning' ? 'high' : 'medium',
        machineId,
        assignedTo: 'Maintenance Agent',
        dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10)
      });
      button.textContent = 'check_circle';
      setTimeout(() => { button.textContent = 'add_task'; button.disabled = false; }, 1600);
    } catch {
      button.textContent = 'error';
      setTimeout(() => { button.textContent = 'add_task'; button.disabled = false; }, 1600);
    }
  }

  function exportCsv() {
    applyFilter();
    const rows = [['Asset', 'Type', 'Plant', 'Status', 'Health', 'Last Maintenance'], ...filtered.map(machine => [
      machine.name,
      machine.type || '',
      machine.plant?.name || '',
      statusOf(machine),
      Math.round(machine.health || 0),
      machine.updatedAt || ''
    ])];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'yantramitra-asset-fleet.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function showRegisterModal() {
    document.querySelector('.ym-asset-register-modal')?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'ym-asset-register-modal fixed inset-0 z-[120] bg-on-surface/40 p-md flex items-center justify-center';
    wrap.innerHTML = `<form class="glass-card rounded-2xl p-lg w-full max-w-lg space-y-sm bg-white">
      <div class="flex items-start justify-between gap-md">
        <div><h2 class="font-section-header text-section-header">Register Asset</h2><p class="text-sm text-on-surface-variant">Add a monitored asset to this fleet view.</p></div>
        <button type="button" data-close class="material-symbols-outlined p-2 rounded-full hover:bg-primary/10">close</button>
      </div>
      <label class="block text-xs font-bold uppercase text-on-surface-variant">Asset name<input name="name" required class="mt-1 w-full rounded-xl border-outline-variant/50"/></label>
      <label class="block text-xs font-bold uppercase text-on-surface-variant">Asset type<input name="type" required class="mt-1 w-full rounded-xl border-outline-variant/50" placeholder="CNC, pump, robot, conveyor"/></label>
      <label class="block text-xs font-bold uppercase text-on-surface-variant">Health score<input name="health" type="number" min="0" max="100" value="92" class="mt-1 w-full rounded-xl border-outline-variant/50"/></label>
      <label class="block text-xs font-bold uppercase text-on-surface-variant">Status<select name="status" class="mt-1 w-full rounded-xl border-outline-variant/50"><option value="running">Running</option><option value="warning">Warning</option><option value="maintenance">Critical maintenance</option></select></label>
      <button class="w-full rounded-xl bg-primary text-on-primary py-3 font-label-caps">Add Asset</button>
    </form>`;
    wrap.addEventListener('click', event => {
      if (event.target === wrap || event.target.closest('[data-close]')) wrap.remove();
    });
    wrap.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      machines.unshift({
        id: `local-${Date.now()}`,
        name: data.name,
        type: data.type,
        status: data.status,
        health: Number(data.health) || 92,
        plant: { name: 'Newly Registered Facility' },
        alarms: [],
        updatedAt: new Date().toISOString()
      });
      activeFilter = 'all';
      page = 1;
      render();
      wrap.remove();
    });
    document.body.appendChild(wrap);
  }

  function wireStaticControls() {
    const filterButtons = Array.from(document.querySelectorAll('button')).filter(button => /all assets|critical|warning|healthy/i.test(button.textContent));
    filterButtons.forEach(button => {
      const text = button.textContent.toLowerCase();
      button.dataset.fleetFilter = text.includes('critical') ? 'critical' : text.includes('warning') ? 'warning' : text.includes('healthy') ? 'healthy' : 'all';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        activeFilter = button.dataset.fleetFilter;
        page = 1;
        render();
      });
    });
    Array.from(document.querySelectorAll('button')).forEach(button => {
      const text = button.textContent.trim().toLowerCase();
      if (text.includes('register asset')) button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        showRegisterModal();
      });
      if (text.includes('export data')) button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        exportCsv();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const me = await get('/api/auth/me');
      if (!me?.id) return window.location.href = '/login';
      machines = await get('/api/machines');
      wireStaticControls();
      render();
    } catch {
      window.location.href = '/login';
    }
  });
})();
