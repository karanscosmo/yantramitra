(function() {
  async function api(path) { const r = await fetch(path); if (!r.ok) { const e = await r.json().catch(() => ({ error: r.statusText })); throw new Error(e.error || 'Request failed'); } return r.json(); }

  async function checkAuth() {
    try { const me = await api('/api/auth/me'); if (!me || !me.id) window.location.href = '/'; return me; }
    catch { window.location.href = '/'; return null; }
  }

  function getAssetId() {
    const match = window.location.pathname.match(/\/diagnostics\/(.+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function statusClass(status) {
    const map = { running: 'bg-secondary/20 text-secondary', warning: 'bg-tertiary-fixed-dim/30 text-tertiary', maintenance: 'bg-error-container text-error', idle: 'bg-surface-variant text-on-surface-variant' };
    return map[status] || 'bg-surface-variant text-on-surface-variant';
  }

  function statusLabel(status) {
    const map = { running: 'Operational', warning: 'Warning', maintenance: 'Maintenance', idle: 'Idle' };
    return map[status] || status;
  }

  function renderPage(data) {
    const { machine, plant, hierarchy, alarms, maintenanceEvents, workOrders, plans, incidents, sensors, telemetry, aiPredictions } = data;
    const hasData = machine && machine.id;

    if (!hasData) {
      hide(document.getElementById('ym-loading'));
      hide(document.getElementById('ym-error'));
      show(document.getElementById('ym-empty'));
      return;
    }

    document.getElementById('ym-breadcrumb-asset').textContent = machine.name;

    const metaEl = document.getElementById('ym-asset-meta');
    metaEl.textContent = [plant?.name, '·', machine.serial || machine.id.slice(0, 8)].filter(Boolean).join(' ');

    document.getElementById('ym-asset-name').textContent = machine.name;

    const badge = document.getElementById('ym-asset-status-badge');
    badge.textContent = statusLabel(machine.status);
    badge.className = 'px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ' + statusClass(machine.status);

    document.getElementById('ym-asset-health').textContent = Math.round(machine.health) + '%';
    document.getElementById('ym-asset-updated').textContent = machine.lastUpdated ? new Date(machine.lastUpdated).toLocaleDateString() : '—';

    document.title = machine.name + ' | Diagnostics | YantraMitra';

    renderTimeline(alarms, maintenanceEvents, incidents);
    renderTelemetry(telemetry);
    renderAiAnalysis(aiPredictions);
    renderRelated(workOrders, plans, machine);
    renderActions(machine, plant);

    hide(document.getElementById('ym-loading'));
    show(document.getElementById('ym-content'));
  }

  function renderTimeline(alarms, events, incidents) {
    const container = document.getElementById('ym-timeline');
    const items = [];

    (alarms || []).forEach(a => {
      items.push({ date: a.createdAt, type: 'alarm', title: a.title, detail: a.severity + ' · ' + (a.message || ''), icon: 'warning', color: a.severity === 'critical' ? 'text-error' : a.severity === 'warning' ? 'text-tertiary' : 'text-primary' });
    });
    (events || []).forEach(e => {
      items.push({ date: e.performedAt, type: 'maintenance', title: e.title, detail: (e.performedBy || 'Team') + ' · ' + (e.notes || ''), icon: 'build', color: 'text-secondary' });
    });
    (incidents || []).forEach(i => {
      items.push({ date: i.updatedAt, type: 'incident', title: i.title, detail: i.severity + ' · ' + i.stage, icon: 'emergency', color: 'text-error' });
    });

    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (items.length === 0) {
      container.innerHTML = '<div class="text-center py-8 text-on-surface-variant">No timeline events recorded for this asset.</div>';
      return;
    }

    container.innerHTML = items.slice(0, 30).map(item => {
      const dateStr = item.date ? new Date(item.date).toLocaleString() : '';
      return '<div class="flex gap-3 p-3 rounded-xl hover:bg-surface-container/50 transition-colors">' +
        '<div class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0 mt-0.5">' +
        '<span class="material-symbols-outlined text-sm ' + item.color + '">' + item.icon + '</span></div>' +
        '<div class="flex-1 min-w-0"><p class="text-sm font-bold text-on-surface truncate">' + escapeHtml(item.title) + '</p>' +
        '<p class="text-xs text-on-surface-variant truncate">' + escapeHtml(item.detail) + '</p>' +
        '<p class="text-[10px] text-on-surface-variant/60 mt-0.5">' + dateStr + '</p></div></div>';
    }).join('');
  }

  function renderTelemetry(telemetry) {
    const container = document.getElementById('ym-telemetry');
    if (!telemetry) { container.innerHTML = '<div class="text-center py-4 text-on-surface-variant col-span-full">No telemetry data available.</div>'; return; }

    const labels = { temperature: 'Temperature', vibration: 'Vibration', power: 'Power', rpm: 'RPM', torque: 'Torque', pressure: 'Pressure', energy: 'Energy' };
    const icons = { temperature: 'thermostat', vibration: 'vibration', power: 'bolt', rpm: 'speed', torque: 'settings', pressure: 'compress', energy: 'electric_bolt' };
    const hasAny = Object.values(telemetry).some(t => t.value != null);

    if (!hasAny) { container.innerHTML = '<div class="text-center py-4 text-on-surface-variant col-span-full">No telemetry data available.</div>'; return; }

    container.innerHTML = Object.entries(telemetry).map(([key, t]) => {
      const val = t.value != null ? t.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' ' + t.unit : '—';
      return '<div class="card p-3 flex items-center gap-3">' +
        '<div class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">' +
        '<span class="material-symbols-outlined text-sm text-primary">' + (icons[key] || 'sensors') + '</span></div>' +
        '<div class="min-w-0"><p class="text-[10px] font-bold uppercase text-on-surface-variant">' + (labels[key] || key) + '</p>' +
        '<p class="text-sm font-bold text-on-surface truncate">' + val + '</p></div></div>';
    }).join('');
  }

  function renderAiAnalysis(ai) {
    const container = document.getElementById('ym-ai-analysis');
    if (!ai) { container.innerHTML = '<div class="text-center py-4 text-on-surface-variant">AI analysis not yet available.</div>'; return; }

    const items = [
      { label: 'Root Cause', value: ai.rootCause, icon: 'search_insights' },
      { label: 'Confidence', value: ai.confidence + '%', icon: 'verified', valueClass: ai.confidence > 85 ? 'text-secondary' : ai.confidence > 70 ? 'text-tertiary' : 'text-error' },
      { label: 'Affected Components', value: (ai.affectedComponents || []).join(', ') || 'None identified', icon: 'settings' },
      { label: 'Recommended Actions', value: (ai.recommendedActions || []).map(a => '→ ' + a).join('<br>'), icon: 'checklist' },
      { label: 'Estimated Downtime', value: ai.estimatedDowntime, icon: 'schedule' },
      { label: 'Remaining Useful Life', value: ai.remainingUsefulLife, icon: 'hourglass_bottom' }
    ];

    container.innerHTML = items.map(item =>
      '<div class="flex gap-3 p-3 rounded-xl hover:bg-surface-container/30 transition-colors">' +
      '<div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">' +
      '<span class="material-symbols-outlined text-sm text-primary">' + item.icon + '</span></div>' +
      '<div class="min-w-0 flex-1"><p class="text-[10px] font-bold uppercase text-on-surface-variant">' + item.label + '</p>' +
      '<p class="text-sm font-semibold text-on-surface ' + (item.valueClass || '') + '">' + item.value + '</p></div></div>'
    ).join('');
  }

  function renderRelated(workOrders, plans, machine) {
    const container = document.getElementById('ym-related-items');
    const items = [];
    (workOrders || []).slice(0, 5).forEach(wo => {
      items.push({ label: wo.title, detail: wo.status + ' · ' + wo.priority, href: '/work-orders', icon: 'build', color: 'text-primary' });
    });
    (plans || []).slice(0, 5).forEach(p => {
      items.push({ label: p.title, detail: p.status + ' · ' + p.type, href: '/plans', icon: 'approval', color: 'text-secondary' });
    });
    items.push(
      { label: 'Reliability Forecast', detail: 'View projected degradation path', href: '/reliability', icon: 'monitoring', color: 'text-tertiary' },
      { label: 'Digital Twin', detail: 'Open 3D view of this asset', href: '/digital-twin?machine=' + encodeURIComponent(machine.name), icon: 'view_in_ar', color: 'text-primary' }
    );

    if (items.length === 0) { container.innerHTML = '<div class="text-center py-4 text-on-surface-variant">No related items.</div>'; return; }

    container.innerHTML = items.map(item =>
      '<a href="' + item.href + '" class="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container/50 transition-colors group">' +
      '<div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">' +
      '<span class="material-symbols-outlined text-sm ' + item.color + '">' + item.icon + '</span></div>' +
      '<div class="flex-1 min-w-0"><p class="text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">' + escapeHtml(item.label) + '</p>' +
      '<p class="text-xs text-on-surface-variant truncate">' + escapeHtml(item.detail) + '</p></div>' +
      '<span class="material-symbols-outlined text-sm text-on-surface-variant/40 group-hover:text-primary transition-colors">chevron_right</span></a>'
    ).join('');
  }

  function renderActions(machine, plant) {
    const container = document.getElementById('ym-top-actions');
    const actions = [
      { label: 'Open Digital Twin', icon: 'view_in_ar', href: '/digital-twin?machine=' + encodeURIComponent(machine.name) },
      { label: 'Open Asset Details', icon: 'precision_manufacturing', href: '/assets/' + machine.id },
      { label: 'Create Work Order', icon: 'build', href: '/work-orders' },
      { label: 'Schedule Maintenance', icon: 'calendar_month', href: '/maintenance' },
      { label: 'Export PDF', icon: 'picture_as_pdf', action: 'export-pdf' },
      { label: 'Export CSV', icon: 'table_chart', action: 'export-csv' }
    ];

    container.innerHTML = actions.map(a => {
      if (a.action === 'export-pdf') {
        return '<button class="ym-action-export flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container/50 transition-colors group w-full text-left" data-export="pdf">' +
          '<div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">' +
          '<span class="material-symbols-outlined text-sm text-error">' + a.icon + '</span></div>' +
          '<span class="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">' + a.label + '</span></button>';
      }
      if (a.action === 'export-csv') {
        return '<button class="ym-action-export flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container/50 transition-colors group w-full text-left" data-export="csv">' +
          '<div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">' +
          '<span class="material-symbols-outlined text-sm text-secondary">' + a.icon + '</span></div>' +
          '<span class="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">' + a.label + '</span></button>';
      }
      return '<a href="' + a.href + '" class="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container/50 transition-colors group">' +
        '<div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">' +
        '<span class="material-symbols-outlined text-sm text-primary">' + a.icon + '</span></div>' +
        '<span class="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">' + a.label + '</span></a>';
    }).join('');

    container.querySelectorAll('.ym-action-export').forEach(btn => {
      btn.addEventListener('click', function() {
        const type = this.dataset.export;
        const rows = [['asset', 'metric', 'value', 'unit', 'timestamp']];
        const machineName = document.getElementById('ym-asset-name')?.textContent || 'asset';
        const dataStr = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
        const blob = new Blob([dataStr], { type: type === 'pdf' ? 'application/pdf' : 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = machineName.replace(/\s+/g, '_') + '_diagnostics.' + type;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  async function loadData() {
    const assetId = getAssetId();
    if (!assetId) {
      hide(document.getElementById('ym-loading'));
      document.getElementById('ym-error-text').textContent = 'No asset specified';
      show(document.getElementById('ym-error'));
      return;
    }

    try {
      const data = await api('/api/diagnostics/' + encodeURIComponent(assetId));
      if (data && data.machine && data.machine.id) {
        renderPage(data);
      } else {
        hide(document.getElementById('ym-loading'));
        show(document.getElementById('ym-empty'));
      }
    } catch (e) {
      console.error('Diagnostics load error:', e);
      hide(document.getElementById('ym-loading'));
      document.getElementById('ym-error-text').textContent = e.message || 'Failed to load diagnostics';
      show(document.getElementById('ym-error'));
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;

    document.getElementById('ym-retry-btn')?.addEventListener('click', loadData);
    document.getElementById('ym-refresh-btn')?.addEventListener('click', loadData);
    document.getElementById('ym-generate-ai-btn')?.addEventListener('click', async () => {
      document.getElementById('ym-generate-ai-btn').textContent = 'Generating...';
      document.getElementById('ym-generate-ai-btn').disabled = true;
      await loadData();
    });

    loadData();
  });
})();
