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

  function metricRows(plant) {
    const machines = plant.machines || [];
    const avgHealth = machines.length
      ? machines.reduce((sum, machine) => sum + Number(machine.health || 0), 0) / machines.length
      : 0;
    const activeAlerts = machines.reduce((sum, machine) => sum + (machine.alarms || []).filter(alarm => alarm.status === 'active').length, 0);
    return {
      avgHealth: Math.round(avgHealth * 10) / 10,
      activeAlerts,
      machineCount: machines.length,
      warningCount: machines.filter(machine => machine.status !== 'running').length
    };
  }

  function updateText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function render3DFloor(plant) {
    const host = document.getElementById('ym-plant-floor-3d');
    const fallback = document.getElementById('ym-plant-floor-fallback');
    if (!host) return;
    const machines = plant.machines || [];
    if (!window.THREE || !window.YMFactory3D || !machines.length) {
      host.innerHTML = '';
      if (fallback) {
        fallback.classList.remove('hidden');
        host.appendChild(fallback);
      } else {
        host.innerHTML = `<div class="h-full flex items-center justify-center text-center text-on-surface-variant font-bold">${plant.name} facility operating view unavailable.</div>`;
      }
      return;
    }
    const picked = machines.find(machine => machine.status !== 'running') || machines[0];
    window.YMFactory3D.renderPlantFloor({
      host,
      plant,
      machines,
      cameraY: 22,
      radius: 31,
      initialAngle: 0.64,
      pixelRatio: 1.45,
      onSelect(machine) {
        window.location.href = `/digital-twin?machine=${encodeURIComponent(machine.id || machine.name)}&plant=${encodeURIComponent(plant.id)}`;
      }
    });
    if (picked) {
      const meta = document.querySelector('#ym-plant-floor-3d')?.closest('.glass-card')?.querySelector('p.text-on-surface-variant');
      if (meta) meta.textContent = `${plant.location} - ${plant.domain || 'Industrial facility'} - ${machines.length} monitored machines. Click any 3D machine for live context.`;
    }
  }

  function renderPlant(plant) {
    window.__ymCurrentPlant = plant;
    const metrics = metricRows(plant);
    document.title = `YantraMitra | ${plant.name}`;
    updateText('header .font-body-md', `${plant.name} - LIVE`);
    updateText('main h2', `${plant.name} Intelligence`);
    const firstHeading = document.querySelector('main h2') || document.querySelector('h1');
    if (firstHeading) firstHeading.textContent = `${plant.name} Intelligence`;

    const kpis = document.querySelectorAll('.font-kpi-numeric.text-4xl');
    if (kpis[0]) kpis[0].textContent = `${plant.oee || metrics.avgHealth}%`;
    if (kpis[1]) kpis[1].innerHTML = `${plant.utilization || 0}<span class="text-lg font-normal text-on-surface-variant">%</span>`;
    if (kpis[2]) kpis[2].innerHTML = `${metrics.activeAlerts}<span class="text-lg font-normal text-on-surface-variant"> alerts</span>`;

    render3DFloor(plant);

    const floorCaption = Array.from(document.querySelectorAll('p')).find(p => p.textContent.includes('Live operational status'));
    if (floorCaption) floorCaption.textContent = `${plant.location} - ${plant.domain || 'Industrial facility'} - ${metrics.machineCount} monitored machines.`;

    const alertHost = Array.from(document.querySelectorAll('.space-y-3')).find(node => node.closest('aside'));
    if (alertHost) {
      const alerts = (plant.machines || []).flatMap(machine =>
        (machine.alarms || []).map(alarm => ({ ...alarm, machineName: machine.name }))
      ).slice(0, 6);
      alertHost.innerHTML = (alerts.length ? alerts : [{ severity: 'info', title: 'No active critical alerts', message: `${plant.name} is operating within its current monitored band.`, machineName: plant.name }]).map(alarm => {
        const tone = alarm.severity === 'critical'
          ? { bg: 'from-error/10', border: 'border-error', text: 'text-error' }
          : alarm.severity === 'warning'
            ? { bg: 'from-tertiary/10', border: 'border-tertiary', text: 'text-tertiary' }
            : { bg: 'from-primary/10', border: 'border-primary', text: 'text-primary' };
        return `<div class="p-3 rounded-xl bg-gradient-to-r ${tone.bg} to-transparent border-l-4 ${tone.border} hover:translate-x-1 transition-transform cursor-pointer">
          <div class="flex justify-between items-start mb-1">
            <span class="font-label-caps text-[10px] ${tone.text}">${alarm.severity || 'info'}</span>
            <span class="text-[10px] text-on-surface-variant">${alarm.machineName}</span>
          </div>
          <h4 class="text-sm font-bold text-on-surface">${alarm.title}</h4>
          <p class="text-xs text-on-surface-variant mt-1 line-clamp-1">${alarm.message}</p>
        </div>`;
      }).join('');
    }

    const nodeLabels = document.querySelectorAll('[title]');
    (plant.machines || []).slice(0, nodeLabels.length).forEach((machine, index) => {
      nodeLabels[index].title = `${machine.name}: ${Math.round(machine.health)}% health`;
      const tip = nodeLabels[index].querySelector('div');
      if (tip) tip.textContent = `${machine.name}: ${Math.round(machine.health)}%`;
      nodeLabels[index].className = nodeLabels[index].className.replace(/bg-(secondary|tertiary)/, machine.status === 'running' ? 'bg-secondary' : 'bg-tertiary');
      nodeLabels[index].addEventListener('click', () => { window.location.href = `/digital-twin?machine=${encodeURIComponent(machine.id || machine.name)}&plant=${encodeURIComponent(plant.id)}`; });
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;
    const requestedId = window.location.pathname.split('/plant/')[1] || '';
    try {
      const plant = await get('/api/plants/' + encodeURIComponent(requestedId));
      renderPlant(plant);
    } catch {
      const plants = await get('/api/plants');
      if (plants[0]) {
        const plant = await get('/api/plants/' + encodeURIComponent(plants[0].id));
        renderPlant(plant);
      }
    }

    document.querySelectorAll('button').forEach(btn => {
      if (btn.textContent.includes('EXPORT')) btn.addEventListener('click', () => window.print());
      if (btn.textContent.includes('ZOOM')) btn.addEventListener('click', () => {
        const firstMachine = document.querySelector('#ym-plant-floor-3d') ? window.__ymCurrentPlant?.machines?.[0] : null;
        window.location.href = firstMachine ? `/digital-twin?machine=${encodeURIComponent(firstMachine.name)}` : '/digital-twin';
      });
    });
  });
})();
