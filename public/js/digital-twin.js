(function() {
  async function get(path) { const r = await fetch(path, { credentials: 'same-origin' }); if (!r.ok) throw new Error(); return r.json(); }
  async function post(path, body) { const r = await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body:JSON.stringify(body) }); return r.json(); }

  function iconFor(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('dye')||t.includes('chemical')||t.includes('effluent')) return 'science';
    if (t.includes('smt')||t.includes('aoi')||t.includes('pick')||t.includes('reflow')) return 'memory';
    if (t.includes('laser')||t.includes('micro')||t.includes('additive')) return 'precision_manufacturing';
    if (t.includes('asrs')||t.includes('sort')||t.includes('agv')||t.includes('dock')) return 'local_shipping';
    if (t.includes('welder')||t.includes('robot')) return 'smart_toy';
    return 'manufacturing';
  }

  function latest(readings = [], metric) {
    const row = readings.find(r => r.metric === metric);
    return row ? { val: Number(row.value).toFixed(1), unit: row.unit } : null;
  }

  function toast(msg, good = true) {
    const el = document.getElementById('ym-toast-msg');
    if (el) { el.textContent = msg; const t = document.getElementById('ym-toast'); t.classList.remove('translate-y-32','opacity-0'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.add('translate-y-32','opacity-0'), 2600); }
  }

  async function checkAuth() {
    try { const me = await get('/api/auth/me'); if (!me || !me.id) window.location.href = '/'; return me; }
    catch { window.location.href = '/'; return null; }
  }

  function healthColor(h) { return h >= 85 ? '#006b5f' : h >= 65 ? '#774f00' : '#ba1a1a'; }
  function statusClass(s) { return s === 'running' ? 'bg-[#5efae4] shadow-[0_0_8px_rgba(94,250,228,0.6)]' : s === 'warning' ? 'bg-[#ffba4b] shadow-[0_0_8px_rgba(255,186,75,0.6)] status-dot-warning' : s === 'maintenance' ? 'bg-[#413fd6] shadow-[0_0_8px_rgba(65,63,214,0.6)]' : s === 'idle' ? 'bg-[#c7c4d7]' : 'bg-[#5efae4]'; }

  function healthRingSVG(h, size = 80) {
    const r = 32, cx = size/2, cy = size/2, circ = 2 * Math.PI * r, offset = circ * (1 - h/100);
    const c = healthColor(h);
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="health-ring-svg shrink-0"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="6" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round" style="transition:stroke-dashoffset .8s cubic-bezier(.34,1.56,.64,1)"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="white" font-size="18" font-weight="800" font-family="'Space Grotesk',sans-serif">${Math.round(h)}%</text></svg>`;
  }

  /* ─── RENDER INSPECTOR SIDEBAR ─── */
  async function renderInspector(machine, shouldHydrate = true) {
    const panel = document.getElementById('ym-twin-inspector');
    if (!panel) return;
    if (shouldHydrate) {
      panel.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-center gap-3 py-20"><span class="material-symbols-outlined text-primary animate-spin" style="font-size:32px">sync</span><p class="font-bold text-white text-sm">Loading ${machine.name}...</p></div>`;
      try {
        const fullMachine = await get('/api/machines/' + machine.id);
        if (fullMachine && fullMachine.id) { Object.assign(machine, fullMachine); return renderInspector(machine, false); }
      } catch {}
    }
    const h = Math.round(machine.health || 80);
    const hc = healthColor(h);
    const activeAlarms = (machine.alarms || []).filter(a => a.status === 'active');
    const sd = machine.readings || [];
    const temp = latest(sd, 'temperature');
    const vib = latest(sd, 'vibration');
    const power = latest(sd, 'power');
    const rpm = latest(sd, 'rpm') || latest(sd, 'flow_rate');
    const cycleT = sd.find(r => r.metric === 'cycle_time');
    const oee = Math.round(machine.oee || machine.health || 0);
    const rul = machine.remainingUsefulLife || 120;
    const failProb = Math.max(0, Math.min(100, Math.round(100 - h + Math.random() * 10 - 5)));
    const since = machine.status === 'running' ? new Date(Date.now() - Math.random() * 72 * 3600000).toLocaleTimeString() : '—';

    panel.innerHTML = `
      <div class="flex flex-col h-full">
        <div class="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/5 shrink-0">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-2 h-2 rounded-full shrink-0 ${statusClass(machine.status)}"></span>
            <span class="font-bold text-white text-sm truncate">${machine.name.replace(/-/g,' ')}</span>
          </div>
          <span class="text-[10px] font-bold uppercase tracking-wider ${machine.status === 'running' ? 'text-[#5efae4]' : machine.status === 'warning' ? 'text-[#ffba4b]' : machine.status === 'maintenance' ? 'text-[#413fd6]' : 'text-[#767586]'}">${machine.status}</span>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
          <!-- Health + OEE Row -->
          <div class="flex items-center gap-4">
            ${healthRingSVG(h)}
            <div class="flex-1 min-w-0 grid grid-cols-2 gap-1.5">
              <div class="bg-white/5 rounded-lg p-2 text-center"><p class="text-[8px] font-bold uppercase text-white/30 tracking-wider">OEE</p><p class="text-white font-bold text-base">${oee}%</p></div>
              <div class="bg-white/5 rounded-lg p-2 text-center"><p class="text-[8px] font-bold uppercase text-white/30 tracking-wider">RUL</p><p class="text-white font-bold text-base">${rul}d</p></div>
              <div class="bg-white/5 rounded-lg p-2 text-center"><p class="text-[8px] font-bold uppercase text-white/30 tracking-wider">Failure</p><p class="text-white font-bold text-base ${failProb > 30 ? 'text-[#ffba4b]' : 'text-white'}">${failProb}%</p></div>
              <div class="bg-white/5 rounded-lg p-2 text-center"><p class="text-[8px] font-bold uppercase text-white/30 tracking-wider">Since</p><p class="text-white font-bold text-xs truncate">${since}</p></div>
            </div>
          </div>

          <!-- Live Telemetry -->
          <div><p class="text-[9px] font-bold uppercase text-white/30 tracking-wider mb-2 flex items-center gap-1"><span class="material-symbols-outlined text-sm">sensors</span>Live Telemetry</p>
          <div class="grid grid-cols-2 gap-1.5">
            ${[
              { icon:'thermostat', label:'Temperature', val: temp ? temp.val + temp.unit : '—', c: temp && parseFloat(temp.val) > 45 ? '#ba1a1a' : '#5efae4' },
              { icon:'vibration', label:'Vibration', val: vib ? vib.val + vib.unit : '—', c: vib && parseFloat(vib.val) > 5 ? '#ffba4b' : '#5efae4' },
              { icon:'bolt', label:'Power', val: power ? power.val + power.unit : '—', c: '#5efae4' },
              { icon:'speed', label:'RPM', val: rpm ? rpm.val + rpm.unit : '—', c: '#5efae4' },
              { icon:'cycle', label:'Cycle Time', val: cycleT ? cycleT.value + 's' : '—', c: '#5efae4' },
              { icon:'monitoring', label:'OEE Trend', val: oee + '%', c: hc },
            ].map((t, i) => `<div class="bg-white/5 rounded-lg p-2.5 twin-tile" style="animation-delay:${i*60}ms"><div class="flex items-center gap-1.5 mb-1"><span class="material-symbols-outlined" style="font-size:14px;color:${t.c}">${t.icon}</span><span class="text-[8px] font-bold uppercase text-white/30 tracking-wider truncate">${t.label}</span></div><span class="text-white font-bold text-sm truncate block">${t.val}</span></div>`).join('')}
          </div></div>

          <!-- Current Faults -->
          <div><p class="text-[9px] font-bold uppercase text-white/30 tracking-wider mb-1.5 flex items-center gap-1"><span class="material-symbols-outlined text-sm">warning</span>Current Faults</p>
          ${activeAlarms.length ? activeAlarms.slice(0,2).map(a => `<div class="bg-red-500/10 border border-red-500/15 rounded-xl p-2.5 mb-1.5"><div class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-red-400 status-dot-critical shrink-0"></span><p class="font-bold text-red-400 text-xs truncate">${a.title}</p></div><p class="text-[10px] text-white/40 ml-[18px] truncate">${a.message || a.description || ''}</p></div>`).join('') : '<div class="bg-emerald-500/10 border border-emerald-500/15 rounded-xl p-2.5"><div class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><p class="font-bold text-emerald-400 text-xs">All Clear</p></div><p class="text-[10px] text-white/40 ml-[18px] mt-0.5">No active faults</p></div>'}</div>

          <!-- AI Insight -->
          <div><p class="text-[9px] font-bold uppercase text-white/30 tracking-wider mb-1.5 flex items-center gap-1"><span class="material-symbols-outlined text-sm">psychology</span>AI Insight</p>
          <div class="bg-white/5 rounded-xl p-3"><p class="text-xs text-white/70 leading-relaxed">${machine.name} is ${machine.status}. Health at ${h}% with ${failProb}% failure probability. ${h < 65 ? 'Recommend immediate inspection — vibration anomalies detected.' : h < 85 ? 'Schedule preventive maintenance within ${rul} days.' : 'Operating within normal parameters. No action required.'} RUL estimated at ${rul} days (${Math.round(Math.random()*30+70)}% confidence).</p><div class="flex items-center gap-2 mt-2 text-[10px] text-white/30"><span class="flex items-center gap-0.5"><span class="w-1 h-1 rounded-full bg-emerald-400"></span>RUL ${rul}d</span><span>·</span><span>Confidence ${Math.round(Math.random()*15+80)}%</span></div></div></div>

          <!-- Actions -->
          <div class="space-y-1.5">
            <button class="ym-dt-action predict w-full rounded-xl bg-primary text-white py-2.5 font-bold flex items-center justify-center gap-2 hover:bg-[#5755e0] transition-all text-xs"><span class="material-symbols-outlined" style="font-size:16px">insights</span>Predict Failure</button>
            <button class="ym-dt-action investigate w-full rounded-xl border border-white/10 text-white/70 py-2.5 font-bold hover:bg-white/5 transition-all text-xs flex items-center justify-center gap-2"><span class="material-symbols-outlined" style="font-size:16px">search_insights</span>Investigate</button>
            <button class="ym-dt-action create-wo w-full rounded-xl border border-white/5 text-white/40 py-2.5 font-bold hover:bg-white/5 transition-all text-xs flex items-center justify-center gap-2"><span class="material-symbols-outlined" style="font-size:16px">assignment_add</span>Create Work Order</button>
          </div>
        </div>
      </div>`;

    panel.querySelector('.predict')?.addEventListener('click', () => toast('Predictive model running... RUL: ' + rul + ' days'));
    panel.querySelector('.investigate')?.addEventListener('click', () => window.location.href = '/anomaly?machine=' + encodeURIComponent(machine.name));
    panel.querySelector('.create-wo')?.addEventListener('click', async function() {
      this.disabled = true; this.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">sync</span> Creating...';
      const result = await post('/api/work-orders', {
        title: `Digital Twin: ${machine.name} investigation`,
        description: `Auto-generated. ${machine.status} status, health ${h}%.`,
        status: 'open', priority: activeAlarms.length ? 'critical' : 'medium',
        machineId: machine.id, assignedTo: 'Auto',
        dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10)
      });
      if (result.id) { this.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">check_circle</span> WO Created'; toast('Work order created'); }
      else { this.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">assignment_add</span>Create Work Order'; this.disabled = false; }
    });
  }

  /* ─── INIT TWIN ─── */
  async function initTwin(plants, machines) {
    const main = document.querySelector('main');
    if (!main) return;
    main.innerHTML = `
      <div class="flex h-full min-h-0">
        <!-- Scene -->
        <div class="flex-1 min-w-0 relative overflow-hidden" id="ym-twin-canvas">
          <!-- Scene fade overlay -->
          <div id="ym-scene-fade" class="absolute inset-0 z-20 bg-[#13131f] pointer-events-none opacity-0 scene-transition"></div>

          <!-- Three.js container (behind UI overlays) -->
          <div id="ym-three-container" class="absolute inset-0 z-[1]"></div>

          <!-- Floating Plant Panel -->
          <div id="ym-plant-panel" class="absolute top-3 left-3 z-30 w-[240px] glass-dark rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-black/30 border border-white/5" style="max-height:calc(100vh - 140px)">
            <div class="px-3 pt-3 pb-1.5 border-b border-white/5 shrink-0">
              <div class="flex items-center gap-1.5 mb-1.5">
                <span class="material-symbols-outlined text-primary text-sm">precision_manufacturing</span>
                <span class="text-white/60 font-bold text-[10px] font-label-caps tracking-wider">LIVE PLANT</span>
              </div>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-white/20 text-sm">search</span>
                <input class="w-full bg-white/5 border border-white/5 rounded-lg py-1.5 pl-7 pr-2 text-xs text-white/80 outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-white/20" id="ym-plant-search" placeholder="Search factory..." autocomplete="off"/>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto custom-scrollbar" id="ym-plant-list"></div>
          </div>

          <!-- Live OPS HUD -->
          <div id="ym-hud-strip" class="absolute top-3 left-[260px] right-4 z-30 pointer-events-none">
            <div class="flex items-center gap-2 [&>*]:pointer-events-auto">
              <div class="glass-dark rounded-xl px-3 py-1.5 flex items-center gap-2.5 shadow-lg shadow-black/10" id="ym-hud-metrics">
                <div class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-[#5efae4] shadow-[0_0_6px_rgba(94,250,228,0.6)]"></span><span class="text-white/40 text-[9px] font-bold font-label-caps">LIVE</span></div>
                <span class="w-px h-3 bg-white/5"></span>
                <div><span class="text-white/30 text-[8px] font-label-caps">Online</span><span class="text-white font-bold text-xs ml-1" id="ym-hud-running">—</span></div>
                <div><span class="text-white/30 text-[8px] font-label-caps">Warn</span><span class="text-[#ffba4b] font-bold text-xs ml-1" id="ym-hud-warning">—</span></div>
                <div><span class="text-white/30 text-[8px] font-label-caps">Down</span><span class="text-[#ba1a1a] font-bold text-xs ml-1" id="ym-hud-down">—</span></div>
                <div><span class="text-white/30 text-[8px] font-label-caps">OEE</span><span class="text-[#5efae4] font-bold text-xs ml-1" id="ym-hud-oee">—</span></div>
              </div>
            </div>
          </div>

          <!-- Bottom Toolbar -->
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-black/50 backdrop-blur-md rounded-full px-2 py-1.5 border border-white/5 shadow-xl shadow-black/20">
            <button class="px-2.5 py-1 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-all text-[10px] font-bold flex items-center gap-1" id="ym-cam-reset"><span class="material-symbols-outlined text-sm">center_focus_strong</span>Reset</button>
            <button class="px-2.5 py-1 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-all text-[10px] font-bold flex items-center gap-1" id="ym-cam-top"><span class="material-symbols-outlined text-sm">height</span>Top</button>
            <button class="px-2.5 py-1 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-all text-[10px] font-bold flex items-center gap-1" id="ym-cam-3d"><span class="material-symbols-outlined text-sm">3d_rotation</span>3D</button>
            <span class="w-px h-4 bg-white/5"></span>
            <button class="px-2.5 py-1 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-all text-[10px] font-bold flex items-center gap-1" id="ym-toggle-labels"><span class="material-symbols-outlined text-sm">label</span>Labels</button>
            <button class="px-2.5 py-1 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-all text-[10px] font-bold flex items-center gap-1" id="ym-toggle-rotate"><span class="material-symbols-outlined text-sm">sync</span>Auto</button>
            <span class="w-px h-4 bg-white/5"></span>
            <button class="px-2.5 py-1 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-all text-[10px] font-bold flex items-center gap-1" id="ym-toggle-fs"><span class="material-symbols-outlined text-sm">fullscreen</span>FS</button>
          </div>

          <!-- Legend -->
          <div class="absolute bottom-4 left-4 z-30 glass-dark rounded-xl px-3 py-2 border border-white/5 shadow-lg">
            <div class="flex items-center gap-2.5 text-[9px] font-bold font-label-caps">
              <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-[#5efae4] shadow-[0_0_6px_rgba(94,250,228,0.6)]"></span><span class="text-white/50">Healthy</span></span>
              <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-[#ffba4b] status-dot-warning"></span><span class="text-white/50">Warning</span></span>
              <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] status-dot-critical"></span><span class="text-white/50">Critical</span></span>
              <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-[#413fd6]"></span><span class="text-white/50">Maint</span></span>
              <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-[#767586]"></span><span class="text-white/50">Offline</span></span>
            </div>
          </div>
        </div>

        <!-- Inspector Sidebar -->
        <aside id="ym-twin-inspector" class="w-[320px] shrink-0 bg-[#191a28] border-l border-white/5 overflow-hidden flex flex-col shadow-2xl shadow-black/20" style="z-index:10"></aside>
      </div>

      <div id="ym-toast" class="fixed top-24 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-xl px-5 py-3 font-bold shadow-2xl transition-all duration-300 translate-y-32 opacity-0 text-sm"><span id="ym-toast-msg"></span></div>`;

    const canvasHost = document.getElementById('ym-three-container');
    const canvasWrapper = document.getElementById('ym-twin-canvas');
    if (canvasWrapper) canvasWrapper.style.background = '#13131f';
    if (!window.THREE || !window.YMFactory3D) {
      canvasHost.innerHTML = '<div class="h-full flex items-center justify-center"><div class="text-center p-10"><p class="text-2xl font-black text-error">3D engine unavailable</p><p class="text-white/50 mt-2">Three.js could not load.</p></div></div>';
      return;
    }

    let floorScene = null, currentPlantId = null;
    let autoRotate = false, showLabels = true;

    function updateHUD(ms) {
      const active = ms.filter(m => m.status === 'running').length;
      const warning = ms.filter(m => m.status === 'warning').length;
      const down = ms.filter(m => m.status === 'maintenance' || m.status === 'idle').length;
      const avgOee = ms.length ? Math.round(ms.reduce((s, m) => s + (m.oee || m.health || 0), 0) / ms.length) : 0;
      const el = (id) => document.getElementById(id);
      if (el('ym-hud-running')) el('ym-hud-running').textContent = active;
      if (el('ym-hud-warning')) el('ym-hud-warning').textContent = warning;
      if (el('ym-hud-down')) el('ym-hud-down').textContent = down;
      if (el('ym-hud-oee')) el('ym-hud-oee').textContent = avgOee + '%';
    }

    function renderPlantPanel(plants, currentPlant) {
      const container = document.getElementById('ym-plant-list');
      if (!container) return;
      const q = (document.getElementById('ym-plant-search')?.value || '').toLowerCase();
      const filtered = plants.filter(p => p.name.toLowerCase().includes(q));
      container.innerHTML = filtered.map(p => {
        const active = currentPlant && p.id === currentPlant.id;
        const pm = machines.filter(m => m.plantId === p.id);
        const r = pm.filter(m => m.status === 'running').length;
        const w = pm.filter(m => m.status === 'warning').length;
        const c = pm.filter(m => m.status === 'maintenance').length;
        return `<button class="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-white/5 transition-all duration-150 border-b border-white/5 last:border-0 ${active ? 'bg-white/8' : ''}" data-id="${p.id}">
          <span class="material-symbols-outlined shrink-0 ${active ? 'text-primary' : 'text-white/30'}" style="font-variation-settings:'FILL' 1;font-size:18px">factory</span>
          <div class="min-w-0 flex-1">
            <div class="font-semibold text-xs truncate ${active ? 'text-white' : 'text-white/60'}">${p.name}</div>
            <div class="flex items-center gap-2 text-[8px] text-white/30 mt-0.5">
              <span>${pm.length} machines</span>
              ${r > 0 ? `<span class="flex items-center gap-0.5"><span class="w-1 h-1 rounded-full bg-[#5efae4]"></span>${r}</span>` : ''}
              ${w > 0 ? `<span class="flex items-center gap-0.5"><span class="w-1 h-1 rounded-full bg-[#ffba4b]"></span>${w}</span>` : ''}
              ${c > 0 ? `<span class="flex items-center gap-0.5"><span class="w-1 h-1 rounded-full bg-[#ba1a1a]"></span>${c}</span>` : ''}
            </div>
          </div>
          ${active ? '<span class="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>' : ''}
        </button>`;
      }).join('');
      if (!filtered.length) container.innerHTML = '<div class="text-xs text-white/20 text-center py-6">No factories match</div>';
      container.querySelectorAll('[data-id]').forEach(btn => {
        btn.addEventListener('click', function() { loadPlant(this.dataset.id); });
      });
    }

    function loadPlant(plantId, selectedMachine = null) {
      const plant = plants.find(p => p.id === plantId);
      if (!plant || plant.id === currentPlantId) return;
      currentPlantId = plant.id;

      // Scene fade
      const fade = document.getElementById('ym-scene-fade');
      if (fade) { fade.classList.remove('opacity-0'); fade.classList.add('opacity-80'); }

      setTimeout(() => {
        const pm = machines.filter(m => m.plantId === plant.id);
        if (floorScene && floorScene.destroy) floorScene.destroy();

        renderPlantPanel(plants, plant);
        updateHUD(pm);

        floorScene = window.YMFactory3D.renderPlantFloor({
          host: canvasHost,
          plant,
          machines: pm,
          onSelect: m => renderInspector(m),
          cameraY: 20, radius: 38, initialAngle: 0.72
        });

        const target = selectedMachine || pm.find(m => m.status === 'warning' || m.status === 'maintenance') || pm[0];
        if (target) renderInspector(target);

        setTimeout(() => {
          if (fade) { fade.classList.remove('opacity-80'); fade.classList.add('opacity-0'); }
        }, 200);
      }, 350);
    }

    // Initial render
    const firstPlant = plants[0];
    currentPlantId = firstPlant?.id;
    renderPlantPanel(plants, firstPlant);
    if (firstPlant) {
      const pm = machines.filter(m => m.plantId === firstPlant.id);
      updateHUD(pm);
      updateHUD(pm);
      floorScene = window.YMFactory3D.renderPlantFloor({
        host: canvasHost,
        plant: firstPlant,
        machines: pm,
        onSelect: m => renderInspector(m),
        cameraY: 20, radius: 38, initialAngle: 0.72
      });
      const target = pm.find(m => m.status === 'warning' || m.status === 'maintenance') || pm[0];
      if (target) renderInspector(target);
    }

    // Requested machine from URL
    const reqMachine = new URLSearchParams(window.location.search).get('machine');
    if (reqMachine) {
      const found = machines.find(m => m.name.toLowerCase() === reqMachine.toLowerCase());
      if (found) loadPlant(found.plantId, found);
    }

    // Plant search
    document.getElementById('ym-plant-search')?.addEventListener('input', () => {
      const p = plants.find(p => p.id === currentPlantId);
      renderPlantPanel(plants, p);
    });

    // Toolbar buttons
    document.getElementById('ym-cam-reset')?.addEventListener('click', () => { if (floorScene && floorScene.resetCamera) floorScene.resetCamera(); });
    document.getElementById('ym-cam-top')?.addEventListener('click', () => { if (floorScene && floorScene.flyTo) floorScene.flyTo(-100, -100); });
    document.getElementById('ym-cam-3d')?.addEventListener('click', () => { if (floorScene && floorScene.resetCamera) floorScene.resetCamera(); });
    document.getElementById('ym-toggle-labels')?.addEventListener('click', function() {
      showLabels = !showLabels;
      this.classList.toggle('text-white', showLabels);
      this.classList.toggle('text-white/50', !showLabels);
    });
    document.getElementById('ym-toggle-rotate')?.addEventListener('click', function() {
      autoRotate = !autoRotate;
      this.classList.toggle('text-white', autoRotate);
      this.classList.toggle('text-white/50', !autoRotate);
    });
    document.getElementById('ym-toggle-fs')?.addEventListener('click', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;
    const [plants, machines] = await Promise.all([get('/api/plants'), get('/api/machines')]);
    await initTwin(plants, machines);
  });
})();
