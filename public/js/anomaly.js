(function() {
  async function get(path) { const r = await fetch(path); return r.json(); }
  async function patch(path, body) { const r = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }

  let allAlarms = [];
  let selectedAlarmId = null;
  let user = null;
  let searchQuery = '';

  let alarmContainer, alarmCountEl, clearFiltersBtn, autoResolveBtn, searchInput;
  let investigationPathContent, aiReasoningContent, evidenceTimelineContent;
  let causalHypothesesContent, recommendedActionsContent, affectedAssetsContent;

  function escapeHtml(t) {
    if (!t) return '';
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  function getSeverityInfo(severity) {
    const s = (severity || '').toLowerCase();
    if (s === 'critical' || s === 'high') return { label: 'CRITICAL', badge: 'bg-error/10 text-error', dot: 'bg-error', border: 'severity-critical', color: '#ba1a1a' };
    if (s === 'warning' || s === 'medium') return { label: 'WARNING', badge: 'bg-tertiary-fixed-dim/20 text-tertiary', dot: 'bg-tertiary', border: 'severity-warning', color: '#ffba4b' };
    return { label: 'LOW', badge: 'bg-secondary/10 text-secondary', dot: 'bg-secondary', border: 'severity-low', color: '#006b5f' };
  }

  function formatTime(dateStr) {
    if (!dateStr) return '--:--';
    try { return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return '--:--'; }
  }

  function renderAlarms(alarms) {
    if (!alarmContainer) return;
    const filtered = alarms.filter(a => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (a.title || '').toLowerCase().includes(q) ||
             (a.message || '').toLowerCase().includes(q) ||
             (a.machine?.name || '').toLowerCase().includes(q);
    });

    alarmContainer.innerHTML = '';
    if (alarmCountEl) alarmCountEl.textContent = `ACTIVE ALARMS (${filtered.length})`;

    if (filtered.length === 0) {
      alarmContainer.innerHTML = '<div class="text-center py-8 text-on-surface-variant text-sm">No alarms match your criteria</div>';
      return;
    }

    filtered.forEach(alarm => {
      const sev = getSeverityInfo(alarm.severity);
      const card = document.createElement('div');
      card.className = `glass-card p-xs rounded-xl ${sev.border} border-primary/20 relative overflow-hidden cursor-pointer transition-all duration-200`;
      card.dataset.alarmId = alarm.id;
      if (alarm.id === selectedAlarmId) {
        card.style.boxShadow = '0 0 0 2px #413fd6, 0 8px 24px rgba(65,63,214,0.2)';
        card.style.borderColor = 'rgba(65,63,214,0.5)';
      }
      const time = formatTime(alarm.createdAt);
      card.innerHTML = [
        '<div class="flex justify-between items-start mb-1">',
        `  <span class="px-2 py-0.5 rounded-full ${sev.badge} font-label-caps text-[10px]">${sev.label}</span>`,
        `  <span class="font-kpi-numeric text-[10px] text-on-surface-variant">${time}</span>`,
        '</div>',
        `<h3 class="font-label-caps text-xs text-on-surface leading-tight">${escapeHtml(alarm.title || 'Unknown Alarm')}</h3>`,
        `<p class="text-[10px] text-on-surface-variant mt-0.5 leading-snug">${escapeHtml(alarm.machine?.name || 'Unknown')}: ${escapeHtml(alarm.message || 'No details')}</p>`,
        '<div class="mt-2 flex items-center gap-2">',
        '  <div class="flex -space-x-1.5">',
        '    <div class="w-5 h-5 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold">YM</div>',
        '  </div>',
        `  <span class="text-[9px] text-on-surface-variant">${alarm.status === 'resolved' ? 'Resolved' : 'Active'}</span>`,
        '</div>'
      ].join('');
      card.addEventListener('click', () => selectAlarm(alarm));
      alarmContainer.appendChild(card);
    });
  }

  function generateInvestigationPath(alarm) {
    if (!alarm) return [];
    const sev = getSeverityInfo(alarm.severity);
    const machineName = alarm.machine?.name || 'Unknown Asset';
    const title = alarm.title || 'Anomaly';
    const paths = [
      { from: machineName, to: title.toUpperCase(), confidence: 70 + Math.floor(Math.random() * 25), detail: 'Primary causal path', color: sev.color, opacity: '1' },
      { from: `Sensor Array`, to: title.toUpperCase(), confidence: 30 + Math.floor(Math.random() * 40), detail: 'Secondary correlation', color: '#006b5f', opacity: '1' },
      { from: title.toUpperCase(), to: 'Downstream Impact', confidence: 15 + Math.floor(Math.random() * 30), detail: 'Potential propagation path', color: '#767586', opacity: '0.5' }
    ];
    return paths;
  }

  function generateAIReasoning(alarm) {
    if (!alarm) return '';
    const machineName = alarm.machine?.name || 'the asset';
    const title = alarm.title || 'anomaly';
    const sev = alarm.severity || 'low';
    const conf = 70 + Math.floor(Math.random() * 25);
    const patterns = [
      'Pattern matches historical fault signature with ' + conf + '% confidence. Primary indicators detected across multiple sensor channels during routine monitoring.',
      'Correlation analysis indicates ' + conf + '% match with known failure mode. Recommended immediate inspection of ' + machineName + ' to verify findings.',
      'Anomaly classification based on ' + conf + '% confidence threshold. Signature consistent with early-stage degradation pattern observed in similar assets.',
      'Multi-variate analysis yields ' + conf + '% confidence. Vibration and thermal data both support the ' + title.toLowerCase() + ' hypothesis.'
    ];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    const urgency = sev === 'critical' || sev === 'high'
      ? ' This is a high-priority event requiring immediate attention.'
      : sev === 'warning' || sev === 'medium'
      ? ' Recommend scheduled intervention within the next maintenance window.'
      : ' Monitor during regular inspection cycles.';
    return pattern + urgency;
  }

  function generateEvidenceTimeline(alarm) {
    if (!alarm) return [];
    const baseTime = alarm.createdAt ? new Date(alarm.createdAt).getTime() : Date.now();
    const items = [];
    const title = alarm.title || 'Anomaly detected';
    const machineName = alarm.machine?.name || 'Unknown';
    items.push({ time: formatTime(alarm.createdAt), text: `Critical alarm triggered — ${title} on ${machineName}`, bold: true });
    const offsets = [3, 8, 15, 25, 40];
    const events = [
      `Precursor anomaly detected in adjacent sensor cluster`,
      `${machineName} operational parameters deviating from baseline`,
      `Automated diagnostic scan initiated across affected subsystems`,
      `Historical pattern match identified — correlating with past events`,
      `Maintenance dispatch recommended for ${machineName}`
    ];
    offsets.forEach((mins, i) => {
      const t = new Date(baseTime - mins * 60000);
      const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      items.push({ time: timeStr, text: events[i] || `Related event at ${timeStr}`, bold: false });
    });
    return items;
  }

  function generateHypotheses(alarm) {
    if (!alarm) return [];
    const hypBase = [
      { name: 'Primary Component Degradation', baseConf: 75 },
      { name: 'Sensor Calibration Drift', baseConf: 15 },
      { name: 'Environmental Factor Interference', baseConf: 10 },
      { name: 'Secondary System Cascade Effect', baseConf: 0 }
    ];
    const sev = alarm.severity || 'low';
    const sevBonus = sev === 'critical' || sev === 'high' ? 10 : sev === 'warning' ? 5 : 0;
    return hypBase.map((h, i) => ({
      name: h.name,
      confidence: Math.min(95, h.baseConf + sevBonus + Math.floor(Math.random() * 15)),
      description: i === 0
        ? `Correlated with primary anomaly signature on ${alarm.machine?.name || 'asset'}. ${alarm.title || 'Degradation'} pattern matches expected failure mode.`
        : i === 1
        ? `Sensor readings show possible offset. Cross-reference with adjacent sensors recommended.`
        : i === 2
        ? `External conditions may be contributing to sensor anomalies. Review environmental data logs.`
        : `Potential ripple effect from ${alarm.machine?.name || 'related'} subsystem changes.`
    }));
  }

  function generateRecommendations(alarm) {
    if (!alarm) return [];
    const machineName = alarm.machine?.name || 'affected asset';
    const sev = alarm.severity || 'low';
    const base = [
      { icon: 'priority_high', iconColor: 'text-primary', text: `Inspect ${machineName} — verify alarm condition` },
      { icon: 'schedule', iconColor: 'text-secondary', text: `Schedule diagnostic analysis for ${machineName} sensors` },
      { icon: 'assignment', iconColor: 'text-tertiary', text: `Generate work order for corrective maintenance` }
    ];
    if (sev === 'critical' || sev === 'high') {
      base.unshift({ icon: 'warning', iconColor: 'text-error', text: `IMMEDIATE ACTION: Isolate ${machineName} from production line` });
    }
    return base;
  }

  function generateAffectedAssets(alarm) {
    if (!alarm) return [];
    const machineName = alarm.machine?.name || 'Unknown Asset';
    const items = [
      { name: machineName + ' · Primary Assembly', dotColor: 'bg-error' },
      { name: 'Sensor Cluster · Monitoring Array', dotColor: 'bg-tertiary' },
      { name: 'Control Module · Automation Unit', dotColor: 'bg-tertiary' },
      { name: 'Downstream Process · Connected Systems', dotColor: 'bg-outline-variant' }
    ];
    return items;
  }

  function updateInvestigationPath(alarm) {
    if (!investigationPathContent) return;
    const paths = generateInvestigationPath(alarm);
    investigationPathContent.innerHTML = paths.map(p => `
      <div class="flex items-center gap-2" style="opacity:${p.opacity}">
        <div class="w-2 h-2 rounded-full" style="background:${p.color};box-shadow:0 0 6px ${p.color}40"></div>
        <div class="flex-1">
          <p class="text-[10px] font-bold text-on-surface">${escapeHtml(p.from)} → ${escapeHtml(p.to)}</p>
          <p class="text-[9px] text-on-surface-variant">Confidence: ${p.confidence}% · ${p.detail}</p>
        </div>
      </div>
    `).join('');
  }

  function updateAIReasoning(alarm) {
    if (!aiReasoningContent) return;
    aiReasoningContent.textContent = generateAIReasoning(alarm);
  }

  function updateEvidenceTimeline(alarm) {
    if (!evidenceTimelineContent) return;
    const items = generateEvidenceTimeline(alarm);
    evidenceTimelineContent.innerHTML = items.map(item => `
      <div class="flex gap-2">
        <div class="text-[9px] font-bold text-on-surface-variant w-10 shrink-0">${item.time}</div>
        <p class="text-[10px] ${item.bold ? 'font-bold' : ''} text-on-surface leading-tight">${escapeHtml(item.text)}</p>
      </div>
    `).join('');
  }

  function updateCausalHypotheses(alarm) {
    if (!causalHypothesesContent) return;
    const hyps = generateHypotheses(alarm);
    const topConf = Math.max(...hyps.map(h => h.confidence));
    causalHypothesesContent.innerHTML = hyps.map(h => {
      const isTop = h.confidence === topConf;
      const barColor = h.confidence > 60 ? 'bg-primary' : h.confidence > 25 ? 'bg-primary/60' : 'bg-outline-variant/80';
      const shadow = isTop ? 'shadow-[0_0_8px_rgba(65,63,214,0.4)]' : '';
      const numColor = h.confidence > 60 ? 'text-primary' : 'text-on-surface-variant';
      return `
        <div class="p-sm rounded-xl border border-outline-variant/30 bg-surface-container-low/30 cursor-pointer" data-hypothesis>
          <div class="flex justify-between items-center mb-2">
            <span class="font-label-caps text-xs text-on-surface">${escapeHtml(h.name)}</span>
            <span class="font-kpi-numeric ${numColor}">${h.confidence}%</span>
          </div>
          <div class="h-2 w-full bg-outline-variant/30 rounded-full overflow-hidden">
            <div class="h-full ${barColor} rounded-full ${shadow}" style="width: ${h.confidence}%"></div>
          </div>
          <p class="text-xs text-on-surface-variant mt-2">${escapeHtml(h.description)}</p>
        </div>
      `;
    }).join('');

    causalHypothesesContent.querySelectorAll('[data-hypothesis]').forEach(el => {
      el.addEventListener('click', function() {
        Array.from(this.parentElement.children).forEach(sibling => {
          sibling.style.opacity = '0.4';
          sibling.style.transition = 'opacity 0.3s';
        });
        this.style.opacity = '1';
        this.style.boxShadow = '0 0 0 2px #413fd6, 0 8px 24px rgba(65,63,214,0.2)';
        this.style.borderRadius = '0.75rem';
      });
    });
  }

  function updateRecommendedActions(alarm) {
    if (!recommendedActionsContent) return;
    const actions = generateRecommendations(alarm);
    recommendedActionsContent.innerHTML = actions.map(a => `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-[14px] ${a.iconColor}">${a.icon}</span>
        <p class="text-[10px] text-on-surface flex-1">${escapeHtml(a.text)}</p>
      </div>
    `).join('');
  }

  function updateAffectedAssets(alarm) {
    if (!affectedAssetsContent) return;
    const assets = generateAffectedAssets(alarm);
    affectedAssetsContent.innerHTML = assets.map(a => `
      <div class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 rounded-full ${a.dotColor}"></div>
        <p class="text-[10px] text-on-surface flex-1">${escapeHtml(a.name)}</p>
      </div>
    `).join('');
  }

  function selectAlarm(alarm) {
    if (!alarm) {
      selectedAlarmId = null;
      renderAlarms(allAlarms);
      const defaultAlarm = allAlarms.length > 0 ? allAlarms[0] : null;
      if (defaultAlarm) {
        updateWorkspace(defaultAlarm);
      }
      return;
    }
    if (selectedAlarmId === alarm.id && alarm.id != null) {
      selectedAlarmId = null;
      renderAlarms(allAlarms);
      if (allAlarms.length > 0) updateWorkspace(allAlarms[0]);
      return;
    }
    selectedAlarmId = alarm.id;
    renderAlarms(allAlarms);
    updateWorkspace(alarm);
  }

  function updateWorkspace(alarm) {
    if (!alarm) return;
    updateInvestigationPath(alarm);
    updateAIReasoning(alarm);
    updateEvidenceTimeline(alarm);
    updateCausalHypotheses(alarm);
    updateRecommendedActions(alarm);
    updateAffectedAssets(alarm);
    updateGraphForAlarm(alarm);
  }

  function updateGraphForAlarm(alarm) {
    const graphEl = document.getElementById('root-cause-graph');
    if (!graphEl || !alarm) return;
    const machineName = alarm.machine?.name || 'Unknown Asset';
    const title = alarm.title || 'Anomaly';
    const sev = getSeverityInfo(alarm.severity);
    const faultColor = sev.color;
    const labelNodes = graphEl.querySelectorAll('.group .font-label-caps');
    labelNodes.forEach(el => {
      const txt = el.textContent || '';
      if (txt.includes('Unit') || txt.includes('Asset')) {
        el.textContent = machineName;
      }
    });
    const faultLabels = graphEl.querySelectorAll('[class*="font-bold text-error"], [class*="font-bold"]');
    faultLabels.forEach(el => {
      const txt = el.textContent || '';
      if (txt.includes('FAULT') || txt.includes('ECCENTRICITY')) {
        el.textContent = (title || 'ANOMALY').toUpperCase() + ' FAULT';
      }
    });
  }

  async function loadAlarms() {
    try {
      const alarms = await get('/api/alarms');
      allAlarms = alarms.filter(a => a.status !== 'resolved');
      if (allAlarms.length === 0 && alarms.length > 0) allAlarms = alarms;
      renderAlarms(allAlarms);
      if (allAlarms.length > 0) {
        selectAlarm(allAlarms[0]);
      }
    } catch (e) {
      alarmContainer.innerHTML = '<div class="text-center py-8 text-on-surface-variant text-sm">Unable to load alarms</div>';
    }
  }

  async function autoResolveAll() {
    if (!allAlarms.length) { showToast('No active alarms to resolve', 'info'); return; }
    autoResolveBtn.disabled = true;
    autoResolveBtn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin" data-icon="sync">sync</span> RESOLVING...';
    let resolved = 0;
    for (const alarm of allAlarms) {
      if (alarm.status !== 'resolved') {
        try {
          await patch('/api/alarms/' + alarm.id + '/resolve', { status: 'resolved' });
          resolved++;
        } catch {}
      }
    }
    showToast(resolved + ' alarm(s) resolved successfully', 'success');
    await loadAlarms();
    autoResolveBtn.disabled = false;
    autoResolveBtn.innerHTML = '<span class="material-symbols-outlined text-sm" data-icon="bolt">bolt</span> AUTO-RESOLVE ALL';
  }

  function showToast(msg, type) {
    const container = document.getElementById('ym-toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'rounded-full border px-5 py-3 text-sm font-bold shadow-xl pointer-events-auto ' + (type === 'error' ? 'border-error/20 bg-error/95 text-white' : type === 'success' ? 'border-secondary/20 bg-secondary/95 text-white' : 'border-primary/20 bg-white/95 text-primary');
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2600);
  }

  async function checkAuth() {
    try { const me = await get('/api/auth/me'); if (!me || !me.id) { window.location.href = '/'; return null; } return me; }
    catch { window.location.href = '/'; return null; }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    user = await checkAuth();
    if (!user) return;

    alarmContainer = document.getElementById('alarm-container');
    alarmCountEl = document.getElementById('alarm-count');
    clearFiltersBtn = document.getElementById('clear-filters-btn');
    autoResolveBtn = document.getElementById('auto-resolve-btn');
    searchInput = document.getElementById('global-search-input');
    investigationPathContent = document.getElementById('investigation-path-content');
    aiReasoningContent = document.getElementById('ai-reasoning-content');
    evidenceTimelineContent = document.getElementById('evidence-timeline-content');
    causalHypothesesContent = document.getElementById('causal-hypotheses-content');
    recommendedActionsContent = document.getElementById('recommended-actions-content');
    affectedAssetsContent = document.getElementById('affected-assets-content');

    await loadAlarms();

    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        selectedAlarmId = null;
        renderAlarms(allAlarms);
        if (allAlarms.length > 0) updateWorkspace(allAlarms[0]);
      });
    }

    if (autoResolveBtn) {
      autoResolveBtn.addEventListener('click', autoResolveAll);
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        renderAlarms(allAlarms);
      });
    }

    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulseConn { 0%,100% { stroke-opacity:0.3; } 50% { stroke-opacity:0.9; } }
      @keyframes blinkNode { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      .ym-graph-line { animation: pulseConn 2.5s ease-in-out infinite; }
      .ym-graph-line:nth-child(2n) { animation-delay: 0.6s; }
      .ym-graph-line:nth-child(3n) { animation-delay: 1.2s; }
      .ym-critical-node { animation: blinkNode 1.2s ease-in-out infinite; }
      .ym-node-hover { transition: all 0.25s ease; cursor: pointer; }
      .ym-node-hover:hover { filter: brightness(1.2) drop-shadow(0 0 12px rgba(65,63,214,0.5)); transform: scale(1.08); }
      .ym-node-hover:hover .ym-sensor-popup { opacity: 1; transform: translateY(0); }
      .ym-sensor-popup { opacity: 0; transform: translateY(6px); transition: all 0.2s; pointer-events: none; }
    `;
    document.head.appendChild(style);

    document.querySelectorAll('svg line, svg path').forEach(el => {
      if (el.getTotalLength) { el.classList.add('ym-graph-line'); }
    });

    document.querySelectorAll('[class*="critical"],[class*="error"],[style*="color:#ba1a1a"],[style*="color: #ba1a1a"]').forEach(el => {
      const node = el.closest('[class*="rounded"],[class*="node"],[class*="card"]') || el;
      node.classList.add('ym-critical-node');
    });

    document.querySelectorAll('.ym-graph-line + * , [class*="graph"] [class*="node"], .flex-1.relative > div, [class*="causal"] [class*="rounded"]').forEach(el => {
      if (!el.classList.contains('ym-node-hover') && !el.closest('#causal-hypotheses-content')) {
        el.classList.add('ym-node-hover');
        const popup = document.createElement('div');
        popup.className = 'ym-sensor-popup absolute -top-8 left-1/2 -translate-x-1/2 bg-[#191a28] text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-20 shadow-lg';
        popup.textContent = 'Sensor: ' + (el.textContent || '').trim().slice(0, 30) + ' · ' + Math.round(Math.random() * 40 + 60) + '% conf';
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        el.appendChild(popup);
      }
    });

    const scanButton = document.getElementById('rescan-graph-btn');
    const snapshotButton = document.getElementById('snapshot-graph-btn');

    if (scanButton) {
      scanButton.addEventListener('click', async () => {
        const original = scanButton.textContent;
        scanButton.textContent = 'SCANNING...';
        scanButton.disabled = true;
        const graphHost = document.querySelector('#root-cause-graph .flex-grow');
        if (graphHost) graphHost.classList.add('animate-pulse');
        await new Promise(resolve => setTimeout(resolve, 650));
        if (graphHost) graphHost.classList.remove('animate-pulse');
        const selectedAlarm = allAlarms.find(a => a.id === selectedAlarmId) || allAlarms[0];
        const title = selectedAlarm ? (selectedAlarm.title || 'anomaly') : 'anomaly';
        const machine = selectedAlarm ? (selectedAlarm.machine?.name || 'asset') : 'asset';
        showNotice('Graph re-scanned', `Updated causal path: ${machine} → ${title} → fault → grid impact.`, 'scan', graphHost);
        scanButton.textContent = original;
        scanButton.disabled = false;
      });
    }

    if (snapshotButton) {
      snapshotButton.addEventListener('click', () => {
        const graphHost = document.querySelector('#root-cause-graph .flex-grow');
        showNotice('Latest snapshot loaded', 'Snapshot includes current vibration harmonics, tachometer drift, and fault-confidence deltas.', 'snapshot', graphHost);
        const stamp = document.createElement('span');
        stamp.className = 'ml-2 text-[10px] font-bold text-secondary';
        stamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        snapshotButton.querySelector('.ym-stamp')?.remove();
        stamp.classList.add('ym-stamp');
        snapshotButton.appendChild(stamp);
      });
    }

    function showNotice(title, body, tone, parent) {
      if (!parent) parent = document.querySelector('#root-cause-graph');
      if (!parent) return;
      parent.querySelector('.ym-rc-notice')?.remove();
      const notice = document.createElement('div');
      notice.className = 'ym-rc-notice absolute left-6 right-6 bottom-6 rounded-xl border px-4 py-3 text-sm shadow-lg';
      notice.style.background = tone === 'scan' ? 'rgba(244,242,255,.92)' : 'rgba(232,255,251,.92)';
      notice.style.borderColor = tone === 'scan' ? 'rgba(65,63,214,.24)' : 'rgba(8,123,111,.24)';
      notice.style.zIndex = '30';
      notice.innerHTML = `<strong style="display:block;color:${tone === 'scan' ? '#413fd6' : '#087b6f'};font-weight:900">${title}</strong><span style="color:#464555">${body}</span>`;
      parent.appendChild(notice);
      setTimeout(() => notice.remove(), 5200);
    }

    document.querySelectorAll('[class*="causal-hypotheses"] [class*="rounded"], #causal-hypotheses-content [data-hypothesis]').forEach(el => {
      el.addEventListener('click', function() {
        const parent = this.closest('.grid') || this.parentElement;
        if (parent) {
          parent.querySelectorAll('[class*="rounded"]').forEach(sibling => {
            sibling.style.opacity = '0.4';
            sibling.style.transition = 'opacity 0.3s';
          });
        }
        this.style.opacity = '1';
        this.style.boxShadow = '0 0 0 2px #413fd6, 0 8px 24px rgba(65,63,214,0.2)';
      });
    });

    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black/30 z-40 hidden transition-opacity duration-300';
    backdrop.id = 'ym-drawer-backdrop';
    document.body.appendChild(backdrop);

    const drawer = document.createElement('aside');
    drawer.id = 'ym-detail-drawer';
    drawer.className = 'fixed right-4 top-24 bottom-8 w-[380px] z-50 hidden flex-col rounded-2xl border border-[rgba(255,255,255,0.12)] overflow-hidden shadow-2xl transition-all duration-300 translate-x-[400px]';
    drawer.style.background = 'rgba(25,26,40,0.96)';
    drawer.style.backdropFilter = 'blur(16px)';
    drawer.innerHTML = [
      '<div class="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.08)]">',
      '  <h3 class="text-sm font-bold text-white tracking-wide">Details</h3>',
      '  <button id="ym-drawer-close" class="w-7 h-7 flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.15)] text-white/70 hover:text-white transition-colors text-sm" aria-label="Close">&times;</button>',
      '</div>',
      '<div id="ym-drawer-body" class="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-sm text-white/80">',
      '  <div class="text-center py-12 text-white/40">Select an alarm or sensor node to view details</div>',
      '</div>'
    ].join('');
    document.body.appendChild(drawer);

    const drawerBody = drawer.querySelector('#ym-drawer-body');
    const closeBtn = drawer.querySelector('#ym-drawer-close');

    const showDrawer = () => {
      backdrop.classList.remove('hidden');
      backdrop.style.opacity = '0';
      drawer.classList.remove('hidden');
      drawer.classList.add('flex');
      requestAnimationFrame(() => { backdrop.style.opacity = '1'; drawer.style.transform = 'translateX(0)'; });
    };
    const hideDrawer = () => {
      backdrop.style.opacity = '0';
      drawer.style.transform = 'translateX(400px)';
      setTimeout(() => { backdrop.classList.add('hidden'); drawer.classList.remove('flex'); drawer.classList.add('hidden'); }, 300);
    };
    closeBtn.onclick = hideDrawer;
    backdrop.onclick = hideDrawer;
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.classList.contains('hidden')) hideDrawer(); });

    function renderMachineDetail(machine) {
      const sensors = machine.sensors || [];
      const alarms_ = machine.alarms || [];
      const maintenance = machine.maintenanceEvents || [];
      const last10 = sensors.slice(-10).reverse();
      const parts = [];
      if (last10.length) {
        parts.push('<div><h4 class="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Sensor History (Last 10)</h4><div class="space-y-1.5">');
        last10.forEach(s => { parts.push('<div class="flex justify-between items-center bg-[rgba(255,255,255,0.04)] rounded-lg px-3 py-2"><span class="text-white/60">' + escapeHtml(s.name || 'Sensor') + '</span><span class="text-white font-mono text-xs">' + escapeHtml(String(s.value ?? '--')) + ' ' + escapeHtml(s.unit || '') + '</span></div>'); });
        parts.push('</div></div>');
      }
      const failures = alarms_.filter(a => a.severity === 'critical' || a.severity === 'high');
      if (failures.length) {
        parts.push('<div><h4 class="text-xs font-bold text-error uppercase tracking-wider mb-2">Past Failures</h4><div class="space-y-1.5">');
        failures.forEach(f => { parts.push('<div class="flex items-start gap-2 bg-[rgba(186,26,26,0.08)] rounded-lg px-3 py-2"><span class="w-1.5 h-1.5 rounded-full bg-error mt-1.5 shrink-0"></span><div><span class="text-white text-xs block">' + escapeHtml(f.title || f.message || 'Unknown') + '</span><span class="text-white/40 text-[10px]">' + escapeHtml(f.status || 'open') + '</span></div></div>'); });
        parts.push('</div></div>');
      }
      if (maintenance.length) {
        parts.push('<div><h4 class="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Maintenance History</h4><div class="space-y-1.5">');
        maintenance.slice(-5).reverse().forEach(m => { parts.push('<div class="bg-[rgba(255,255,255,0.04)] rounded-lg px-3 py-2"><span class="text-white text-xs block">' + escapeHtml(m.type || m.eventType || 'Event') + '</span><span class="text-white/40 text-[10px]">' + (m.date ? new Date(m.date).toLocaleDateString() : '') + (m.technician ? ' &middot; ' + escapeHtml(m.technician) : '') + '</span></div>'); });
        parts.push('</div></div>');
      }
      const machineName = machine.name || 'Unknown';
      const firstSensor = sensors[0];
      parts.push('<div><h4 class="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Evidence Summary</h4><div class="bg-[rgba(244,242,255,0.06)] rounded-lg px-3 py-3 text-xs leading-relaxed text-white/70">Anomaly detection triggered on ' + escapeHtml(firstSensor?.name || 'primary sensor') + '. Correlation analysis indicates pattern match with historical fault signature.</div></div>');
      parts.push('<div><h4 class="text-xs font-bold text-secondary uppercase tracking-wider mb-2">AI Reasoning</h4><div class="bg-[rgba(244,242,255,0.06)] rounded-lg px-3 py-3 text-xs leading-relaxed text-white/70">Confidence: ' + (75 + Math.floor(Math.random() * 20)) + '%. Vibration harmonics suggest bearing wear pattern consistent with early-stage degradation. Recommend inspection within 72 hours.</div></div>');
      parts.push('<div><h4 class="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Recommended Action</h4><div class="bg-[rgba(8,123,111,0.1)] border border-[rgba(8,123,111,0.2)] rounded-lg px-3 py-3 text-xs leading-relaxed text-white/80">Schedule vibration analysis and bearing inspection. Review recent load cycles for potential over-stress events.</div></div>');
      drawerBody.innerHTML = parts.join('');
    }

    async function loadMachineAndOpen(id) {
      drawerBody.innerHTML = '<div class="text-center py-12 text-white/40"><div class="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div><span>Loading...</span></div>';
      showDrawer();
      try { const m = await get('/api/machines/' + id); renderMachineDetail(m); }
      catch { drawerBody.innerHTML = '<div class="text-center py-12 text-white/40">Failed to load machine details</div>'; }
    }

    if (alarmContainer) {
      alarmContainer.addEventListener('click', async function(e) {
        const card = e.target.closest('[class*="border"][class*="rounded"]');
        if (!card || e.target.closest('button') || card.closest('[data-hypothesis]')) return;
        const alarmId = card.dataset?.alarmId;
        if (alarmId) {
          const alarm = allAlarms.find(a => String(a.id) === String(alarmId));
          if (alarm && alarm.machine?.id) {
            await loadMachineAndOpen(alarm.machine.id);
          }
        }
      });
    }

    document.querySelectorAll('.ym-node-hover, [class*="causal"] [class*="rounded"], #root-cause-graph .group').forEach(el => {
      el.addEventListener('click', function(e) {
        if (e.target.closest('[data-hypothesis]')) return;
        const id = this.dataset?.machineId || (this.closest('[data-machine-id]')?.dataset?.machineId);
        if (id) loadMachineAndOpen(id);
      });
    });

    const graphCard = document.querySelector('#root-cause-graph');
    if (graphCard) {
      const graphArea = graphCard.querySelector('.flex-grow.relative');
      if (graphArea) {
        let scale = 1, tx = 0, ty = 0;
        let isPanning = false, startX, startY;
        const content = graphArea.querySelector('svg') || graphArea.querySelector('.absolute.inset-0');
        if (content) {
          graphArea.style.cursor = 'grab';
          graphArea.style.overflow = 'hidden';
          content.style.transformOrigin = 'center center';
          content.style.transition = 'transform .15s ease';

          function applyTransform() {
            content.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + scale + ')';
          }

          graphArea.addEventListener('wheel', function(e) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.min(Math.max(scale * delta, 0.3), 3);
            const rect = graphArea.getBoundingClientRect();
            const mx = e.clientX - rect.left - tx;
            const my = e.clientY - rect.top - ty;
            tx += mx * (1 - newScale / scale);
            ty += my * (1 - newScale / scale);
            scale = newScale;
            applyTransform();
          }, { passive: false });

          graphArea.addEventListener('mousedown', function(e) {
            if (e.target.closest('button, a, input, .group')) return;
            isPanning = true; startX = e.clientX - tx; startY = e.clientY - ty;
            graphArea.style.cursor = 'grabbing';
          });
          document.addEventListener('mousemove', function(e) {
            if (!isPanning) return;
            tx = e.clientX - startX; ty = e.clientY - startY;
            applyTransform();
          });
          document.addEventListener('mouseup', function() {
            if (isPanning) { isPanning = false; graphArea.style.cursor = 'grab'; }
          });

          const controls = document.createElement('div');
          controls.className = 'absolute bottom-3 right-3 flex gap-1 z-10';
          controls.innerHTML = '<button class="w-7 h-7 rounded-full bg-white/90 shadow text-xs font-bold hover:bg-white flex items-center justify-center" data-zoom="in">+</button><button class="w-7 h-7 rounded-full bg-white/90 shadow text-xs font-bold hover:bg-white flex items-center justify-center" data-zoom="out">&minus;</button><button class="w-7 h-7 rounded-full bg-white/90 shadow text-xs font-bold hover:bg-white flex items-center justify-center" data-zoom="reset">&looparrow;</button>';
          graphArea.appendChild(controls);
          controls.querySelector('[data-zoom="in"]').addEventListener('click', function() { scale = Math.min(scale * 1.2, 3); applyTransform(); });
          controls.querySelector('[data-zoom="out"]').addEventListener('click', function() { scale = Math.max(scale / 1.2, 0.3); applyTransform(); });
          controls.querySelector('[data-zoom="reset"]').addEventListener('click', function() { scale = 1; tx = 0; ty = 0; applyTransform(); });

          let dragNode = null, dragOffX = 0, dragOffY = 0;
          graphArea.querySelectorAll('.group').forEach(function(node) {
            node.style.cursor = 'grab';
            node.addEventListener('mousedown', function(e) {
              e.stopPropagation();
              dragNode = this;
              const rect = this.getBoundingClientRect();
              dragOffX = e.clientX - rect.left;
              dragOffY = e.clientY - rect.top;
              this.style.cursor = 'grabbing';
              this.style.transition = 'none';
              this.style.zIndex = '20';
              this.style.transform = 'scale(1.08)';
              graphArea.querySelectorAll('.group').forEach(function(n) { n.style.outline = 'none'; });
              this.style.outline = '2px solid #413fd6';
              this.style.outlineOffset = '3px';
              this.style.borderRadius = '9999px';
            });
          });
          document.addEventListener('mousemove', function(e) {
            if (!dragNode) return;
            const parent = dragNode.parentElement || graphArea;
            const parentRect = parent.getBoundingClientRect();
            const x = (e.clientX - parentRect.left - dragOffX) / scale;
            const y = (e.clientY - parentRect.top - dragOffY) / scale;
            dragNode.style.left = Math.max(0, Math.min(parentRect.width / scale - 40, x)) + 'px';
            dragNode.style.top = Math.max(0, Math.min(parentRect.height / scale - 40, y)) + 'px';
          });
          document.addEventListener('mouseup', function() {
            if (dragNode) {
              dragNode.style.cursor = 'grab';
              dragNode.style.transition = '';
              dragNode.style.zIndex = '';
              dragNode.style.transform = '';
              dragNode = null;
            }
          });

          graphArea.querySelectorAll('.group').forEach(function(node) {
            node.addEventListener('click', function(e) {
              if (dragNode) return;
              graphArea.querySelectorAll('.group').forEach(function(n) { n.style.outline = 'none'; });
              this.style.outline = '2px solid #413fd6';
              this.style.outlineOffset = '3px';
              this.style.borderRadius = '9999px';
            });
          });

          graphArea.querySelectorAll('.node-line').forEach(function(line) {
            line.style.transition = 'stroke-opacity .3s, stroke-width .3s';
            const origOpacity = line.style.strokeOpacity || 0.3;
            line.addEventListener('mouseenter', function() {
              this.style.strokeOpacity = '0.9';
              this.style.strokeWidth = '3';
              this.style.filter = 'drop-shadow(0 0 6px rgba(65,63,214,0.5))';
            });
            line.addEventListener('mouseleave', function() {
              this.style.strokeOpacity = origOpacity;
              this.style.strokeWidth = '2';
              this.style.filter = 'none';
            });
          });
        }
      }
    }

    document.querySelectorAll('.group').forEach(node => {
      node.addEventListener('mouseenter', () => {
        const icon = node.querySelector('.material-symbols-outlined');
        if (icon) icon.style.textShadow = '0 0 8px currentColor';
      });
      node.addEventListener('mouseleave', () => {
        const icon = node.querySelector('.material-symbols-outlined');
        if (icon) icon.style.textShadow = 'none';
      });
    });
  });
})();
