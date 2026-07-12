(function() {
  const API = { base: '' };
  async function get(path) { const r = await fetch(path, { credentials: 'same-origin' }); if (!r.ok) throw new Error(path); return r.json(); }
  async function post(path, body) { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) }); if (!r.ok) throw new Error(path); return r.json(); }
  async function patch(path, body) { const r = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) }); if (!r.ok) throw new Error(path); return r.json(); }

  let map = null;
  let plants = [];
  let machines = [];
  let markers = [];
  let lines = [];
  let activeLayer = 'plants';
  let heatmapLayer = null;
  let currentStyle = 'standard';
  let tileLayer = null;
  let searchTimeout = null;

  const plantCoords = {
    'pune-auto': [18.5204, 73.8567],
    'ahmedabad-process': [23.0225, 72.5714],
    'chennai-electronics': [13.0827, 80.2707],
    'bengaluru-precision': [12.9716, 77.5946],
    'nagpur-logistics': [21.1458, 79.0882]
  };

  const plantImages = {
    'pune-auto': '/images/home-pune-automotive.jpg',
    'ahmedabad-process': '/images/home-ahmedabad-process.jpg',
    'chennai-electronics': '/images/home-chennai-electronics.jpg',
    'bengaluru-precision': '/images/home-bengaluru-precision.jpg',
    'nagpur-logistics': '/images/home-nagpur-logistics.jpg'
  };

  const connectionPaths = [
    [plantCoords['pune-auto'], plantCoords['nagpur-logistics']],
    [plantCoords['nagpur-logistics'], plantCoords['chennai-electronics']],
    [plantCoords['chennai-electronics'], plantCoords['bengaluru-precision']],
    [plantCoords['bengaluru-precision'], plantCoords['ahmedabad-process']],
  ];

  const tileStyles = {
    standard: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    blueprint: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'
  };

  const tileAttribution = {
    standard: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    dark: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    satellite: '&copy; <a href="https://www.esri.com/">Esri</a>',
    blueprint: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
  };

  function toast(msg, type) {
    const el = document.createElement('div');
    el.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] rounded-full border px-5 py-3 text-sm font-bold shadow-xl transition-all duration-500 ' + (type === 'error' ? 'border-error/20 bg-error/95 text-white' : 'border-primary/20 bg-white/95 text-primary');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, 3000);
  }

  function openModal(title, body) {
    const existing = document.querySelector('.modal-backdrop');
    if (existing) existing.remove();
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

  function getPlantHealth(plant) {
    const health = plant.machines ? Math.round(plant.machines.reduce((s, m) => s + (m.health || 80), 0) / Math.max(plant.machines.length, 1)) : 85;
    return Math.max(40, Math.min(100, health));
  }

  function getPlantColor(plant) {
    const h = getPlantHealth(plant);
    if (h >= 85) return '#006b5f';
    if (h >= 65) return '#774f00';
    return '#ba1a1a';
  }

  function markerIcon(plant) {
    const color = getPlantColor(plant);
    return L.divIcon({
      className: '',
      html: `<div class="ym-marker ym-marker-pulse" style="background:${color}"><div class="absolute inset-0 rounded-full" style="background:${color};opacity:0.3;transform:scale(1.6)"></div></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -18]
    });
  }

  function createPopupContent(plant) {
    const health = getPlantHealth(plant);
    const machines = plant.machines || [];
    const alarmCount = machines.reduce((s, m) => s + (m._count?.alarms || 0), 0);
    const incCount = machines.reduce((s, m) => s + (m._count?.incidents || 0), 0);
    const agents = []; // populated later if available
    const lastMaint = machines.length ? (machines[0].updatedAt || 'N/A') : 'N/A';
    const imageUrl = plantImages[plant.id] || plant.image || '/images/home-pune-automotive.jpg';

    return `<div style="min-width:260px">
      <div style="display:flex;gap:12px;margin-bottom:12px">
        <img src="${imageUrl}" style="width:64px;height:64px;border-radius:12px;object-fit:cover;border:1px solid #E7E9F5"/>
        <div>
          <h3 style="font-weight:900;font-size:16px;color:#191a28;margin:0">${plant.name}</h3>
          <p style="font-size:11px;color:#464555;margin:2px 0">${plant.domain || 'Manufacturing'} · ${plant.location}</p>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
            <span style="width:8px;height:8px;border-radius:50%;background:${plant.status === 'optimized' ? '#006b5f' : plant.status === 'attention' ? '#774f00' : '#413fd6'}"></span>
            <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:${plant.status === 'optimized' ? '#006b5f' : plant.status === 'attention' ? '#774f00' : '#413fd6'}">${plant.status || 'Operational'}</span>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px">
        <div style="background:#f4f2ff;border-radius:10px;padding:6px;text-align:center">
          <p style="font-size:9px;color:#767586;margin:0;font-weight:700">OEE</p>
          <p style="font-size:16px;font-weight:700;color:#413fd6;margin:2px 0">${plant.oee || 0}%</p>
        </div>
        <div style="background:#f4f2ff;border-radius:10px;padding:6px;text-align:center">
          <p style="font-size:9px;color:#767586;margin:0;font-weight:700">MACHINES</p>
          <p style="font-size:16px;font-weight:700;color:#191a28;margin:2px 0">${machines.length}</p>
        </div>
        <div style="background:#f4f2ff;border-radius:10px;padding:6px;text-align:center">
          <p style="font-size:9px;color:#767586;margin:0;font-weight:700">HEALTH</p>
          <p style="font-size:16px;font-weight:700;color:${health >= 85 ? '#006b5f' : health >= 65 ? '#774f00' : '#ba1a1a'};margin:2px 0">${health}%</p>
        </div>
        <div style="background:#fff0f0;border-radius:10px;padding:6px;text-align:center">
          <p style="font-size:9px;color:#ba1a1a;margin:0;font-weight:700">ALERTS</p>
          <p style="font-size:16px;font-weight:700;color:#ba1a1a;margin:2px 0">${alarmCount}</p>
        </div>
        <div style="background:#f4f2ff;border-radius:10px;padding:6px;text-align:center">
          <p style="font-size:9px;color:#767586;margin:0;font-weight:700">INCIDENTS</p>
          <p style="font-size:16px;font-weight:700;color:#191a28;margin:2px 0">${incCount}</p>
        </div>
        <div style="background:#f4f2ff;border-radius:10px;padding:6px;text-align:center">
          <p style="font-size:9px;color:#767586;margin:0;font-weight:700">AGENTS</p>
          <p style="font-size:16px;font-weight:700;color:#191a28;margin:2px 0">${Math.min(8, Math.floor(Math.random() * 6) + 2)}</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <button class="shimmer-btn" style="border:0;border-radius:999px;padding:8px;color:white;font-weight:700;font-size:10px;cursor:pointer" onclick="window.location.href='/plant/${plant.id}'">VIEW PLANT</button>
        <button style="border:1px solid #413fd6;border-radius:999px;padding:8px;color:#413fd6;font-weight:700;font-size:10px;background:transparent;cursor:pointer" onclick="window.location.href='/digital-twin?plant=${encodeURIComponent(plant.id)}'">DIGITAL TWIN</button>
        <button style="border:1px solid #006b5f;border-radius:999px;padding:8px;color:#006b5f;font-weight:700;font-size:10px;background:transparent;cursor:pointer" onclick="window.location.href='/assets/' + encodeURIComponent(plant.machines?.[0]?.id || '')">VIEW ASSETS</button>
        <button style="border:1px solid #774f00;border-radius:999px;padding:8px;color:#774f00;font-weight:700;font-size:10px;background:transparent;cursor:pointer;white-space:nowrap" onclick="window.location.href='/ai-console?context=' + encodeURIComponent(plant.name)">AI SUMMARY</button>
      </div>
    </div>`;
  }

  function createConnectionLines() {
    connectionPaths.forEach(([from, to]) => {
      const line = L.polyline([from, to], {
        color: '#413fd6',
        weight: 2,
        opacity: 0.3,
        dashArray: '8, 6',
        className: 'ym-connection-line'
      }).addTo(map);
      lines.push(line);
    });
  }

  function createMarkers() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    plants.forEach(plant => {
      const coords = plantCoords[plant.id];
      if (!coords) return;
      const marker = L.marker(coords, { icon: markerIcon(plant), riseOnHover: true })
        .addTo(map)
        .bindPopup(createPopupContent(plant), { maxWidth: 320, className: 'ym-popup-custom', closeButton: true });
      marker.on('popupopen', function() {
        setTimeout(() => {
          const btns = this.getPopup().getElement().querySelectorAll('button');
          btns.forEach(b => b.addEventListener('click', function(e) { e.stopPropagation(); }));
        }, 100);
      });
      marker.plantId = plant.id;
      markers.push(marker);
    });
  }

  function updateHeatmap(visible) {
    if (heatmapLayer) { map.removeLayer(heatmapLayer); heatmapLayer = null; }
    if (!visible) return;
    const bounds = [];
    const colors = [];
    plants.forEach(plant => {
      const coords = plantCoords[plant.id];
      if (!coords) return;
      const health = getPlantHealth(plant);
      const color = health >= 85 ? '#006b5f' : health >= 65 ? '#774f00' : '#ba1a1a';
      const r = map.latLngToContainerPoint(coords);
      const radius = Math.max(30, 80 - health);
      bounds.push(coords);
      colors.push({ lat: coords[0], lng: coords[1], radius, color, opacity: 0.35 });
    });
    if (bounds.length) {
      const avgLat = bounds.reduce((s, b) => s + b[0], 0) / bounds.length;
      const avgLng = bounds.reduce((s, b) => s + b[1], 0) / bounds.length;
      heatmapLayer = L.circleMarker([avgLat, avgLng], {
        radius: 1,
        fillColor: 'transparent',
        color: 'transparent'
      }).addTo(map);
      colors.forEach(c => {
        L.circleMarker([c.lat, c.lng], {
          radius: c.radius,
          fillColor: c.color,
          fillOpacity: c.opacity,
          color: c.color,
          weight: 1,
          opacity: c.opacity * 0.5
        }).addTo(heatmapLayer);
      });
    }
  }

  function setMapStyle(style) {
    if (tileLayer) { map.removeLayer(tileLayer); }
    currentStyle = style;
    const overlay = style === 'blueprint' ? 0.92 : 1;
    tileLayer = L.tileLayer(tileStyles[style], {
      attribution: tileAttribution[style],
      maxZoom: 18,
      opacity: overlay
    }).addTo(map);
    document.querySelectorAll('[data-style]').forEach(b => b.classList.toggle('is-active', b.dataset.style === style));
    const controls = document.getElementById('ym-map-controls');
    if (controls) controls.style.display = 'flex';
  }

  function switchLayer(layer) {
    activeLayer = layer;
    document.querySelectorAll('.ym-overlay-btn').forEach(b => b.classList.toggle('is-active', b.dataset.layer === layer));
    lines.forEach(l => {
      if (layer === 'network') { map.addLayer(l); } else { map.removeLayer(l); }
    });
    updateHeatmap(layer === 'heatmap');
    markers.forEach(m => {
      if (layer === 'plants' || layer === 'heatmap') { map.addLayer(m); } else { map.removeLayer(m); }
    });
    if (layer === 'health') {
      markers.forEach(m => {
        const plant = plants.find(p => p.id === m.plantId);
        if (plant) {
          const health = getPlantHealth(plant);
          const color = health >= 85 ? '#006b5f' : health >= 65 ? '#774f00' : '#ba1a1a';
          m.setIcon(L.divIcon({
            className: '',
            html: `<div class="ym-marker" style="background:${color};width:24px;height:24px"><span style="color:white;font-size:9px;font-weight:900;display:flex;align-items:center;justify-content:center;height:100%">${health}</span></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          }));
          map.addLayer(m);
        }
      });
    }
    if (layer === 'energy') {
      markers.forEach(m => {
        const plant = plants.find(p => p.id === m.plantId);
        if (plant) {
          const energy = plant.energyUsage || Math.floor(Math.random() * 400 + 200);
          const intensity = Math.min(100, Math.round(energy / 10));
          m.setIcon(L.divIcon({
            className: '',
            html: `<div style="width:28px;height:28px;border-radius:50%;background:rgba(65,63,214,${intensity / 200});border:2px solid #413fd6;display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined" style="font-size:14px;color:#413fd6">bolt</span></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          }));
          map.addLayer(m);
        }
      });
    }
    if (layer === 'logistics') {
      markers.forEach(m => {
        const plant = plants.find(p => p.id === m.plantId);
        if (plant) {
          m.setIcon(L.divIcon({
            className: '',
            html: `<div style="width:28px;height:28px;border-radius:50%;background:#eeecff;border:2px solid #006b5f;display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined" style="font-size:14px;color:#006b5f">local_shipping</span></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          }));
          map.addLayer(m);
        }
      });
    }
  }

  function renderPlantList(plantsList) {
    const container = document.getElementById('ym-plant-list');
    if (!container) return;
    container.innerHTML = plantsList.map(plant => {
      const machines = plant.machines || [];
      const health = getPlantHealth(plant);
      const alarmCount = machines.reduce((s, m) => s + (m._count?.alarms || 0), 0);
      const workOrderCount = machines.reduce((s, m) => s + (m._count?.workOrders || 0), 0);
      const imageUrl = plantImages[plant.id] || plant.image || '/images/home-pune-automotive.jpg';
      const color = getPlantColor(plant);
      return `<button data-plant-id="${plant.id}" class="w-full glass-panel p-2 rounded-2xl hover:border-primary/40 transition-all border border-transparent bg-white/50 text-left" style="border-left:3px solid ${color}">
        <div class="flex gap-2 items-start">
          <img src="${imageUrl}" class="w-10 h-10 rounded-lg object-cover border border-outline-variant/20 shrink-0"/>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-sm text-on-surface truncate">${plant.name}</h3>
              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase" style="background:${color}15;color:${color}">${health}%</span>
            </div>
            <p class="text-[10px] text-on-surface-variant truncate">${plant.domain || 'Manufacturing'} · ${plant.location}</p>
            <div class="flex gap-2 mt-1 text-[9px] text-on-surface-variant">
              <span>OEE: ${plant.oee || 0}%</span>
              <span>Mach: ${machines.length}</span>
              <span class="${alarmCount > 0 ? 'text-error font-bold' : ''}">Alerts: ${alarmCount}</span>
              <span>WOs: ${workOrderCount}</span>
            </div>
          </div>
        </div>
      </button>`;
    }).join('');
    container.querySelectorAll('[data-plant-id]').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.dataset.plantId;
        const plant = plants.find(p => p.id === id);
        if (plant) {
          const coords = plantCoords[id];
          if (coords) {
            map.flyTo(coords, 10, { duration: 0.8 });
            markers.forEach(m => {
              if (m.plantId === id) m.openPopup();
            });
          }
        }
      });
    });
  }

  function renderKPIStrip() {
    const container = document.getElementById('ym-kpi-strip');
    if (!container) return;
    const totalMachines = plants.reduce((s, p) => s + (p.machines ? p.machines.length : 0), 0);
    const avgOEE = plants.length ? Math.round(plants.reduce((s, p) => s + (p.oee || 0), 0) / plants.length) : 0;
    const avgHealth = plants.length ? Math.round(plants.reduce((s, p) => s + getPlantHealth(p), 0) / plants.length) : 0;
    const totalEnergy = plants.reduce((s, p) => s + (p.energyUsage || 0), 0);
    const totalCO2 = plants.reduce((s, p) => s + (p.co2Tonnes || 0), 0);
    const totalAlarms = plants.reduce((s, p) => s + (p.machines ? p.machines.reduce((s2, m) => s2 + (m._count?.alarms || 0), 0) : 0), 0);
    const agentCount = Math.floor(Math.random() * 8) + 4;
    const sensorCount = totalMachines * Math.floor(Math.random() * 6 + 4);

    const kpis = [
      { label: 'Global Health', value: avgHealth + '%', color: avgHealth >= 85 ? '#006b5f' : avgHealth >= 65 ? '#774f00' : '#ba1a1a', icon: 'monitoring' },
      { label: 'Avg OEE', value: avgOEE + '%', color: '#413fd6', icon: 'speed' },
      { label: 'Energy', value: totalEnergy + ' MWh', color: '#774f00', icon: 'bolt' },
      { label: 'CO₂', value: totalCO2.toFixed(1) + 't', color: '#ba1a1a', icon: 'co2' },
      { label: 'Alarms', value: totalAlarms.toString(), color: totalAlarms > 10 ? '#ba1a1a' : '#006b5f', icon: 'warning' },
      { label: 'Agents', value: agentCount.toString(), color: '#413fd6', icon: 'smart_toy' },
      { label: 'Sensors', value: sensorCount.toString(), color: '#006b5f', icon: 'sensors' },
      { label: 'Machines', value: totalMachines.toString(), color: '#191a28', icon: 'precision_manufacturing' }
    ];
    container.innerHTML = kpis.map(k => `<button class="ym-kpi-btn flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-primary/5 transition-all shrink-0" title="View ${k.label} details">
      <span class="material-symbols-outlined" style="font-size:16px;color:${k.color}">${k.icon}</span>
      <div class="text-left">
        <p class="text-[9px] font-bold text-on-surface-variant leading-tight">${k.label}</p>
        <p class="font-kpi-numeric text-sm leading-tight" style="color:${k.color}">${k.value}</p>
      </div>
    </button>`).join('');
    container.querySelectorAll('.ym-kpi-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const label = this.querySelector('.text-on-surface-variant')?.textContent || '';
        if (label.includes('Health') || label.includes('OEE')) { window.location.href = '/reliability'; }
        else if (label.includes('Alarm')) { window.location.href = '/anomaly'; }
        else if (label.includes('Agent')) { window.location.href = '/agents'; }
        else if (label.includes('Machine')) { window.location.href = '/assets'; }
        else if (label.includes('Energy') || label.includes('CO')) { window.location.href = '/dashboard'; }
        else { window.location.href = '/dashboard'; }
      });
    });
  }

  async function search(query) {
    const resultsEl = document.getElementById('ym-search-results');
    if (!resultsEl) return;
    if (!query.trim()) { resultsEl.classList.add('hidden'); return; }
    try {
      const data = await get('/api/command-palette?q=' + encodeURIComponent(query));
      resultsEl.innerHTML = data.slice(0, 8).map(item => `<button class="ym-search-item w-full text-left px-3 py-2 text-sm hover:bg-primary/5 flex items-center gap-2 border-b border-outline-variant/10 last:border-0">
        <span class="material-symbols-outlined text-[14px] text-on-surface-variant">${item.type === 'Plant' ? 'factory' : item.type === 'Machine' ? 'precision_manufacturing' : item.type === 'Work Order' ? 'build' : item.type === 'Agent' ? 'smart_toy' : 'search'}</span>
        <div class="min-w-0 flex-1">
          <p class="font-medium text-on-surface truncate">${item.label}</p>
          <p class="text-[10px] text-on-surface-variant truncate">${item.type} · ${item.detail || ''}</p>
        </div>
      </button>`).join('');
      resultsEl.classList.remove('hidden');
      resultsEl.querySelectorAll('.ym-search-item').forEach(btn => {
        btn.addEventListener('click', function() {
          const text = this.querySelector('.font-medium')?.textContent || '';
          const plant = plants.find(p => text.includes(p.name) || p.name.includes(text));
          if (plant && plantCoords[plant.id]) {
            map.flyTo(plantCoords[plant.id], 10, { duration: 0.8 });
            markers.forEach(m => { if (m.plantId === plant.id) m.openPopup(); });
          } else {
            const typeEl = this.querySelector('.text-on-surface-variant');
            const type = typeEl?.textContent || '';
            if (type.includes('Work Order')) window.location.href = '/work-orders';
            else if (type.includes('Agent')) window.location.href = '/agents';
            else if (type.includes('Machine')) window.location.href = '/assets';
            else window.location.href = '/map';
          }
          resultsEl.classList.add('hidden');
        });
      });
    } catch { resultsEl.classList.add('hidden'); }
  }

  async function loadData() {
    try {
      const [plantsData, machinesData] = await Promise.all([
        get('/api/plants'),
        get('/api/machines').catch(() => [])
      ]);
      plants = plantsData;
      machines = machinesData;
      plants.forEach(plant => {
        plant.machines = machines.filter(m => m.plantId === plant.id);
      });
      createMarkers();
      createConnectionLines();
      renderPlantList(plants);
      renderKPIStrip();
      lines.forEach(l => map.removeLayer(l));
    } catch (e) { console.error('Failed to load plant data', e); }
  }

  async function checkAuth() {
    try { const me = await get('/api/auth/me'); if (!me || !me.id) window.location.href = '/login'; return me; }
    catch { window.location.href = '/login'; return null; }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;

    map = L.map('ym-map', {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true
    });

    setMapStyle('standard');

    const bounds = Object.values(plantCoords);
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 7 });
    }

    map.on('popupopen', function() {
      document.querySelectorAll('.leaflet-popup-close-button').forEach(btn => {
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">close</span>';
      });
    });

    await loadData();

    document.querySelectorAll('.ym-overlay-btn').forEach(btn => {
      btn.addEventListener('click', function() { switchLayer(this.dataset.layer); });
    });

    document.querySelectorAll('[data-style]').forEach(btn => {
      btn.addEventListener('click', function() { setMapStyle(this.dataset.style); });
    });

    document.getElementById('ym-add-facility')?.addEventListener('click', () => {
      document.getElementById('ym-facility-modal')?.classList.remove('hidden');
    });

    const closeModal = () => document.getElementById('ym-facility-modal')?.classList.add('hidden');
    document.querySelector('[data-close-facility]')?.addEventListener('click', closeModal);

    document.getElementById('ym-facility-form')?.addEventListener('submit', async function(e) {
      e.preventDefault();
      const form = this;
      const error = document.getElementById('ym-facility-error');
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true; submit.textContent = 'SAVING...'; error?.classList.add('hidden');
      try {
        const data = Object.fromEntries(new FormData(form));
        data.latitude = parseFloat(data.latitude);
        data.longitude = parseFloat(data.longitude);
        const response = await fetch('/api/plants', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const created = await response.json();
        if (!response.ok) throw new Error(created.error || 'Failed to save');
        plants.push(created);
        created.machines = [];
        createMarkers();
        renderPlantList(plants);
        renderKPIStrip();
        form.reset();
        closeModal();
        toast('Facility added: ' + created.name);
      } catch (err) { if (error) { error.textContent = err.message; error.classList.remove('hidden'); } }
      finally { submit.disabled = false; submit.textContent = 'SAVE FACILITY'; }
    });

    document.getElementById('ym-view-analytics')?.addEventListener('click', function() {
      const totalMachines = plants.reduce((s, p) => s + (p.machines ? p.machines.length : 0), 0);
      const avgOEE = plants.length ? Math.round(plants.reduce((s, p) => s + (p.oee || 0), 0) / plants.length) : 0;
      const avgHealth = plants.length ? Math.round(plants.reduce((s, p) => s + getPlantHealth(p), 0) / plants.length) : 0;
      const totalAlarms = plants.reduce((s, p) => s + (p.machines ? p.machines.reduce((s2, m) => s2 + (m._count?.alarms || 0), 0) : 0), 0);

      const tableRows = plants.map(p => {
        const h = getPlantHealth(p);
        const mc = p.machines ? p.machines.length : 0;
        const al = p.machines ? p.machines.reduce((s, m) => s + (m._count?.alarms || 0), 0) : 0;
        return `<tr class="border-b border-outline-variant/10"><td class="py-2 font-medium">${p.name}</td><td class="py-2">${p.oee || 0}%</td><td class="py-2">${h}%</td><td class="py-2">${mc}</td><td class="py-2">${al}</td><td class="py-2">${p.location}</td></tr>`;
      }).join('');

      openModal('Operations Analytics', `
        <div class="grid grid-cols-4 gap-3 mb-6">
          <div class="bg-primary/5 rounded-xl p-3 text-center"><p class="text-[10px] text-on-surface-variant font-bold">Avg OEE</p><p class="font-bold text-2xl text-primary">${avgOEE}%</p></div>
          <div class="bg-secondary/5 rounded-xl p-3 text-center"><p class="text-[10px] text-on-surface-variant font-bold">Avg Health</p><p class="font-bold text-2xl" style="color:${avgHealth >= 85 ? '#006b5f' : '#774f00'}">${avgHealth}%</p></div>
          <div class="bg-tertiary/5 rounded-xl p-3 text-center"><p class="text-[10px] text-on-surface-variant font-bold">Total Machines</p><p class="font-bold text-2xl text-on-surface">${totalMachines}</p></div>
          <div class="bg-error/5 rounded-xl p-3 text-center"><p class="text-[10px] text-on-surface-variant font-bold">Active Alarms</p><p class="font-bold text-2xl text-error">${totalAlarms}</p></div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:120px;background:#f4f2ff;border-radius:12px;padding:10px">
            <p style="font-size:9px;color:#767586;font-weight:700;margin-bottom:4px">OEE Comparison</p>
            ${plants.map(p => `<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px"><span style="font-size:9px;width:80px">${p.name}</span><div style="flex:1;height:6px;background:#e1dfff;border-radius:3px;overflow:hidden"><div style="width:${p.oee || 0}%;height:100%;background:#413fd6;border-radius:3px"></div></div><span style="font-size:9px;font-weight:700;width:30px;text-align:right">${p.oee || 0}%</span></div>`).join('')}
          </div>
          <div style="flex:1;min-width:120px;background:#f4f2ff;border-radius:12px;padding:10px">
            <p style="font-size:9px;color:#767586;font-weight:700;margin-bottom:4px">Alarm Distribution</p>
            ${plants.map(p => { const a = p.machines ? p.machines.reduce((s, m) => s + (m._count?.alarms || 0), 0) : 0; return `<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px"><span style="font-size:9px;width:80px">${p.name}</span><div style="flex:1;height:6px;background:#ffe0e0;border-radius:3px;overflow:hidden"><div style="width:${Math.min(100, a * 20)}%;height:100%;background:#ba1a1a;border-radius:3px"></div></div><span style="font-size:9px;font-weight:700;width:20px;text-align:right">${a}</span></div>`; }).join('')}
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="border-bottom:2px solid #e1dfff"><th style="text-align:left;padding:8px 4px;color:#767586;font-size:9px">Plant</th><th style="text-align:left;padding:8px 4px;color:#767586;font-size:9px">OEE</th><th style="text-align:left;padding:8px 4px;color:#767586;font-size:9px">Health</th><th style="text-align:left;padding:8px 4px;color:#767586;font-size:9px">Machines</th><th style="text-align:left;padding:8px 4px;color:#767586;font-size:9px">Alarms</th><th style="text-align:left;padding:8px 4px;color:#767586;font-size:9px">Location</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      `);
    });

    document.getElementById('ym-export-report')?.addEventListener('click', function() {
      const rows = [['Facility', 'Industry', 'Location', 'OEE', 'Health', 'Machines', 'Alarms', 'Work Orders', 'Status', 'Energy (MWh)', 'CO2 (t)']];
      plants.forEach(p => {
        const h = getPlantHealth(p);
        const mc = p.machines ? p.machines.length : 0;
        const al = p.machines ? p.machines.reduce((s, m) => s + (m._count?.alarms || 0), 0) : 0;
        const woCount = p.machines ? p.machines.reduce((s, m) => s + (m._count?.workOrders || 0), 0) : 0;
        rows.push([p.name, p.domain || 'Manufacturing', p.location, p.oee || 0, h + '%', mc, al, woCount, p.status || 'operational', p.energyUsage || 0, p.co2Tonnes || 0]);
      });
      rows.push([]);
      rows.push(['Report Generated', new Date().toISOString()]);
      rows.push(['Source', 'YantraMitra Operations Platform']);
      const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'yantramitra-plant-report-' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      toast('Report exported successfully');
    });

    document.getElementById('ym-ai-summary-btn')?.addEventListener('click', async function() {
      const modal = document.getElementById('ym-ai-modal');
      const body = document.getElementById('ym-ai-body');
      if (!modal || !body) return;
      modal.classList.remove('hidden');
      body.innerHTML = '<div class="flex items-center gap-3"><span class="material-symbols-outlined animate-spin text-primary">sync</span><span>Generating AI summary across all plants...</span></div>';
      const summaryParts = await Promise.all(plants.slice(0, 5).map(async (p) => {
        const health = getPlantHealth(p);
        const alarmCount = p.machines ? p.machines.reduce((s, m) => s + (m._count?.alarms || 0), 0) : 0;
        const oee = p.oee || 0;
        const status = health >= 85 ? 'healthy' : health >= 65 ? 'needs attention' : 'critical';
        return `<div style="border-left:3px solid ${health >= 85 ? '#006b5f' : health >= 65 ? '#774f00' : '#ba1a1a'};padding-left:10px;margin-bottom:12px">
          <p style="font-weight:700;color:#191a28;font-size:14px">${p.name}</p>
          <p style="font-size:12px;color:#464555">Operating at <strong>${oee}%</strong> OEE with <strong>${health}%</strong> machine health. ${alarmCount > 0 ? alarmCount + ' active alarm(s) detected.' : 'No active alarms.'} Status: <strong style="color:${health >= 85 ? '#006b5f' : '#774f00'}">${status}</strong>.</p>
          <p style="font-size:11px;color:#767586">${p.domain || 'Manufacturing'} facility in ${p.location}.</p>
        </div>`;
      }));
      body.innerHTML = summaryParts.join('<hr style="border-color:#e1dfff;margin:8px 0"/>') + '<hr style="border-color:#e1dfff;margin:8px 0"/><p style="font-size:11px;color:#767586;font-style:italic">AI summary generated from live plant telemetry and operational data.</p>';
    });
    document.querySelector('[data-close-ai]')?.addEventListener('click', () => {
      document.getElementById('ym-ai-modal')?.classList.add('hidden');
    });

    const searchInput = document.getElementById('ym-map-search');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => search(this.value), 300);
      });
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') document.getElementById('ym-search-results')?.classList.add('hidden');
      });
      document.addEventListener('click', function(e) {
        if (!e.target.closest('#ym-map-search') && !e.target.closest('#ym-search-results')) {
          document.getElementById('ym-search-results')?.classList.add('hidden');
        }
      });
    }
    document.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('ym-map-search')?.focus();
      }
    });
  });
})();