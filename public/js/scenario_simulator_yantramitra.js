(function() {
  const API = { base: '' };
  async function get(path) { const r = await fetch(path, { credentials: 'same-origin' }); if (!r.ok) throw new Error(path); return r.json(); }
  async function post(path, body) { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) }); if (!r.ok) throw new Error(path); return r.json(); }

  let plants = [];
  let machines = [];
  let currentPlant = null;
  let simRunning = false;
  let simPaused = false;
  let simIteration = 0;
  let simTimer = null;
  let baselineData = null;
  let historyData = [];
  let sceneInitialized = false;
  let threeScene = null;

  function toast(msg) {
    const el = document.getElementById('ym-toast');
    if (!el) return;
    document.getElementById('ym-toast-msg').textContent = msg;
    el.classList.remove('translate-y-32', 'opacity-0');
    setTimeout(() => el.classList.add('translate-y-32', 'opacity-0'), 2500);
  }

  function openModal(title, body) {
    document.querySelector('.modal-backdrop')?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:14px">
        <h2 style="font:900 24px/1.2 Inter,system-ui,sans-serif;color:#191a28">${title}</h2>
        <button class="ym-close-modal" style="border:0;background:#eeecff;border-radius:999px;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div>${body}</div>
    </div>`;
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.ym-close-modal')) wrap.remove(); });
    document.body.appendChild(wrap);
  }

  function getSliderValues() {
    const sliders = document.querySelectorAll('[data-slider]');
    const vals = {};
    sliders.forEach(s => { vals[s.dataset.slider] = parseFloat(s.value); });
    return vals;
  }

  function updateSliderDisplays() {
    document.querySelectorAll('[data-slider]').forEach(s => {
      const id = 'slider-' + s.dataset.slider;
      const el = document.getElementById(id);
      if (!el) return;
      const val = s.value;
      const unit = s.dataset.unit || '';
      const labels = { speed: val + unit, delay: val + unit, power: val + unit, quality: val + unit, operators: val, material: val + unit, temp: val + unit, energy: '₹' + (val / 10).toFixed(1) + '/kWh' };
      el.textContent = labels[s.dataset.slider] || val + unit;
    });
  }

  function computeKPIs(vals) {
    const speed = vals.speed || 85;
    const delay = vals.delay || 12;
    const power = vals.power || 420;
    const quality = vals.quality || 98;
    const operators = vals.operators || 12;
    const material = vals.material || 85;
    const temp = vals.temp || 32;
    const energy = vals.energy || 65;

    const throughput = Math.round((speed * 0.6 + operators * 1.2 + material * 0.3 - delay * 0.5 - temp * 0.2) * (Math.random() * 0.1 + 0.95));
    const oee = Math.min(100, Math.round((speed / 100 * 35 + quality / 100 * 35 + (100 - delay) / 100 * 30) * (Math.random() * 0.08 + 0.96)));
    const energyUsage = Math.round(power * (1 + temp / 200) * (Math.random() * 0.05 + 0.975));
    const downtime = Math.max(0, Math.round((delay * 0.8 + (100 - speed) * 0.3 + (100 - material) * 0.2 + temp * 0.1) * (Math.random() * 0.1 + 0.95)));
    const maintCost = Math.round((delay * 15 + (100 - quality) * 20 + power * 0.5) * (Math.random() * 0.1 + 0.95));
    const profit = Math.round((throughput * 50 - maintCost - energyUsage * 2) * (Math.random() * 0.05 + 0.975));
    const qualityLoss = Math.max(0, Math.round((100 - quality) * (1 + temp / 100) * (Math.random() * 0.1 + 0.95)));
    const carbonEmission = Math.round(energyUsage * 0.45 * (Math.random() * 0.05 + 0.975));

    return { throughput, oee, energyUsage, downtime, maintCost, profit, qualityLoss, carbonEmission };
  }

  function renderCharts(kpi) {
    const grid = document.getElementById('ym-charts-grid');
    if (!grid) return;
    const charts = [
      { label: 'Throughput', value: kpi.throughput, max: 200, unit: 'u/hr', color: '#413fd6' },
      { label: 'OEE', value: kpi.oee, max: 100, unit: '%', color: '#006b5f' },
      { label: 'Energy', value: kpi.energyUsage, max: 1200, unit: 'kWh', color: '#774f00' },
      { label: 'Downtime', value: kpi.downtime, max: 100, unit: 'min', color: '#ba1a1a' },
      { label: 'Maint Cost', value: kpi.maintCost, max: 5000, unit: '₹', color: '#413fd6' },
      { label: 'Profit', value: kpi.profit, max: 10000, unit: '₹', color: '#006b5f' },
      { label: 'Quality Loss', value: kpi.qualityLoss, max: 50, unit: 'u', color: '#774f00' },
      { label: 'Carbon', value: kpi.carbonEmission, max: 500, unit: 'kg', color: '#ba1a1a' }
    ];
    grid.innerHTML = charts.map(c => {
      const pct = Math.min(100, (c.value / c.max) * 100);
      return `<div class="glass-panel rounded-lg p-2 border border-outline-variant/20">
        <p class="text-[9px] font-bold text-on-surface-variant uppercase">${c.label}</p>
        <p class="font-kpi-numeric text-sm" style="color:${c.color}">${c.value} <span class="text-[9px] text-on-surface-variant font-normal">${c.unit}</span></p>
        <div class="w-full h-1.5 bg-outline-variant/20 rounded-full mt-1 overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500" style="width:${pct}%;background:${c.color}"></div>
        </div>
      </div>`;
    }).join('');
  }

  function generatePrediction(vals, kpi) {
    const changes = [];
    if (kpi.throughput > 150) changes.push('Production increases by ' + ((kpi.throughput - 100) * 0.1).toFixed(1) + '%');
    if (kpi.energyUsage > 600) changes.push('Power rises ' + Math.round((kpi.energyUsage - 400) / 4) + '%');
    if (kpi.downtime > 30) changes.push('Failure probability +' + Math.min(15, Math.round(kpi.downtime * 0.15)) + '%');
    if (kpi.oee > 85) changes.push('OEE improves by ' + Math.round((kpi.oee - 75) * 0.5) + '%');
    if (changes.length === 0) changes.push('Production increases by ' + (Math.random() * 12 + 2).toFixed(1) + '%');
    const maintenanceDue = Math.max(2, Math.round(20 - kpi.downtime * 0.3));
    const confidence = Math.min(99, 85 + Math.round(Math.random() * 14));
    return `<p class="text-white/90 text-sm mb-2">${changes.slice(0, 3).join(' · ')}</p>
      <p class="text-white/80 text-xs">Maintenance due in <strong>${maintenanceDue} days</strong> · Confidence <strong>${confidence}%</strong></p>`;
  }

  function initScene(plant) {
    const container = document.getElementById('ym-scene-bg');
    if (!container) return;
    const img = plant?.image || '/images/home-pune-automotive.jpg';
    container.innerHTML = `<img src="${img}" class="w-full h-full object-cover"/>`;
    const overlay = container.querySelector('.scene-overlay') || document.createElement('div');
    overlay.className = 'scene-overlay absolute inset-0';
    container.appendChild(overlay);
    sceneInitialized = true;
  }

  function updateSceneStats(plant, kpi) {
    const switcher = document.getElementById('ym-plant-switcher');
    if (!switcher || !plant) return;
    switcher.innerHTML = `
      <div class="glass-panel rounded-xl p-3 flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full ${simRunning ? 'bg-secondary animate-pulse' : 'bg-outline-variant'}"></span>
          <span class="font-label-caps text-[10px]">${plant.name}</span>
          <span class="text-[9px] text-on-surface-variant">${plant.location}</span>
        </div>
        <div class="flex gap-3 text-[10px]">
          <span>OEE: <strong>${kpi?.oee || plant.oee || 0}%</strong></span>
          <span>Throughput: <strong>${kpi?.throughput || '--'}</strong></span>
          <span>Health: <strong>${Math.round((plant.machines || []).reduce((s,m) => s + m.health, 0) / Math.max((plant.machines || []).length, 1)) || 78}%</strong></span>
        </div>
      </div>`;
  }

  function runSimulation() {
    if (simRunning && !simPaused) return;
    if (simPaused) { simPaused = false; document.getElementById('ym-sim-status').textContent = 'SIMULATION RUNNING'; return; }
    simRunning = true;
    simPaused = false;
    document.getElementById('ym-sim-status').textContent = 'SIMULATION RUNNING';
    document.getElementById('ym-sim-indicator').className = 'w-2 h-2 rounded-full bg-secondary animate-pulse';
    document.getElementById('ym-sim-run').innerHTML = '<span class="material-symbols-outlined text-sm">play_arrow</span><span>RUN</span>';

    if (simTimer) clearInterval(simTimer);
    simTimer = setInterval(() => {
      if (simPaused) return;
      simIteration++;
      document.getElementById('ym-iteration').textContent = 'Iteration #' + simIteration;
      const vals = getSliderValues();
      const kpi = computeKPIs(vals);
      renderCharts(kpi);
      document.getElementById('ym-prediction-text').innerHTML = generatePrediction(vals, kpi);
      updateSceneStats(currentPlant, kpi);
      if (simIteration % 5 === 0) historyData.push({ iteration: simIteration, ...kpi });
    }, 1200);
  }

  function pauseSimulation() {
    simPaused = true;
    document.getElementById('ym-sim-status').textContent = 'SIMULATION PAUSED';
    document.getElementById('ym-sim-indicator').className = 'w-2 h-2 rounded-full bg-tertiary';
  }

  function resetSimulation() {
    if (simTimer) clearInterval(simTimer);
    simRunning = false;
    simPaused = false;
    simIteration = 0;
    baselineData = null;
    document.getElementById('ym-sim-status').textContent = 'SIMULATION READY';
    document.getElementById('ym-sim-indicator').className = 'w-2 h-2 rounded-full bg-outline-variant';
    document.getElementById('ym-iteration').textContent = 'Iteration #0';
    document.getElementById('ym-prediction-text').innerHTML = '<p class="text-white/80 text-sm">Run simulation to generate AI prediction</p>';
    document.querySelectorAll('input[type="range"]').forEach((s, i) => {
      const defaults = [85, 12, 420, 98, 12, 85, 32, 65];
      s.value = defaults[i] || 50;
    });
    updateSliderDisplays();
    const vals = getSliderValues();
    renderCharts(computeKPIs(vals));
    updateSceneStats(currentPlant, computeKPIs(vals));
    toast('Simulation reset to defaults');
  }

  function compareBaseline() {
    if (!baselineData) {
      baselineData = getSliderValues();
      toast('Baseline captured');
      return;
    }
    const current = getSliderValues();
    const diff = Object.keys(current).reduce((acc, k) => { acc[k] = ((current[k] - baselineData[k]) / baselineData[k] * 100).toFixed(1); return acc; }, {});
    openModal('Baseline Comparison', `
      <table class="w-full text-sm">
        <thead><tr class="text-left border-b border-outline-variant/20"><th class="py-2">Parameter</th><th class="py-2">Baseline</th><th class="py-2">Current</th><th class="py-2">Change</th></tr></thead>
        <tbody>${Object.keys(diff).map(k => `<tr class="border-b border-outline-variant/10"><td class="py-2 capitalize">${k}</td><td class="py-2">${baselineData[k]}</td><td class="py-2">${current[k]}</td><td class="py-2 font-bold ${diff[k] > 0 ? 'text-secondary' : 'text-error'}">${diff[k]}%</td></tr>`).join('')}</tbody>
      </table>
    `);
  }

  function exportData() {
    const kpi = computeKPIs(getSliderValues());
    const csv = 'Parameter,Value\n' + Object.entries(kpi).map(([k, v]) => `${k},${v}`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'simulation-data-' + Date.now() + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Data exported');
  }

  function showHistory() {
    if (!historyData.length) { toast('No simulation history yet'); return; }
    openModal('Simulation History', `
      <table class="w-full text-xs">
        <thead><tr class="text-left border-b border-outline-variant/20"><th class="py-2">Iteration</th><th class="py-2">Throughput</th><th class="py-2">OEE</th><th class="py-2">Energy</th><th class="py-2">Downtime</th><th class="py-2">Maint Cost</th><th class="py-2">Profit</th></tr></thead>
        <tbody>${historyData.slice(-20).map(h => `<tr class="border-b border-outline-variant/10"><td class="py-2">#${h.iteration}</td><td class="py-2">${h.throughput}</td><td class="py-2">${h.oee}%</td><td class="py-2">${h.energyUsage}</td><td class="py-2">${h.downtime}</td><td class="py-2">₹${h.maintCost}</td><td class="py-2">₹${h.profit}</td></tr>`).join('')}</tbody>
      </table>
      <p class="text-xs text-on-surface-variant mt-2">Showing last ${Math.min(historyData.length, 20)} entries</p>
    `);
  }

  function loadPlantScene(plant) {
    if (!plant) return;
    currentPlant = plant;
    initScene(plant);
    const vals = getSliderValues();
    const kpi = computeKPIs(vals);
    renderCharts(kpi);
    updateSceneStats(plant, kpi);
    document.getElementById('ym-iteration').textContent = 'Iteration #0';
  }

  async function checkAuth() {
    try { const me = await get('/api/auth/me'); if (!me || !me.id) window.location.href = '/login'; return me; }
    catch { window.location.href = '/login'; return null; }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;

    try {
      plants = await get('/api/plants');
      machines = await get('/api/machines');
    } catch (e) { console.error('Failed to load data', e); }
    if (!plants.length) { document.getElementById('ym-scene-bg').innerHTML = '<div class="flex items-center justify-center h-full text-on-surface-variant">No plant data available</div>'; return; }

    currentPlant = plants[0];
    loadPlantScene(currentPlant);

    document.querySelectorAll('[data-toggle="plant"]').forEach(el => {
      el.addEventListener('click', function() {
        const id = this.dataset.plantId;
        const plant = plants.find(p => p.id === id);
        if (plant) {
          if (simTimer) { clearInterval(simTimer); simRunning = false; }
          simIteration = 0;
          loadPlantScene(plant);
          toast('Switched to ' + plant.name);
        }
      });
    });

    document.querySelectorAll('[data-slider]').forEach(s => {
      s.addEventListener('input', function() {
        updateSliderDisplays();
        if (simRunning && !simPaused) return;
        const vals = getSliderValues();
        const kpi = computeKPIs(vals);
        renderCharts(kpi);
        updateSceneStats(currentPlant, kpi);
      });
    });

    document.getElementById('ym-sim-run')?.addEventListener('click', runSimulation);
    document.getElementById('ym-sim-pause')?.addEventListener('click', pauseSimulation);
    document.getElementById('ym-sim-reset')?.addEventListener('click', resetSimulation);
    document.getElementById('ym-sim-compare')?.addEventListener('click', compareBaseline);
    document.getElementById('ym-sim-export')?.addEventListener('click', exportData);
    document.getElementById('ym-sim-history')?.addEventListener('click', showHistory);

    document.getElementById('ym-view-3d')?.addEventListener('click', function() {
      this.classList.add('bg-primary', 'text-white');
      document.getElementById('ym-view-2d')?.classList.remove('bg-primary', 'text-white');
      document.getElementById('ym-scene-bg').style.background = 'transparent';
      toast('3D view selected');
    });
    document.getElementById('ym-view-2d')?.addEventListener('click', function() {
      this.classList.add('bg-primary', 'text-white');
      document.getElementById('ym-view-3d')?.classList.remove('bg-primary', 'text-white');
      document.getElementById('ym-scene-bg').style.background = 'repeating-linear-gradient(0deg,rgba(65,63,214,0.12) 0 1px,transparent 1px 44px),repeating-linear-gradient(90deg,rgba(65,63,214,0.12) 0 1px,transparent 1px 44px)';
      toast('2D schematic view selected');
    });

    updateSliderDisplays();
    const vals = getSliderValues();
    renderCharts(computeKPIs(vals));
  });
})();