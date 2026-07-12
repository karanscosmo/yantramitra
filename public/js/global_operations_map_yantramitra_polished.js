(function() {
  async function get(path) {
    const response = await fetch(path, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(path);
    return response.json();
  }

  async function checkAuth() {
    try {
      const me = await get('/api/auth/me');
      if (!me || !me.id) window.location.href = '/login';
      return me;
    } catch {
      window.location.href = '/login';
      return null;
    }
  }

  function projectWorld(lat, lng) {
    return {
      left: Math.max(3, Math.min(97, ((lng + 180) / 360) * 100)),
      top: Math.max(6, Math.min(94, (1 - ((lat + 70) / 150)) * 100))
    };
  }

  function tone(status) {
    if (status === 'attention' || status === 'warning') return { dot: 'bg-error', badge: 'bg-error-container text-on-error-container', label: 'Attention' };
    if (status === 'optimized') return { dot: 'bg-secondary-fixed-dim', badge: 'bg-secondary-container text-on-secondary-container', label: 'Optimized' };
    return { dot: 'bg-primary', badge: 'bg-surface-container-highest text-on-surface-variant', label: 'Operational' };
  }

  function renderPins(plants) {
    const host = document.getElementById('pins-container');
    if (!host) return;
    const projected = plants.map(plant => ({ plant, pos: projectWorld(plant.lat, plant.lng) }));
    const hub = { left: 70.5, top: 51 };
    host.innerHTML = `
      <svg class="absolute inset-0 w-full h-full pointer-events-none z-0" preserveAspectRatio="none" viewBox="0 0 1000 1000">
        ${projected.map(({ pos }) => `<path d="M ${hub.left * 10} ${hub.top * 10} Q ${(hub.left * 10 + pos.left * 10) / 2} ${Math.min(hub.top, pos.top) * 10 - 60} ${pos.left * 10} ${pos.top * 10}" fill="none" opacity="0.32" stroke="#413fd6" stroke-width="1.5"></path>`).join('')}
      </svg>
      ${projected.map(({ plant, pos }) => {
        const t = tone(plant.status);
        return `<button class="absolute -translate-x-1/2 -translate-y-1/2 z-10 group cursor-pointer" style="left:${pos.left}%;top:${pos.top}%;" data-plant-id="${plant.id}">
          <div class="w-3.5 h-3.5 ${t.dot} rounded-full pulse-marker relative shadow-[0_0_12px_rgba(65,63,214,0.8)]"></div>
          <div class="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none w-56">
            <div class="glass-panel p-sm rounded-xl border border-white/50 text-xs">
              <h4 class="font-label-caps text-primary mb-1">${plant.name}</h4>
              <div class="flex justify-between mb-1"><span class="text-on-surface-variant">Location</span><span class="font-bold text-on-surface">${plant.location.split(',')[0]}</span></div>
              <div class="flex justify-between mb-1"><span class="text-on-surface-variant">Machines</span><span class="font-kpi-numeric text-primary">${plant._count?.machines || 0}</span></div>
              <div class="flex justify-between"><span class="text-on-surface-variant">OEE</span><span class="text-secondary font-semibold">${plant.oee || 'n/a'}%</span></div>
            </div>
          </div>
        </button>`;
      }).join('')}`;
    host.querySelectorAll('[data-plant-id]').forEach(button => {
      button.addEventListener('click', () => { window.location.href = '/plant/' + button.dataset.plantId; });
    });
  }

  function renderPlantList(plants) {
    const sidebar = document.getElementById('ym-map-plant-list') ||
      Array.from(document.querySelectorAll('aside .flex-1')).find(node => node.className.includes('overflow-y-auto'));
    if (!sidebar) return;
    sidebar.id = 'ym-map-plant-list';
    sidebar.innerHTML = plants.map(plant => {
      const t = tone(plant.status);
      return `<button data-plant-id="${plant.id}" class="w-full glass-panel p-sm rounded-2xl hover:border-primary/40 transition-all group cursor-pointer border-transparent bg-white/40 text-left">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-semibold text-on-surface text-lg">${plant.name}</h3>
            <span class="font-label-caps text-[10px] text-on-surface-variant">${plant.location}</span>
          </div>
          <div class="${t.badge} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">${t.label}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-4">
          <div class="bg-surface-container-low/50 p-2 rounded-xl">
            <p class="text-[10px] text-on-surface-variant uppercase font-bold">OEE</p>
            <p class="font-kpi-numeric text-primary">${plant.oee || 'n/a'}%</p>
          </div>
          <div class="bg-surface-container-low/50 p-2 rounded-xl">
            <p class="text-[10px] text-on-surface-variant uppercase font-bold">Machines</p>
            <p class="font-kpi-numeric text-primary">${plant._count?.machines || 0}</p>
          </div>
        </div>
      </button>`;
    }).join('');
    sidebar.querySelectorAll('[data-plant-id]').forEach(button => {
      button.addEventListener('click', () => { window.location.href = '/plant/' + button.dataset.plantId; });
    });
  }

  function wireControls(plants) {
    const search = document.getElementById('ym-map-search');
    if (search) search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      const filtered = plants.filter(plant => `${plant.name} ${plant.location} ${plant.domain || ''}`.toLowerCase().includes(query));
      renderPins(filtered);
      renderPlantList(filtered);
    });
    document.getElementById('ym-view-analytics')?.addEventListener('click', () => { window.location.href = '/reliability'; });
    document.getElementById('ym-map-notifications')?.addEventListener('click', () => { window.location.href = '/anomaly'; });
    document.getElementById('ym-map-facilities')?.addEventListener('click', () => { document.getElementById('ym-map-search')?.focus(); });
    document.getElementById('ym-map-profile')?.addEventListener('click', () => { window.location.href = '/settings'; });
    document.getElementById('ym-export-report')?.addEventListener('click', () => {
      const rows = [['Facility', 'Location', 'OEE', 'Machines', 'Status'], ...plants.map(p => [p.name, p.location, p.oee || '', p._count?.machines || 0, p.status])];
      const url = URL.createObjectURL(new Blob([rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv' }));
      const link = document.createElement('a'); link.href = url; link.download = 'yantramitra-facility-report.csv'; link.click(); URL.revokeObjectURL(url);
    });
    const modal = document.getElementById('ym-facility-modal');
    const closeModal = () => modal?.classList.add('hidden');
    document.getElementById('ym-add-facility')?.addEventListener('click', () => modal?.classList.remove('hidden'));
    document.querySelector('[data-close-facility]')?.addEventListener('click', closeModal);
    document.getElementById('ym-facility-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const error = document.getElementById('ym-facility-error');
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true; submit.textContent = 'SAVING…'; error?.classList.add('hidden');
      try {
        const response = await fetch('/api/plants', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
        const created = await response.json();
        if (!response.ok) throw new Error(created.error || 'Unable to save facility');
        plants.push(created); renderPins(plants); renderPlantList(plants); form.reset(); closeModal();
      } catch (err) { error.textContent = err.message; error.classList.remove('hidden'); }
      finally { submit.disabled = false; submit.textContent = 'SAVE FACILITY'; }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;
    try {
      const plants = await get('/api/plants');
      renderPins(plants);
      renderPlantList(plants);
      wireControls(plants);
    } catch (error) {
      console.error('Plant map load failed', error);
    }
  });
})();
