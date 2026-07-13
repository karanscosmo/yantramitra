(function() {
  const API = { base: '' };
  async function get(path) { const r = await fetch(path, { credentials: 'same-origin' }); if (!r.ok) throw new Error(path); return r.json(); }

  let machines = [];
  let workOrders = [];
  let allTasks = [];
  let filteredTasks = [];

  const FILTER_KEYS = { locations: 'loc', priorities: 'pri', types: 'typ', search: 'q' };

  function getFiltersFromURL() {
    const p = new URLSearchParams(window.location.search);
    return {
      locations: p.get(FILTER_KEYS.locations) ? p.get(FILTER_KEYS.locations).split(',') : [],
      priorities: p.get(FILTER_KEYS.priorities) ? p.get(FILTER_KEYS.priorities).split(',') : [],
      types: p.get(FILTER_KEYS.types) ? p.get(FILTER_KEYS.types).split(',') : [],
      search: p.get(FILTER_KEYS.search) || ''
    };
  }

  function setFiltersToURL(filters) {
    const p = new URLSearchParams();
    if (filters.locations.length) p.set(FILTER_KEYS.locations, filters.locations.join(','));
    if (filters.priorities.length) p.set(FILTER_KEYS.priorities, filters.priorities.join(','));
    if (filters.types.length) p.set(FILTER_KEYS.types, filters.types.join(','));
    if (filters.search) p.set(FILTER_KEYS.search, filters.search);
    const qs = p.toString();
    const url = qs ? window.location.pathname + '?' + qs : window.location.pathname;
    window.history.replaceState(null, '', url);
  }

  function buildTask(machine, order) {
    const priority = order?.priority || 'medium';
    const status = order?.status || 'open';
    const type = order?.title?.toLowerCase().includes('repair') || order?.title?.toLowerCase().includes('reactive') ? 'reactive' : 'preventive';
    return {
      id: order?.id || machine.id + '-task',
      machineId: machine.id,
      machineName: machine.name,
      location: machine.plant?.name || machine.location || 'Unknown',
      plantLocation: machine.plant?.name || '',
      title: order?.title || 'Routine Check',
      priority,
      status,
      type,
      dueDate: order?.dueDate || null,
      assignedTo: order?.assignedTo || null,
      health: machine.health,
      machineType: machine.type
    };
  }

  function buildTasks() {
    const taskMap = {};
    machines.forEach(m => {
      const machineOrders = workOrders.filter(w => w.machineId === m.id);
      if (machineOrders.length) {
        machineOrders.forEach(o => {
          const t = buildTask(m, o);
          taskMap[t.id] = t;
        });
      } else {
        const t = buildTask(m, null);
        taskMap[t.id] = t;
      }
    });
    allTasks = Object.values(taskMap);
  }

  function getActiveFilters() {
    return getFiltersFromURL();
  }

  function applyFilters() {
    const f = getActiveFilters();
    filteredTasks = allTasks.filter(task => {
      if (f.locations.length && !f.locations.includes(task.plantLocation)) return false;
      if (f.priorities.length && !f.priorities.includes(task.priority)) return false;
      if (f.types.length && !f.types.includes(task.type)) return false;
      if (f.search) {
        const q = f.search.toLowerCase();
        if (!task.title.toLowerCase().includes(q) && !task.machineName.toLowerCase().includes(q) && !task.location.toLowerCase().includes(q) && !(task.assignedTo && task.assignedTo.toLowerCase().includes(q))) return false;
      }
      return true;
    });
    render();
  }

  function renderFilters() {
    const locContainer = document.getElementById('ym-location-filters');
    const priContainer = document.getElementById('ym-priority-filters');
    const typeContainer = document.getElementById('ym-type-filters');
    if (!locContainer) return;

    const active = getActiveFilters();

    const locations = [...new Set(machines.map(m => m.plant?.name).filter(Boolean))];
    locContainer.innerHTML = locations.map(loc => {
      const checked = active.locations.includes(loc);
      return `<label class="flex items-center gap-sm p-2 hover:bg-primary/5 rounded-lg cursor-pointer transition-colors">
        <input type="checkbox" value="${loc}" ${checked ? 'checked' : ''} class="rounded border-outline-variant text-primary focus:ring-primary location-filter"/>
        <span class="font-body-md text-on-surface">${loc}</span>
      </label>`;
    }).join('');

    const priorities = ['critical', 'high', 'medium', 'low'];
    const priorityColors = { critical: 'border-error/30 text-error bg-error/5', high: 'border-tertiary/30 text-tertiary bg-tertiary/5', medium: 'border-secondary/30 text-secondary bg-secondary/5', low: 'border-outline/30 text-on-surface-variant bg-surface-container-low' };
    priContainer.innerHTML = priorities.map(p => {
      const activeP = active.priorities.includes(p);
      return `<button class="priority-pill px-3 py-1.5 rounded-full border text-[11px] font-label-caps transition-all ${priorityColors[p]} ${activeP ? 'active ring-2 ring-offset-1' : 'hover:bg-opacity-20'}" data-priority="${p}">${p.toUpperCase()}</button>`;
    }).join('');

    const types = [
      { id: 'preventive', label: 'Preventive', icon: 'shield' },
      { id: 'reactive', label: 'Reactive', icon: 'warning' }
    ];
    typeContainer.innerHTML = types.map(t => {
      const activeT = active.types.includes(t.id);
      return `<div class="flex items-center justify-between p-2 cursor-pointer type-toggle" data-type="${t.id}">
        <div class="flex items-center gap-xs">
          <span class="material-symbols-outlined text-sm ${activeT ? 'text-primary' : 'text-on-surface-variant'}">${t.icon}</span>
          <span class="text-on-surface font-body-md">${t.label}</span>
        </div>
        <div class="w-10 h-5 rounded-full relative transition-all ${activeT ? 'bg-primary/20' : 'bg-surface-container-highest'}">
          <div class="absolute top-1 w-3 h-3 rounded-full transition-all ${activeT ? 'right-1 bg-primary' : 'left-1 bg-outline'}"></div>
        </div>
      </div>`;
    }).join('');

    document.querySelectorAll('.location-filter').forEach(cb => {
      cb.addEventListener('change', function() {
        const f = getActiveFilters();
        const val = this.value;
        if (this.checked) { if (!f.locations.includes(val)) f.locations.push(val); }
        else { f.locations = f.locations.filter(v => v !== val); }
        setFiltersToURL(f);
        applyFilters();
      });
    });

    document.querySelectorAll('.priority-pill').forEach(btn => {
      btn.addEventListener('click', function() {
        const f = getActiveFilters();
        const val = this.dataset.priority;
        if (f.priorities.includes(val)) f.priorities = f.priorities.filter(v => v !== val);
        else f.priorities.push(val);
        setFiltersToURL(f);
        applyFilters();
      });
    });

    document.querySelectorAll('.type-toggle').forEach(el => {
      el.addEventListener('click', function() {
        const f = getActiveFilters();
        const val = this.dataset.type;
        if (f.types.includes(val)) f.types = f.types.filter(v => v !== val);
        else f.types.push(val);
        setFiltersToURL(f);
        applyFilters();
      });
    });

    document.getElementById('ym-reset-locations')?.addEventListener('click', () => {
      const f = getActiveFilters();
      f.locations = [];
      setFiltersToURL(f);
      applyFilters();
    });
    document.getElementById('ym-reset-priority')?.addEventListener('click', () => {
      const f = getActiveFilters();
      f.priorities = [];
      setFiltersToURL(f);
      applyFilters();
    });
    document.getElementById('ym-reset-type')?.addEventListener('click', () => {
      const f = getActiveFilters();
      f.types = [];
      setFiltersToURL(f);
      applyFilters();
    });
    document.getElementById('ym-reset-all')?.addEventListener('click', () => {
      window.history.replaceState(null, '', window.location.pathname);
      applyFilters();
    });
    document.getElementById('ym-empty-reset')?.addEventListener('click', () => {
      window.history.replaceState(null, '', window.location.pathname);
      applyFilters();
    });
  }

  function renderActiveFilters() {
    const container = document.getElementById('ym-active-filters');
    if (!container) return;
    const f = getActiveFilters();
    const chips = [];
    f.locations.forEach(l => chips.push({ label: l, group: 'locations', value: l }));
    f.priorities.forEach(p => chips.push({ label: p.toUpperCase(), group: 'priorities', value: p }));
    f.types.forEach(t => chips.push({ label: t.charAt(0).toUpperCase() + t.slice(1), group: 'types', value: t }));

    if (!chips.length) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = '<span class="text-[10px] font-label-caps text-on-surface-variant mr-1">ACTIVE:</span> ' +
      chips.map(c => `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-label-caps cursor-pointer hover:bg-primary/20 transition-all active-filter-chip" data-group="${c.group}" data-value="${c.value}">${c.label} <span class="material-symbols-outlined text-[12px]">close</span></span>`).join('');

    container.querySelectorAll('.active-filter-chip').forEach(chip => {
      chip.addEventListener('click', function() {
        const f = getActiveFilters();
        const group = this.dataset.group;
        const value = this.dataset.value;
        f[group] = f[group].filter(v => v !== value);
        setFiltersToURL(f);
        applyFilters();
      });
    });
  }

  function renderTasks() {
    const grid = document.getElementById('ym-tasks-grid');
    const empty = document.getElementById('ym-empty-state');
    if (!grid) return;

    if (!filteredTasks.length) {
      grid.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }
    empty.style.display = 'none';

    const statusOrder = { 'in_progress': 0, 'open': 1, 'completed': 2 };
    const sorted = [...filteredTasks].sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

    const priorityColors = {
      critical: { bg: 'bg-error/90', glow: 'shadow-[0_0_15px_rgba(186,26,26,0.3)]', dot: 'bg-error' },
      high: { bg: 'bg-tertiary/90', glow: 'shadow-[0_0_15px_rgba(152,101,0,0.3)]', dot: 'bg-tertiary' },
      medium: { bg: 'bg-secondary/90', glow: 'shadow-[0_0_15px_rgba(0,107,95,0.3)]', dot: 'bg-secondary' },
      low: { bg: 'bg-outline/60', glow: '', dot: 'bg-outline' }
    };
    const statusLabels = { 'in_progress': 'IN PROGRESS', 'open': 'OPEN', 'completed': 'COMPLETED', 'blocked': 'BLOCKED' };
    const machineIcons = { 'CNC': 'precision_manufacturing', 'conveyor': 'conveyor_belt', 'HVAC': 'ac_unit', 'robot': 'robot_2', 'pump': 'water_pump', 'motor': 'electric_bolt', 'generator': 'bolt', 'default': 'precision_manufacturing' };

    grid.innerHTML = sorted.map(task => {
      const pc = priorityColors[task.priority] || priorityColors.medium;
      const iconKey = Object.keys(machineIcons).find(k => task.machineName.toLowerCase().includes(k));
      const icon = machineIcons[iconKey] || machineIcons.default;
      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
      const isCompleted = task.status === 'completed';
      const statusColor = isCompleted ? 'text-outline' : isOverdue ? 'text-error' : 'text-secondary';
      return `<div class="task-card glass-panel rounded-xl p-md flex items-center gap-md ${isCompleted ? 'opacity-60' : ''}">
        <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-primary">${icon}</span>
        </div>
        <div class="flex-grow min-w-0">
          <div class="flex items-center gap-xs flex-wrap">
            <h3 class="font-semibold text-on-surface truncate text-sm">${task.title}</h3>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isCompleted ? 'bg-secondary-container text-on-secondary-container' : pc.bg === 'bg-error/90' ? 'bg-error-container text-on-error-container' : pc.bg === 'bg-tertiary/90' ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant' : pc.bg === 'bg-secondary/90' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}">${task.priority.toUpperCase()}</span>
            <span class="text-[10px] font-bold ${statusColor}">${statusLabels[task.status] || 'OPEN'}</span>
          </div>
          <div class="flex items-center gap-sm mt-1 text-xs text-on-surface-variant">
            <span class="flex items-center gap-xs"><span class="material-symbols-outlined text-[12px]">precision_manufacturing</span>${task.machineName}</span>
            <span class="flex items-center gap-xs"><span class="material-symbols-outlined text-[12px]">location_on</span>${task.location}</span>
            ${task.assignedTo ? `<span class="flex items-center gap-xs"><span class="material-symbols-outlined text-[12px]">person</span>${task.assignedTo}</span>` : ''}
            ${isOverdue ? `<span class="flex items-center gap-xs text-error"><span class="material-symbols-outlined text-[12px]">schedule</span>OVERDUE</span>` : ''}
          </div>
        </div>
        <div class="flex items-center gap-sm shrink-0">
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 rounded-full ${task.health > 80 ? 'bg-secondary' : task.health > 60 ? 'bg-tertiary' : 'bg-error'}"></div>
            <span class="text-[10px] font-label-caps text-on-surface-variant">${task.health}%</span>
          </div>
          <span class="material-symbols-outlined text-on-surface-variant text-sm cursor-pointer hover:text-primary transition-colors open-work-order" data-id="${task.id}">open_in_new</span>
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.open-work-order').forEach(el => {
      el.addEventListener('click', function() {
        const id = this.dataset.id;
        const order = workOrders.find(w => w.id === id);
        if (order) window.location.href = '/work-orders';
        else toast('No work order linked to this task', 'error');
      });
    });
  }

  function renderStats() {
    const total = filteredTasks.length;
    const active = filteredTasks.filter(t => t.status !== 'completed').length;
    const completed = filteredTasks.filter(t => t.status === 'completed').length;
    const overdue = filteredTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
    document.getElementById('ym-stat-total').textContent = total;
    document.getElementById('ym-stat-active').textContent = active;
    document.getElementById('ym-stat-completed').textContent = completed;
    document.getElementById('ym-stat-overdue').textContent = overdue;
  }

  function render() {
    renderActiveFilters();
    renderTasks();
    renderStats();
  }

  function toast(message, type) {
    const container = document.getElementById('ym-toast-container') || (() => {
      const el = document.createElement('div');
      el.id = 'ym-toast-container';
      el.className = 'fixed top-24 left-1/2 -translate-x-1/2 z-[120] flex flex-col items-center gap-2 pointer-events-none';
      document.body.appendChild(el);
      return el;
    })();
    const el = document.createElement('div');
    el.className = 'rounded-full border px-5 py-3 text-sm font-bold shadow-xl pointer-events-auto ' + (type === 'error' ? 'border-error/20 bg-error/95 text-white' : 'border-primary/20 bg-white/95 text-primary');
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2600);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const me = await get('/api/auth/me');
      if (!me || !me.id) { window.location.href = '/'; return; }
    } catch { window.location.href = '/'; return; }

    try {
      const [machinesData, ordersData] = await Promise.all([
        get('/api/machines'),
        get('/api/work-orders')
      ]);
      machines = machinesData;
      workOrders = ordersData;
    } catch (e) {
      toast('Failed to load data', 'error');
      return;
    }

    buildTasks();
    renderFilters();
    applyFilters();

    document.getElementById('ym-search-input')?.addEventListener('input', function() {
      const f = getActiveFilters();
      f.search = this.value;
      setFiltersToURL(f);
      applyFilters();
    });

    window.addEventListener('popstate', () => {
      applyFilters();
    });
  });
})();
