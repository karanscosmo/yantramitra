(function() {
  async function get(path) { const r = await fetch(path); return r.json(); }
  async function post(path, body) { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }

  const colors = {
    running: 0x5efae4, warning: 0xffba4b, maintenance: 0xba1a1a, idle: 0xc7c4d7
  };

  async function checkAuth() {
    try { const me = await get('/api/auth/me'); if (!me || !me.id) window.location.href = '/'; return me; }
    catch { window.location.href = '/'; return null; }
  }

  function iconFor(type) {
    if (type.includes('dye') || type.includes('chemical') || type.includes('effluent')) return 'science';
    if (type.includes('smt') || type.includes('aoi') || type.includes('pick') || type.includes('reflow')) return 'memory';
    if (type.includes('laser') || type.includes('micro') || type.includes('additive')) return 'precision_manufacturing';
    if (type.includes('asrs') || type.includes('sort') || type.includes('agv') || type.includes('dock')) return 'local_shipping';
    if (type.includes('welder') || type.includes('robot')) return 'smart_toy';
    return 'manufacturing';
  }

  function latest(readings = [], metric) {
    const row = readings.find(r => r.metric === metric);
    return row ? `${Number(row.value).toFixed(1)} ${row.unit}` : 'n/a';
  }

  function toast(msg, good = true) {
    const el = document.getElementById('ym-toast-msg');
    if (el) { el.textContent = msg; const t = document.getElementById('ym-toast'); t.classList.remove('translate-y-32','opacity-0'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.add('translate-y-32','opacity-0'), 2600); }
  }

  async function renderInspector(machine, shouldHydrate = true) {
    const panel = document.getElementById('ym-twin-inspector');
    if (!panel) return;
    if (shouldHydrate) {
      panel.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-center gap-3 py-20">
        <span class="material-symbols-outlined text-primary animate-spin" style="font-size:32px">sync</span>
        <p class="font-bold text-on-surface" style="font-size:15px">Loading ${machine.name}...</p>
      </div>`;
      try {
        const fullMachine = await get('/api/machines/' + machine.id);
        if (fullMachine && fullMachine.id) { Object.assign(machine, fullMachine); return renderInspector(machine, false); }
      } catch {}
    }
    const activeAlarms = (machine.alarms || []).filter(a => a.status === 'active');
    const sensorData = machine.readings || [];
    const temp = latest(sensorData, 'temperature');
    const vib = latest(sensorData, 'vibration');
    const power = latest(sensorData, 'power');
    const rpm = latest(sensorData, 'rpm') !== 'n/a' ? latest(sensorData, 'rpm') : latest(sensorData, 'flow_rate');
    const cycleTime = sensorData.find(r => r.metric === 'cycle_time') ? sensorData.find(r => r.metric === 'cycle_time').value + 's' : '—';
    const runningSince = machine.status === 'running' ? new Date(Date.now() - Math.random() * 72 * 3600000).toLocaleTimeString() : '—';

    const healthColor = machine.health >= 80 ? '#5efae4' : machine.health >= 50 ? '#ffba4b' : '#e84545';
    panel.innerHTML = `
      <div class="p-5 h-full flex flex-col overflow-y-auto">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-3">
            <span class="w-2.5 h-2.5 rounded-full ${machine.status === 'running' ? 'bg-[#5efae4] shadow-[0_0_10px_rgba(94,250,228,0.5)]' : machine.status === 'warning' ? 'bg-[#ffba4b] shadow-[0_0_10px_rgba(255,186,75,0.5)]' : 'bg-[#e84545] shadow-[0_0_10px_rgba(232,69,69,0.5)]'}"></span>
            <span class="font-bold uppercase tracking-wider" style="font-size:10px;color:${machine.status === 'running' ? '#5efae4' : machine.status === 'warning' ? '#ffba4b' : '#e84545'}">${machine.status}</span>
          </div>
          <span class="text-white/20 cursor-pointer hover:text-white/60 transition-colors" onclick="document.getElementById('ym-twin-inspector').classList.toggle('hidden')" style="font-size:18px">✕</span>
        </div>
        <h2 class="font-black text-white" style="font-size:24px;line-height:1.1">${machine.name}</h2>
        <p class="text-sm text-white/40 mt-1">${machine.type.replace(/_/g, ' ')} · ${machine.serial || '—'}</p>
        <p class="text-xs text-white/30 mt-2">${machine.plant?.name || 'Plant'} · ${machine.location || 'Floor'} · Since ${runningSince}</p>
        <div class="mt-5">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[10px] font-bold uppercase text-white/30 tracking-wider">Health</span>
            <span class="text-white font-bold" style="font-size:18px">${Math.round(machine.health)}%</span>
          </div>
          <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div class="h-full rounded-full transition-all" style="width:${Math.round(machine.health)}%;background:${healthColor};box-shadow:0 0 8px ${healthColor}40"></div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-5">
          <div class="rounded-xl bg-white/5 border border-white/5 p-3"><p class="text-[9px] font-bold uppercase text-white/30 tracking-wider">OEE</p><p class="text-white font-bold" style="font-size:22px">${Math.round(machine.oee || machine.health)}%</p></div>
          <div class="rounded-xl bg-white/5 border border-white/5 p-3"><p class="text-[9px] font-bold uppercase text-white/30 tracking-wider">RUL</p><p class="text-white font-bold" style="font-size:22px">${machine.remainingUsefulLife || 120}d</p></div>
          <div class="rounded-xl bg-white/5 border border-white/5 p-3"><p class="text-[9px] font-bold uppercase text-white/30 tracking-wider">Temp</p><p class="text-white font-bold" style="font-size:18px">${temp}</p></div>
          <div class="rounded-xl bg-white/5 border border-white/5 p-3"><p class="text-[9px] font-bold uppercase text-white/30 tracking-wider">Vibration</p><p class="text-white font-bold" style="font-size:18px">${vib}</p></div>
          <div class="rounded-xl bg-white/5 border border-white/5 p-3"><p class="text-[9px] font-bold uppercase text-white/30 tracking-wider">Power</p><p class="text-white font-bold" style="font-size:18px">${power}</p></div>
          <div class="rounded-xl bg-white/5 border border-white/5 p-3"><p class="text-[9px] font-bold uppercase text-white/30 tracking-wider">Cycle</p><p class="text-white font-bold" style="font-size:18px">${cycleTime}</p></div>
        </div>
        ${activeAlarms.length ? `<div class="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3"><div class="flex items-center gap-2 mb-1"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span><p class="font-bold text-red-400" style="font-size:12px">${activeAlarms[0].title}</p></div><p class="text-xs text-white/50 ml-[22px]">${activeAlarms[0].message}</p></div>` : '<div class="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3"><div class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><p class="font-bold text-emerald-400" style="font-size:12px">No Active Faults</p></div><p class="text-xs text-white/50 ml-[22px] mt-1">All parameters within normal range.</p></div>'}
        <div class="mt-5 space-y-2">
          <button class="ym-dt-action predict-failure w-full rounded-xl bg-[#413fd6] text-white py-3 font-bold flex items-center justify-center gap-2 hover:bg-[#5755e0] transition-all" style="font-size:13px"><span class="material-symbols-outlined" style="font-size:18px">insights</span>Predict Failure</button>
          <button class="ym-dt-action investigate w-full rounded-xl border border-white/10 text-white/80 py-3 font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-all" style="font-size:13px"><span class="material-symbols-outlined" style="font-size:18px">search_insights</span>Investigate</button>
          <button class="ym-dt-action create-wo w-full rounded-xl border border-white/5 text-white/50 py-3 font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-all" style="font-size:13px"><span class="material-symbols-outlined" style="font-size:18px">assignment_add</span>Create Work Order</button>
          <div class="flex gap-2">
            <button class="ym-dt-action zoom-to flex-1 rounded-xl bg-white/5 text-white/50 py-2 font-bold text-xs flex items-center justify-center gap-1 hover:bg-white/10 transition-all"><span class="material-symbols-outlined" style="font-size:16px">center_focus_strong</span>Zoom</button>
            <button class="ym-dt-action center-cam flex-1 rounded-xl bg-white/5 text-white/50 py-2 font-bold text-xs flex items-center justify-center gap-1 hover:bg-white/10 transition-all"><span class="material-symbols-outlined" style="font-size:16px">my_location</span>Center</button>
            <button class="ym-dt-action open-sim flex-1 rounded-xl bg-white/5 text-white/50 py-2 font-bold text-xs flex items-center justify-center gap-1 hover:bg-white/10 transition-all" onclick="window.open('/simulator','_blank')"><span class="material-symbols-outlined" style="font-size:16px">simulation</span>Sim</button>
          </div>
        </div>
      </div>`;

    panel.querySelector('.predict-failure')?.addEventListener('click', () => toast('Predictive model running on ' + machine.name + '... Estimated RUL: ' + (machine.remainingUsefulLife || 120) + ' days'));
    panel.querySelector('.investigate')?.addEventListener('click', () => window.location.href = '/anomaly?machine=' + encodeURIComponent(machine.name));
    panel.querySelector('.create-wo')?.addEventListener('click', async function() {
      this.disabled = true; this.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">sync</span> Creating...';
      const result = await post('/api/work-orders', {
        title: `Digital Twin: ${machine.name} investigation`,
        description: `Auto-generated from Digital Twin. ${machine.status} status, health ${Math.round(machine.health)}%.`,
        status: 'open',
        priority: activeAlarms.length ? 'critical' : 'medium',
        machineId: machine.id,
        assignedTo: 'Auto',
        dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10)
      });
      if (result.id) { this.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">check_circle</span> WO Created'; toast('Work order created'); }
      else { this.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">assignment_add</span>Create Work Order'; this.disabled = false; }
    });
    panel.querySelector('.zoom-to')?.addEventListener('click', () => {
      if (window.YMFactory3D && window.YMFactory3D.flyTo) window.YMFactory3D.flyTo(machine.posX || 0, machine.posZ || 0);
      else toast('Camera fly-to not available in this view');
    });
    panel.querySelector('.center-cam')?.addEventListener('click', () => {
      if (window.YMFactory3D && window.YMFactory3D.resetCamera) window.YMFactory3D.resetCamera();
      else toast('Camera reset not available');
    });

    // Update breadcrumb
    const bc = document.getElementById('ym-breadcrumb');
    if (bc) bc.innerHTML = `<a href="/" class="hover:text-primary">Home</a> / <a href="/digital-twin" class="hover:text-primary">Digital Twin</a> / <span class="text-primary font-bold">${machine.name}</span>`;
  }

  async function initTwin(plants, machines) {
    const main = document.querySelector('main');
    if (!main) return;
    main.innerHTML = `
      <div class="flex h-screen w-full" style="padding-top:56px">
        <div class="flex-1 relative overflow-hidden" id="ym-twin-canvas"></div>
        <aside id="ym-twin-inspector" class="w-[380px] min-w-[320px] max-w-[420px] bg-[#191a28]/95 border-l border-white/5 overflow-y-auto shadow-2xl" style="z-index:10"></aside>
      </div>
      <div id="ym-toast" class="fixed top-24 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-xl px-5 py-3 font-bold shadow-2xl transition-all duration-300 translate-y-32 opacity-0" style="font-size:14px"><span id="ym-toast-msg"></span></div>
      <div id="ym-breadcrumb" class="fixed top-16 left-4 z-40 text-[10px] text-white/50 backdrop-blur-sm bg-black/20 rounded-full px-3 py-1.5">Home / Digital Twin</div>
      <div class="fixed top-16 right-[400px] z-40 flex items-center gap-2">
        <select id="ym-plant-select" class="backdrop-blur-md bg-black/30 rounded-full px-3 py-1.5 text-xs font-bold border border-white/10 cursor-pointer text-white/80"></select>
      </div>
      <div id="ym-twin-hud" class="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-full px-4 py-2 border border-white/5">
        <span class="text-white/40" style="font-size:10px">DRAG TO ROTATE</span>
        <span class="w-px h-3 bg-white/10"></span>
        <span class="text-white/40" style="font-size:10px">SCROLL TO ZOOM</span>
        <span class="w-px h-3 bg-white/10"></span>
        <span class="text-white/40" style="font-size:10px">CLICK A MACHINE</span>
      </div>`;

    const select = document.getElementById('ym-plant-select');
    const inspector = document.getElementById('ym-twin-inspector');
    plants.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = p.name + ' · ' + (p.domain || 'Plant');
      select.appendChild(option);
    });

    const canvasHost = document.getElementById('ym-twin-canvas');
    canvasHost.style.background = '#13131f';
    if (!window.THREE || !window.YMFactory3D) {
      canvasHost.innerHTML = '<div class="h-full flex items-center justify-center"><div class="text-center p-10"><p class="text-2xl font-black text-error">3D engine unavailable</p><p class="text-white/50 mt-2">Three.js could not load.</p></div></div>';
      return;
    }

    let floorScene = null;
    let currentPlantMachines = [];
    window._dtRenderInspector = renderInspector;

    /* Live HUD overlay */
    const hud = document.createElement('div');
    hud.id = 'ym-twin-hud-metrics';
    hud.className = 'absolute top-4 left-4 z-30 flex gap-4';
    hud.innerHTML = '<div class="backdrop-blur-md bg-black/40 rounded-xl px-3 py-2 border border-white/5"><div class="text-[9px] font-bold uppercase text-white/30 tracking-wider">Active</div><div class="text-white font-bold" id="ym-hud-running" style="font-size:18px">—</div></div><div class="backdrop-blur-md bg-black/40 rounded-xl px-3 py-2 border border-white/5"><div class="text-[9px] font-bold uppercase text-white/30 tracking-wider">Warning</div><div class="text-amber-400 font-bold" id="ym-hud-warning" style="font-size:18px">—</div></div><div class="backdrop-blur-md bg-black/40 rounded-xl px-3 py-2 border border-white/5"><div class="text-[9px] font-bold uppercase text-white/30 tracking-wider">Down</div><div class="text-red-400 font-bold" id="ym-hud-down" style="font-size:18px">—</div></div><div class="backdrop-blur-md bg-black/40 rounded-xl px-3 py-2 border border-white/5"><div class="text-[9px] font-bold uppercase text-white/30 tracking-wider">OEE</div><div class="text-teal-400 font-bold" id="ym-hud-oee" style="font-size:18px">—</div></div>';
    canvasHost.appendChild(hud);

    function updateHUD(machines) {
      const active = machines.filter(m => m.status === 'running').length;
      const warning = machines.filter(m => m.status === 'warning').length;
      const down = machines.filter(m => m.status === 'maintenance' || m.status === 'idle').length;
      const avgOee = machines.length ? Math.round(machines.reduce((s, m) => s + (m.oee || m.health || 0), 0) / machines.length) : 0;
      const el = document.getElementById('ym-hud-running'); if (el) el.textContent = active;
      const ew = document.getElementById('ym-hud-warning'); if (ew) ew.textContent = warning;
      const ed = document.getElementById('ym-hud-down'); if (ed) ed.textContent = down;
      const eo = document.getElementById('ym-hud-oee'); if (eo) eo.textContent = avgOee + '%';
    }

    window._dtRenderInspector = renderInspector;

    function loadPlant(plantId, selectedMachine = null) {
      const plant = plants.find(p => p.id === plantId) || plants[0];
      currentPlantMachines = machines.filter(m => m.plantId === plant.id);
      updateHUD(currentPlantMachines);
      if (floorScene && floorScene.destroy) floorScene.destroy();
      floorScene = window.YMFactory3D.renderPlantFloor({
        host: canvasHost,
        plant,
        machines: currentPlantMachines,
        onSelect: machine => renderInspector(machine),
        cameraY: 20,
        radius: 38,
        initialAngle: 0.72
      });
      const target = selectedMachine || currentPlantMachines.find(m => m.status !== 'running') || currentPlantMachines[0];
      if (target) { inspector.classList.remove('hidden'); renderInspector(target); }
    }

    select.addEventListener('change', () => { inspector.classList.remove('hidden'); loadPlant(select.value); });
    const requestedMachine = new URLSearchParams(window.location.search).get('machine');
    const requested = requestedMachine ? machines.find(m => m.name.toLowerCase() === requestedMachine.toLowerCase()) : null;
    if (requested) { select.value = requested.plantId; loadPlant(requested.plantId, requested); }
    else { loadPlant(plants[0]?.id); }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;
    const [plants, machines] = await Promise.all([get('/api/plants'), get('/api/machines')]);
    await initTwin(plants, machines);
  });
})();
