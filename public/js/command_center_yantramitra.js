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

  function statusTone(status) {
    if (status === 'attention' || status === 'warning') return { dot: 'bg-tertiary-container pulsing-amber', badge: 'bg-tertiary/80', text: 'ATTENTION', score: 'text-tertiary' };
    if (status === 'optimized') return { dot: 'bg-secondary pulsing-green', badge: 'bg-secondary/80', text: 'OPTIMIZED', score: 'text-secondary' };
    return { dot: 'bg-secondary pulsing-green', badge: 'bg-secondary/80', text: 'OPERATIONAL', score: 'text-primary' };
  }

  function renderFacilities(plants) {
    const host = document.getElementById('ym-top-facilities');
    if (!host) return;
    const images = {
      pune: '/images/home-pune-automotive.jpg', ahmedabad: '/images/home-ahmedabad-process.jpg',
      chennai: '/images/home-chennai-electronics.jpg', bengaluru: '/images/home-bengaluru-precision.jpg', nagpur: '/images/home-nagpur-logistics.jpg'
    };
    host.innerHTML = plants.slice(0, 5).map(plant => {
      const tone = statusTone(plant.status);
      const plantKey = Object.keys(images).find(key => String(plant.name).toLowerCase().includes(key));
      const image = images[plantKey] || plant.image || '/images/home-bengaluru-precision.jpg';
      return `
        <article class="glass-panel rounded-xl overflow-hidden group hover:-translate-y-1 transition-all duration-300">
          <div class="h-32 relative">
            <img class="w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-500" src="${image}" alt="${plant.name} facility preview"/>
            <div class="absolute inset-0 bg-gradient-to-t from-surface to-transparent"></div>
            <div class="absolute top-4 left-4 flex items-center gap-2">
              <div class="w-3 h-3 rounded-full ${tone.dot}"></div>
              <span class="font-label-caps text-[10px] text-on-primary ${tone.badge} px-2 py-0.5 rounded-full">${tone.text}</span>
            </div>
          </div>
          <div class="p-md pt-2">
            <h3 class="font-section-header text-[18px] leading-tight mb-xs">${plant.name}</h3>
            <p class="text-xs text-on-surface-variant mb-sm">${plant.location} · ${plant.domain || 'Industrial operations'}</p>
            <div class="flex justify-between items-center py-sm border-y border-outline-variant/20 mb-sm">
              <div>
                <p class="text-[10px] font-label-caps text-on-surface-variant">OEE</p>
                <p class="font-kpi-numeric ${tone.score} text-xl">${plant.oee || 'n/a'}%</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] font-label-caps text-on-surface-variant">MACHINES</p>
                <p class="text-xs font-medium text-primary">${plant._count?.machines || 0} monitored</p>
              </div>
            </div>
            <button data-plant-id="${plant.id}" class="ym-plant-drilldown w-full py-2 bg-primary/5 border border-primary/20 rounded-lg text-primary font-label-caps hover:bg-primary hover:text-on-primary transition-all">PLANT DRILLDOWN</button>
          </div>
        </article>`;
    }).join('');
    host.querySelectorAll('[data-plant-id]').forEach(button => {
      button.addEventListener('click', () => { window.location.href = '/plant/' + button.dataset.plantId; });
    });
  }

  function renderAgentActivity({ alarms = [], plants = [], workOrders = [] }) {
    const host = document.getElementById('ym-agent-activity');
    if (!host) return;
    const firstAlarm = alarms[0];
    const firstPlant = plants[0];
    const secondPlant = plants[1] || plants[0];
    const latestOrder = workOrders[0];
    const items = [
      {
        icon: 'psychology',
        color: 'bg-secondary-container text-on-secondary-container',
        agent: 'Diagnostic Agent',
        text: firstAlarm ? `Analyzing ${firstAlarm.machine?.name || 'machine'} at ${firstPlant?.name || 'plant'}: ${firstAlarm.title}.` : `All monitored machines across ${plants.length} plants are inside normal diagnostic review.`,
        time: 'Just now'
      },
      {
        icon: 'security',
        color: 'bg-primary-container text-on-primary-container',
        agent: 'Sentinel',
        text: `Security handshake completed with ${secondPlant?.name || 'the plant'} edge network. All protocols green.`,
        time: '2m ago'
      },
      {
        icon: 'event_note',
        color: 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant',
        agent: 'Planner Agent',
        text: latestOrder ? `Tracking ${latestOrder.title} for ${latestOrder.machine?.name || 'asset'} with ${latestOrder.priority} priority.` : 'No urgent work order backlog in the current operating snapshot.',
        time: '12m ago'
      },
      {
        icon: 'precision_manufacturing',
        color: 'bg-secondary-container text-on-secondary-container',
        agent: 'Maintenance Agent',
        text: `Predictive maintenance queue refreshed for ${plants.map(p => p.name).slice(0, 3).join(', ')}.`,
        time: '24m ago'
      }
    ];
    host.innerHTML = items.map(item => `
      <button type="button" data-agent-context="${encodeURIComponent(item.agent)}" class="w-full text-left p-sm rounded-xl bg-white/40 border border-outline-variant/20 flex gap-sm hover:bg-white/60 transition-colors cursor-pointer">
        <div class="w-10 h-10 rounded-full ${item.color} flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1">${item.icon}</span>
        </div>
        <div>
          <p class="text-xs font-bold text-on-surface">${item.agent}</p>
          <p class="text-xs text-on-surface-variant leading-relaxed">${item.text}</p>
          <p class="text-[10px] text-primary mt-xs font-medium uppercase tracking-wider">${item.time}</p>
        </div>
      </button>`).join('');
    host.querySelectorAll('[data-agent-context]').forEach(button => {
      button.addEventListener('click', () => {
        window.location.href = '/agents?focus=' + button.dataset.agentContext;
      });
    });
  }

  function wireNavigation() {
    const viewAllBtn = Array.from(document.querySelectorAll('button')).find(btn =>
      btn.textContent.trim().toUpperCase().includes('VIEW ALL')
    );
    if (viewAllBtn) viewAllBtn.addEventListener('click', () => { window.location.href = '/map'; });

    document.querySelectorAll('button').forEach(btn => {
      if (btn.textContent.includes('AGENT TERMINAL')) {
        btn.addEventListener('click', () => { window.location.href = '/agents'; });
      }
    });
    document.querySelectorAll('[data-kpi-route]').forEach(card => card.addEventListener('click', () => { window.location.href = card.dataset.kpiRoute; }));
    const map = document.getElementById('ym-dashboard-map');
    if (map) {
      const openMap = () => { window.location.href = '/map'; };
      map.addEventListener('click', openMap);
      map.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') openMap(); });
    }
    document.querySelectorAll('.ym-region-tab').forEach(tab => tab.addEventListener('click', () => {
      document.querySelectorAll('.ym-region-tab').forEach(item => item.className = 'ym-region-tab px-3 py-1 bg-white/50 border border-outline-variant/30 rounded-full text-xs font-medium');
      tab.className = 'ym-region-tab px-3 py-1 bg-primary text-on-primary rounded-full text-xs font-medium';
      const host = document.getElementById('ym-top-facilities');
      if (host) host.dataset.region = tab.dataset.region;
    }));
    const search = document.getElementById('ym-dashboard-search');
    if (search) search.addEventListener('keydown', event => {
      if (event.key === 'Enter' && search.value.trim()) window.location.href = '/map';
    });
    document.getElementById('ym-notifications')?.addEventListener('click', () => { window.location.href = '/anomaly'; });
    document.getElementById('ym-facility-switcher')?.addEventListener('click', () => { window.location.href = '/map'; });
    document.getElementById('ym-profile-menu')?.addEventListener('click', () => { window.location.href = '/settings'; });
  }

  function renderDistribution(plants) {
    const host = document.getElementById('ym-dashboard-map');
    if (!host) return;
    const coords = { pune: [33, 61], ahmedabad: [25, 42], chennai: [65, 78], bengaluru: [57, 76], nagpur: [47, 56] };
    host.querySelectorAll('.ym-network-pin').forEach(node => node.remove());
    plants.forEach(plant => {
      const key = Object.keys(coords).find(k => plant.name.toLowerCase().includes(k));
      if (!key) return;
      const [left, top] = coords[key];
      const pin = document.createElement('button');
      pin.className = 'ym-network-pin absolute w-3 h-3 rounded-full bg-primary shadow-[0_0_12px_rgba(65,63,214,.9)]';
      pin.style.cssText += `;left:${left}%;top:${top}%`;
      pin.title = `${plant.name} · ${plant.oee || 'n/a'}% OEE`;
      pin.addEventListener('click', event => { event.stopPropagation(); window.location.href = '/plant/' + plant.id; });
      host.appendChild(pin);
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;
    try {
      const [summary, plants, workOrders] = await Promise.all([
        get('/api/dashboard/summary'),
        get('/api/plants'),
        get('/api/work-orders')
      ]);
      renderFacilities(plants);
      renderDistribution(plants);
      renderAgentActivity({ alarms: summary.recentAlarms || [], plants, workOrders });
      wireNavigation();
    } catch (error) {
      console.error('Command center data load failed', error);
    }
  });
})();
