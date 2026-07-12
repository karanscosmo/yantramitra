(function() {
  async function get(path) { const r = await fetch(path); return r.json(); }
  async function post(path, body) { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }

  const colors = {
    running: 0x5efae4,
    warning: 0xffba4b,
    maintenance: 0xba1a1a,
    idle: 0xc7c4d7
  };

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

  function createMachineMesh(machine) {
    const fault = machine.status === 'warning' || machine.status === 'maintenance' || (machine.alarms || []).some(a => a.status === 'active');
    const group = new THREE.Group();
    const color = fault ? 0xba1a1a : colors[machine.status] || colors.running;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(machine.type.includes('line') || machine.type.includes('stenter') || machine.type.includes('asrs') ? 3.8 : 2.2, 1.2, machine.type.includes('line') ? 1.1 : 2.0),
      new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.25, emissive: fault ? 0x6f0000 : 0x002a26, emissiveIntensity: fault ? 0.55 : 0.12 })
    );
    group.add(body);

    if (machine.type.includes('robot') || machine.type.includes('welder')) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.8, 16), new THREE.MeshStandardMaterial({ color: 0x413fd6 }));
      arm.rotation.z = Math.PI / 4;
      arm.position.set(0.8, 1.4, 0);
      group.add(arm);
    } else if (machine.type.includes('dye') || machine.type.includes('dosing') || machine.type.includes('vacuum')) {
      const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.7, 28), new THREE.MeshStandardMaterial({ color: fault ? 0xba1a1a : 0x413fd6, roughness: 0.35 }));
      cylinder.position.y = 0.7;
      group.add(cylinder);
    } else if (machine.type.includes('smt') || machine.type.includes('aoi') || machine.type.includes('pick')) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 0.22), new THREE.MeshStandardMaterial({ color: 0x413fd6 }));
      rail.position.y = 0.85;
      group.add(rail);
    }

    if (fault) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.9, 0.07, 12, 48),
        new THREE.MeshBasicMaterial({ color: 0xff2a2a })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.72;
      group.add(ring);

      const beacon = new THREE.PointLight(0xff2424, 2.2, 7);
      beacon.position.set(0, 2.7, 0);
      group.add(beacon);
    }

    group.position.set(machine.posX || 0, 0.8, machine.posZ || 0);
    group.rotation.y = machine.rotation || 0;
    group.userData.machine = machine;
    group.traverse(child => { child.userData.machine = machine; });
    return group;
  }

  async function renderInspector(machine, shouldHydrate = true) {
    const panel = document.getElementById('ym-twin-inspector');
    if (!panel) return;
    if (shouldHydrate) {
      panel.innerHTML = `<div class="h-full min-h-[240px] flex flex-col items-center justify-center text-center gap-3">
        <span class="material-symbols-outlined text-primary text-4xl animate-spin">sync</span>
        <p class="font-bold text-on-surface">Loading ${machine.name} live detail...</p>
      </div>`;
      try {
        const fullMachine = await get('/api/machines/' + machine.id);
        if (fullMachine && fullMachine.id) {
          Object.assign(machine, fullMachine);
          return renderInspector(machine, false);
        }
      } catch {}
    }
    const activeAlarms = (machine.alarms || []).filter(a => a.status === 'active');
    const hierarchy = [
      'Yantra Manufacturing Technologies Pvt. Ltd.',
      machine.productionLine?.building?.plant?.name || machine.plant?.name,
      machine.productionLine?.building?.name,
      machine.productionLine?.name,
      machine.name
    ].filter(Boolean).join(' / ');
    panel.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-[11px] uppercase tracking-[0.16em] text-primary font-bold">${machine.plant?.name || 'Plant'} · ${machine.location || 'Floor'}</p>
          <h2 class="text-2xl font-black text-on-surface mt-1">${machine.name}</h2>
          <p class="text-sm text-on-surface-variant">${machine.type.replace(/_/g, ' ')} · ${machine.status} · ${machine.serial || 'serial pending'}</p>
        </div>
        <span class="material-symbols-outlined text-3xl ${activeAlarms.length ? 'text-error' : 'text-secondary'}">${activeAlarms.length ? 'warning' : 'verified'}</span>
      </div>
      <div class="mt-4 rounded-xl bg-white/70 border border-outline-variant/40 p-3">
        <p class="text-[10px] font-bold uppercase text-on-surface-variant">Hierarchy</p>
        <p class="text-sm font-bold text-on-surface mt-1">${hierarchy}</p>
      </div>
      <div class="grid grid-cols-2 gap-3 mt-5">
        <div class="rounded-xl bg-white/70 border border-outline-variant/40 p-3"><p class="text-[10px] font-bold uppercase text-on-surface-variant">Health</p><p class="text-2xl font-black text-primary">${Math.round(machine.health)}%</p></div>
        <div class="rounded-xl bg-white/70 border border-outline-variant/40 p-3"><p class="text-[10px] font-bold uppercase text-on-surface-variant">OEE</p><p class="text-2xl font-black text-primary">${Math.round(machine.oee || machine.health)}%</p></div>
        <div class="rounded-xl bg-white/70 border border-outline-variant/40 p-3"><p class="text-[10px] font-bold uppercase text-on-surface-variant">Faults</p><p class="text-2xl font-black ${activeAlarms.length ? 'text-error' : 'text-secondary'}">${activeAlarms.length}</p></div>
        <div class="rounded-xl bg-white/70 border border-outline-variant/40 p-3"><p class="text-[10px] font-bold uppercase text-on-surface-variant">RUL</p><p class="text-2xl font-black text-primary">${machine.remainingUsefulLife || 'n/a'}h</p></div>
        <div class="rounded-xl bg-white/70 border border-outline-variant/40 p-3"><p class="text-[10px] font-bold uppercase text-on-surface-variant">Temp</p><p class="font-bold">${latest(machine.readings, 'temperature')}</p></div>
        <div class="rounded-xl bg-white/70 border border-outline-variant/40 p-3"><p class="text-[10px] font-bold uppercase text-on-surface-variant">Vibration</p><p class="font-bold">${latest(machine.readings, 'vibration')}</p></div>
        <div class="rounded-xl bg-white/70 border border-outline-variant/40 p-3"><p class="text-[10px] font-bold uppercase text-on-surface-variant">Power</p><p class="font-bold">${latest(machine.readings, 'power')}</p></div>
        <div class="rounded-xl bg-white/70 border border-outline-variant/40 p-3"><p class="text-[10px] font-bold uppercase text-on-surface-variant">RPM/Flow</p><p class="font-bold">${latest(machine.readings, 'rpm') !== 'n/a' ? latest(machine.readings, 'rpm') : latest(machine.readings, 'flow_rate')}</p></div>
      </div>
      <div class="mt-5 rounded-xl ${activeAlarms.length ? 'bg-error-container/40 border-error/30' : 'bg-secondary-container/20 border-secondary/30'} border p-4">
        <p class="font-bold">${activeAlarms[0]?.title || 'No active fault'}</p>
        <p class="text-sm text-on-surface-variant mt-1">${activeAlarms[0]?.message || 'Machine is inside its seeded operating band.'}</p>
      </div>
      <div class="mt-5 grid grid-cols-1 gap-3">
        <details class="rounded-xl bg-white/70 border border-outline-variant/40 p-3" open>
          <summary class="font-bold cursor-pointer">Sensors</summary>
          <div class="mt-2 grid grid-cols-2 gap-2">${(machine.sensors || []).slice(0, 6).map(s => `<span class="text-xs rounded-lg bg-surface-container-low p-2">${s.tag}<br><strong>${s.metric} · ${s.status}</strong></span>`).join('')}</div>
        </details>
        <details class="rounded-xl bg-white/70 border border-outline-variant/40 p-3">
          <summary class="font-bold cursor-pointer">Components & Spares</summary>
          <div class="mt-2 space-y-2">${(machine.components || []).map(c => `<p class="text-xs">${c.name}: <strong>${Math.round(c.health)}%</strong></p>`).join('')}${(machine.inventoryParts || []).map(p => `<p class="text-xs">${p.sku}: ${p.quantity} in stock</p>`).join('')}</div>
        </details>
        <details class="rounded-xl bg-white/70 border border-outline-variant/40 p-3">
          <summary class="font-bold cursor-pointer">Timeline</summary>
          <div class="mt-2 space-y-2">${(machine.maintenanceEvents || []).map(e => `<p class="text-xs"><strong>${e.title}</strong><br>${e.performedBy || 'Team'} · ${new Date(e.performedAt).toLocaleDateString()}</p>`).join('')}</div>
        </details>
      </div>
      <div class="grid grid-cols-1 gap-2 mt-5">
        <button id="ym-create-investigation" class="rounded-xl bg-primary text-white py-3 font-bold flex items-center justify-center gap-2"><span class="material-symbols-outlined">engineering</span>Ask Agent to Investigate</button>
        <a class="rounded-xl bg-white/70 border border-outline-variant/50 py-3 font-bold text-primary flex items-center justify-center gap-2" href="/ai-console?context=${encodeURIComponent(machine.name)}"><span class="material-symbols-outlined">psychology</span>Ask YantraNklan</a>
      </div>
    `;
    panel.querySelector('#ym-create-investigation')?.addEventListener('click', async () => {
      const result = await post('/api/work-orders', {
        title: `Agent investigation: ${machine.name}`,
        description: `Digital Twin requested investigation for ${machine.name}. Current status ${machine.status}, health ${Math.round(machine.health)}%.`,
        status: 'open',
        priority: activeAlarms.length ? 'critical' : 'medium',
        machineId: machine.id,
        assignedTo: 'Farhan Shaikh',
        dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10)
      });
      if (result.id) {
        panel.querySelector('#ym-create-investigation').innerHTML = '<span class="material-symbols-outlined">check_circle</span>Work Order Created';
      }
    });
  }

  async function initTwin(plants, machines) {
    const main = document.querySelector('main');
    if (!main) return;
    main.innerHTML = `
      <section class="h-screen pt-6 px-md md:pr-32 relative overflow-hidden">
        <div class="absolute top-28 left-md z-30 glass-panel rounded-2xl p-4 w-[min(460px,calc(100vw-32px))] max-h-[calc(100vh-100px)] overflow-y-auto">
          <p class="text-[11px] uppercase tracking-[0.16em] text-primary font-bold">Interactive 3D Digital Twin</p>
          <h1 class="text-2xl font-black text-on-surface mt-1 leading-tight">Live 3D Machine Floor</h1>
          <select id="ym-plant-select" class="mt-3 w-full rounded-xl border border-outline-variant/50 bg-white/80 p-3 pr-8 font-bold text-sm leading-tight"></select>
          <p id="ym-plant-meta" class="text-sm text-on-surface-variant mt-3 leading-relaxed break-words"></p>
          <div class="flex flex-col gap-4 mt-4">
            <div class="glass-panel p-3 rounded-2xl flex items-center gap-3 shadow-lg">
              <div class="w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center text-secondary flex-shrink-0">
                <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">bolt</span>
              </div>
              <div>
                <p class="text-[10px] text-on-surface-variant font-bold uppercase">Grid Status</p>
                <p class="text-md font-kpi-numeric">Stable • 12MW</p>
              </div>
            </div>
            <div class="glass-panel p-3 rounded-2xl flex items-center gap-3 shadow-lg">
              <div class="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary flex-shrink-0">
                <span class="material-symbols-outlined">group</span>
              </div>
              <div>
                <p class="text-[10px] text-on-surface-variant font-bold uppercase">Active Personnel</p>
                <p class="text-md font-kpi-numeric">14 On-Floor</p>
              </div>
            </div>
          </div>
        <div id="ym-twin-canvas" class="absolute inset-0 bg-[#f4f2ff]"></div>
        <aside id="ym-twin-inspector" class="fixed right-[104px] top-24 bottom-28 w-[360px] max-w-[calc(100vw-128px)] overflow-auto glass-panel rounded-2xl p-5 z-40 shadow-2xl"></aside>
        <div class="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 glass-panel rounded-full px-4 py-2 flex items-center gap-3 text-sm font-bold text-on-surface-variant">
          <span class="material-symbols-outlined text-primary">3d_rotation</span> Drag to rotate · scroll to zoom · click a real machine
        </div>
      </section>`;

    const select = document.getElementById('ym-plant-select');
    plants.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = `${p.name} · ${p.domain || 'Plant'}`;
      select.appendChild(option);
    });

    const canvasHost = document.getElementById('ym-twin-canvas');
    if (!window.THREE || !window.YMFactory3D) {
      canvasHost.innerHTML = '<div class="h-full flex items-center justify-center text-center p-10"><div><p class="text-2xl font-black text-error">3D engine unavailable</p><p class="text-on-surface-variant mt-2">Three.js could not load. Check network/CDN access.</p></div></div>';
      return;
    }

    let floorScene = null;
    function loadPlant(plantId, selectedMachine = null) {
      const plant = plants.find(p => p.id === plantId) || plants[0];
      const plantMachines = machines.filter(m => m.plantId === plant.id);
      document.getElementById('ym-plant-meta').textContent = `${plant.location} · OEE ${plant.oee || 'n/a'}% · Uptime ${plant.uptime || 'n/a'}% · ${plantMachines.length} real machines`;
      if (floorScene) floorScene.destroy();
      floorScene = window.YMFactory3D.renderPlantFloor({
        host: canvasHost,
        plant,
        machines: plantMachines,
        onSelect: machine => renderInspector(machine),
        cameraY: 24,
        radius: 34,
        initialAngle: 0.72
      });
      renderInspector(selectedMachine || plantMachines.find(m => m.status !== 'running') || plantMachines[0]);
    }

    select.addEventListener('change', () => loadPlant(select.value));
    const requestedMachine = new URLSearchParams(window.location.search).get('machine');
    const requested = requestedMachine ? machines.find(m => m.name.toLowerCase() === requestedMachine.toLowerCase()) : null;
    if (requested) {
      select.value = requested.plantId;
      loadPlant(requested.plantId, requested);
    } else {
      loadPlant(plants[0]?.id);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;
    const [plants, machines] = await Promise.all([get('/api/plants'), get('/api/machines')]);
    await initTwin(plants, machines);
  });
})();
