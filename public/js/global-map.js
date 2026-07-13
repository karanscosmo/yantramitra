(function() {
  let map = null, plants = [], machines = [], markers = [], lines = [], tileLayer = null;
  let activeLayer = 'plants', selectedPlantId = null;

  const tileStyles = {
    standard: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

  function get(path) { return fetch(path, { credentials: 'same-origin' }).then(r => { if (!r.ok) throw new Error(); return r.json(); }); }

  function toast(msg, type) {
    const el = document.createElement('div');
    el.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] rounded-full border px-5 py-3 text-sm font-bold shadow-xl transition-all duration-500 ' + (type === 'error' ? 'border-error/20 bg-error/95 text-white' : 'border-primary/20 bg-white/95 text-primary');
    el.textContent = msg; document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, 3000);
  }

  function openModal(title, body) {
    document.querySelector('.modal-backdrop:not(#ym-ai-modal)')?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = '<div class="modal-card" role="dialog" aria-modal="true"><div style="display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:14px"><h2 style="font:900 24px/1.2 Inter,system-ui,sans-serif;color:#191a28">' + title + '</h2><button class="ym-close-modal" style="border:0;background:#eeecff;border-radius:999px;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined">close</span></button></div><div>' + body + '</div></div>';
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.ym-close-modal')) wrap.remove(); });
    document.body.appendChild(wrap);
  }

  function getPlantHealth(plant) {
    const m = plant.machines || [];
    return Math.max(40, Math.min(100, m.length ? Math.round(m.reduce((s, x) => s + (x.health || 80), 0) / m.length) : 85));
  }

  function getPlantColor(plant) {
    const h = getPlantHealth(plant);
    return h >= 85 ? '#006b5f' : h >= 65 ? '#774f00' : '#ba1a1a';
  }

  function markerIcon(plant, size) {
    const color = getPlantColor(plant);
    const s = size || 18;
    return L.divIcon({
      className: '',
      html: '<div class="ym-marker ym-marker-pulse" style="background:' + color + ';width:' + s + 'px;height:' + s + 'px"><div class="absolute inset-0 rounded-full" style="background:' + color + ';opacity:0.25;transform:scale(1.6)"></div></div>',
      iconSize: [s, s],
      iconAnchor: [s / 2, s / 2],
      popupAnchor: [0, -s / 2 - 4]
    });
  }

  function createPopupContent(plant) {
    const health = getPlantHealth(plant);
    const m = plant.machines || [];
    const alarmCount = m.reduce((s, x) => s + (x._count?.alarms || 0), 0);
    const mc = m.length;
    const img = window.getPlantImage(plant) || plant.image || '/assets/images/home-pune-automotive.jpg';
    return '<div style="min-width:250px"><div style="display:flex;gap:10px;margin-bottom:10px"><img src="' + img + '" style="width:56px;height:56px;border-radius:10px;object-fit:cover;border:1px solid #E7E9F5"/><div><h3 style="font-weight:900;font-size:15px;color:#191a28;margin:0">' + plant.name + '</h3><p style="font-size:10px;color:#464555;margin:2px 0">' + (plant.domain || 'Manufacturing') + ' · ' + plant.location + '</p><div style="display:flex;align-items:center;gap:5px;margin-top:3px"><span style="width:7px;height:7px;border-radius:50%;background:' + (plant.status === 'optimized' ? '#006b5f' : plant.status === 'attention' ? '#774f00' : '#413fd6') + '"></span><span style="font-size:9px;font-weight:700;text-transform:uppercase;color:' + (plant.status === 'optimized' ? '#006b5f' : plant.status === 'attention' ? '#774f00' : '#413fd6') + '">' + (plant.status || 'Operational') + '</span></div></div></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:10px"><div style="background:#f4f2ff;border-radius:8px;padding:5px;text-align:center"><p style="font-size:8px;color:#767586;margin:0;font-weight:700">OEE</p><p style="font-size:14px;font-weight:700;color:#413fd6;margin:2px 0">' + (plant.oee || 0) + '%</p></div><div style="background:#f4f2ff;border-radius:8px;padding:5px;text-align:center"><p style="font-size:8px;color:#767586;margin:0;font-weight:700">MACHINES</p><p style="font-size:14px;font-weight:700;color:#191a28;margin:2px 0">' + mc + '</p></div><div style="background:#f4f2ff;border-radius:8px;padding:5px;text-align:center"><p style="font-size:8px;color:#767586;margin:0;font-weight:700">HEALTH</p><p style="font-size:14px;font-weight:700;color:' + (health >= 85 ? '#006b5f' : health >= 65 ? '#774f00' : '#ba1a1a') + ';margin:2px 0">' + health + '%</p></div><div style="background:#fff0f0;border-radius:8px;padding:5px;text-align:center"><p style="font-size:8px;color:#ba1a1a;margin:0;font-weight:700">ALERTS</p><p style="font-size:14px;font-weight:700;color:#ba1a1a;margin:2px 0">' + alarmCount + '</p></div><div style="background:#f4f2ff;border-radius:8px;padding:5px;text-align:center"><p style="font-size:8px;color:#767586;margin:0;font-weight:700">ENERGY</p><p style="font-size:14px;font-weight:700;color:#774f00;margin:2px 0">' + (plant.energyUsage || 0) + ' MWh</p></div><div style="background:#f4f2ff;border-radius:8px;padding:5px;text-align:center"><p style="font-size:8px;color:#767586;margin:0;font-weight:700">CO₂</p><p style="font-size:14px;font-weight:700;color:#ba1a1a;margin:2px 0">' + (plant.co2Tonnes || 0) + 't</p></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:5px"><button class="ym-popup-btn" style="border:0;border-radius:999px;padding:7px;background:linear-gradient(135deg,#5B5BF0,#7C7CFA);color:white;font-weight:700;font-size:9px;cursor:pointer" data-action="view-plant" data-id="' + plant.id + '">VIEW PLANT</button><button class="ym-popup-btn" style="border:1px solid #413fd6;border-radius:999px;padding:7px;color:#413fd6;font-weight:700;font-size:9px;background:transparent;cursor:pointer" data-action="ai-chat" data-name="' + plant.name + '">ASK AI</button><button class="ym-popup-btn" style="border:1px solid #006b5f;border-radius:999px;padding:7px;color:#006b5f;font-weight:700;font-size:9px;background:transparent;cursor:pointer" data-action="digital-twin" data-id="' + plant.id + '">DIGITAL TWIN</button><button class="ym-popup-btn" style="border:1px solid #774f00;border-radius:999px;padding:7px;color:#774f00;font-weight:700;font-size:9px;background:transparent;cursor:pointer" data-action="assets" data-id="' + plant.id + '">ASSETS</button></div></div>';
  }

  function createMarkers() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    plants.forEach(plant => {
      const coords = window.getPlantCoords(plant);
      if (!coords) return;
      const marker = L.marker(coords, { icon: markerIcon(plant), riseOnHover: true }).addTo(map).bindPopup(createPopupContent(plant), { maxWidth: 320, className: 'ym-popup-custom', closeButton: true });
      marker.on('popupopen', function() {
        setTimeout(() => {
          this.getPopup().getElement().querySelectorAll('.ym-popup-btn').forEach(b => {
            b.addEventListener('click', function(e) { e.stopPropagation(); handlePopupAction(this.dataset); });
          });
        }, 100);
      });
      marker.on('mouseover', () => highlightCard(plant.id, true));
      marker.on('mouseout', () => highlightCard(plant.id, false));
      marker.plantId = plant.id;
      markers.push(marker);
    });
  }

  function handlePopupAction(data) {
    if (data.action === 'view-plant') { window.location.href = '/plant/' + data.id; }
    else if (data.action === 'ai-chat') { window.location.href = '/ai-console?context=' + encodeURIComponent(data.name); }
    else if (data.action === 'digital-twin') { window.location.href = '/digital-twin?plant=' + encodeURIComponent(data.id); }
    else if (data.action === 'assets') { window.location.href = '/assets'; }
  }

  function createConnectionLines() {
    lines.forEach(l => map.removeLayer(l));
    lines = [];
    window.getConnectionPaths().forEach(([from, to]) => {
      const line = L.polyline([from, to], { color: '#413fd6', weight: 2, opacity: 0.25, dashArray: '8, 6' }).addTo(map);
      lines.push(line);
    });
  }

  function computeAggregates() {
    const totalMachines = plants.reduce((s, p) => s + (p.machines ? p.machines.length : 0), 0);
    const avgOEE = plants.length ? Math.round(plants.reduce((s, p) => s + (p.oee || 0), 0) / plants.length) : 0;
    const avgHealth = plants.length ? Math.round(plants.reduce((s, p) => s + getPlantHealth(p), 0) / plants.length) : 0;
    const totalAlarms = plants.reduce((s, p) => s + (p.machines ? p.machines.reduce((s2, m) => s2 + (m._count?.alarms || 0), 0) : 0), 0);
    return { totalMachines, avgOEE, avgHealth, totalAlarms };
  }

  function renderPlantList() {
    const container = document.getElementById('ym-plant-list');
    if (!container) return;
    container.innerHTML = plants.map(plant => {
      const m = plant.machines || [];
      const health = getPlantHealth(plant);
      const alarmCount = m.reduce((s, x) => s + (x._count?.alarms || 0), 0);
      const img = window.getPlantImage(plant) || plant.image || '/assets/images/home-pune-automotive.jpg';
      const color = getPlantColor(plant);
      return '<button data-plant-id="' + plant.id + '" class="w-full glass-panel p-2.5 rounded-xl hover:shadow-md transition-all border border-transparent bg-white/60 text-left" style="border-left:3px solid ' + color + '"><div class="flex gap-2.5 items-start"><img src="' + img + '" class="w-10 h-10 rounded-lg object-cover border border-outline-variant/20 shrink-0"/><div class="min-w-0 flex-1"><div class="flex items-center justify-between gap-1"><h3 class="font-bold text-sm text-on-surface truncate">' + plant.name + '</h3><span class="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0" style="background:' + color + '20;color:' + color + '">' + health + '%</span></div><p class="text-[9px] text-on-surface-variant truncate">' + (plant.domain || 'Manufacturing') + ' · ' + plant.location + '</p><div class="flex gap-2 mt-0.5 text-[8px] text-on-surface-variant"><span>OEE ' + (plant.oee || 0) + '%</span><span>Mach ' + m.length + '</span><span class="' + (alarmCount > 0 ? 'text-error font-bold' : '') + '">Alerts ' + alarmCount + '</span></div></div></div></button>';
    }).join('');

    container.querySelectorAll('[data-plant-id]').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.dataset.plantId;
        selectPlant(id);
      });
      btn.addEventListener('mouseenter', function() { highlightCard(this.dataset.plantId, true); });
      btn.addEventListener('mouseleave', function() { highlightCard(this.dataset.plantId, false); });
    });
  }

  function selectPlant(id) {
    selectedPlantId = id;
    document.querySelectorAll('#ym-plant-list [data-plant-id]').forEach(b => b.classList.remove('card-selected'));
    const btn = document.querySelector('#ym-plant-list [data-plant-id="' + id + '"]');
    if (btn) btn.classList.add('card-selected');
    const plant = plants.find(p => p.id === id);
    if (plant) {
      const coords = window.getPlantCoords(plant);
      if (coords) {
        map.flyTo(coords, 10, { duration: 0.6 });
        markers.forEach(m => { if (m.plantId === id) { m.openPopup(); } });
      }
    }
  }

  function highlightCard(id, hovered) {
    const btn = document.querySelector('#ym-plant-list [data-plant-id="' + id + '"]');
    if (btn) btn.classList.toggle('card-hovered', hovered);
    markers.forEach(m => {
      if (m.plantId === id) {
        const el = m.getElement();
        if (el) el.classList.toggle('marker-highlight', hovered);
      }
    });
  }

  function updateKPI() {
    const agg = computeAggregates();
    document.getElementById('ym-kpi-health').textContent = agg.avgHealth + '%';
    document.getElementById('ym-kpi-oee').textContent = agg.avgOEE + '%';
    document.getElementById('ym-kpi-alarms').textContent = agg.totalAlarms;
    document.getElementById('ym-kpi-machines').textContent = agg.totalMachines;
  }

  function switchLayer(layer) {
    activeLayer = layer;
    document.querySelectorAll('.ym-overlay-btn[data-layer]').forEach(b => b.classList.toggle('is-active', b.dataset.layer === layer));
    lines.forEach(l => map[layer === 'network' ? 'addLayer' : 'removeLayer'](l));
    markers.forEach(m => {
      const plant = plants.find(p => p.id === m.plantId);
      if (!plant) return;
      if (layer === 'plants') {
        m.setIcon(markerIcon(plant));
        map.addLayer(m);
      } else if (layer === 'health') {
        const health = getPlantHealth(plant);
        const color = health >= 85 ? '#006b5f' : health >= 65 ? '#774f00' : '#ba1a1a';
        m.setIcon(L.divIcon({ className: '', html: '<div style="background:' + color + ';width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.85);box-shadow:0 4px 12px rgba(0,0,0,0.15)"><span style="color:white;font-size:9px;font-weight:900">' + health + '</span></div>', iconSize: [24, 24], iconAnchor: [12, 12] }));
        map.addLayer(m);
      } else if (layer === 'energy') {
        const energy = plant.energyUsage || 200;
        const intensity = Math.min(100, Math.round(energy / 8));
        m.setIcon(L.divIcon({ className: '', html: '<div style="width:26px;height:26px;border-radius:50%;background:rgba(65,63,214,' + (intensity / 200) + ');border:2px solid #413fd6;display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined" style="font-size:13px;color:#413fd6">bolt</span></div>', iconSize: [26, 26], iconAnchor: [13, 13] }));
        map.addLayer(m);
      } else {
        m.setIcon(markerIcon(plant));
        map.addLayer(m);
      }
    });
  }

  async function loadData() {
    try {
      const [plantsData, machinesData] = await Promise.all([get('/api/plants'), get('/api/machines').catch(() => [])]);
      plants = plantsData;
      machines = machinesData;
      plants.forEach(p => { p.machines = machines.filter(m => m.plantId === p.id); });
      createMarkers();
      createConnectionLines();
      lines.forEach(l => { if (activeLayer !== 'network') map.removeLayer(l); });
      renderPlantList();
      updateKPI();
      map.fitBounds(Object.values(window.YM_PLANTS).filter(p => p.lat && p.lng).map(p => [p.lat, p.lng]), { padding: [50, 50], maxZoom: 6 });
    } catch (e) { console.error('Failed to load plant data', e); }
  }

  async function checkAuth() {
    try { const me = await get('/api/auth/me'); if (!me || !me.id) window.location.href = '/'; return me; }
    catch { window.location.href = '/'; return null; }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;

    map = L.map('ym-map', { center: [20.5937, 78.9629], zoom: 5, zoomControl: false, attributionControl: false });
    tileLayer = L.tileLayer(tileStyles.standard, { attribution: tileAttribution, maxZoom: 18 }).addTo(map);

    map.on('popupopen', function() {
      document.querySelectorAll('.leaflet-popup-close-button').forEach(btn => {
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px">close</span>';
      });
    });

    await loadData();

    document.querySelectorAll('.ym-overlay-btn[data-layer]').forEach(btn => {
      btn.addEventListener('click', function() { switchLayer(this.dataset.layer); });
    });

    document.getElementById('ym-zoom-in')?.addEventListener('click', () => map.zoomIn());
    document.getElementById('ym-zoom-out')?.addEventListener('click', () => map.zoomOut());
    document.getElementById('ym-reset-view')?.addEventListener('click', () => {
      map.fitBounds(Object.values(window.YM_PLANTS).filter(p => p.lat && p.lng).map(p => [p.lat, p.lng]), { padding: [50, 50], maxZoom: 6 });
    });

    document.getElementById('ym-ai-summary-btn')?.addEventListener('click', async function() {
      const modal = document.getElementById('ym-ai-modal');
      const body = document.getElementById('ym-ai-body');
      if (!modal || !body) return;
      modal.classList.remove('hidden');
      body.innerHTML = '<div class="flex items-center gap-3 py-4"><span class="material-symbols-outlined animate-spin text-primary">sync</span><span class="text-sm text-on-surface-variant">Generating AI summary...</span></div>';
      body.innerHTML = plants.map(p => {
        const health = getPlantHealth(p);
        const alarmCount = p.machines ? p.machines.reduce((s, m) => s + (m._count?.alarms || 0), 0) : 0;
        const oee = p.oee || 0;
        const status = health >= 85 ? 'healthy' : health >= 65 ? 'needs attention' : 'critical';
        return '<div style="border-left:3px solid ' + (health >= 85 ? '#006b5f' : health >= 65 ? '#774f00' : '#ba1a1a') + ';padding-left:10px;margin-bottom:12px"><p style="font-weight:700;color:#191a28;font-size:14px">' + p.name + '</p><p style="font-size:12px;color:#464555">Operating at <strong>' + oee + '%</strong> OEE with <strong>' + health + '%</strong> machine health. ' + (alarmCount > 0 ? alarmCount + ' active alarm(s).' : 'No active alarms.') + ' Status: <strong style="color:' + (health >= 85 ? '#006b5f' : '#774f00') + '">' + status + '</strong>.</p><p style="font-size:11px;color:#767586">' + (p.domain || 'Manufacturing') + ' · ' + p.location + '</p></div>';
      }).join('<hr style="border-color:#e1dfff;margin:8px 0"/>') + '<hr style="border-color:#e1dfff;margin:8px 0"/><p style="font-size:11px;color:#767586;font-style:italic">Live plant telemetry and operational data.</p>';
    });

    document.querySelector('[data-close-ai]')?.addEventListener('click', () => {
      document.getElementById('ym-ai-modal')?.classList.add('hidden');
    });
  });
})();
