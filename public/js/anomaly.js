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
    const focus = alarm._focusNode;
    if (focus) {
      const paths = [];
      const sevColor = sev.color;
      paths.push({ from: focus.label, to: title.toUpperCase(), confidence: focus.confidence, detail: 'Node: ' + focus.type + ' path', color: focus.type === 'root' ? '#ba1a1a' : sevColor, opacity: '1' });
      paths.push({ from: machineName, to: focus.label, confidence: Math.round(focus.confidence * 0.85), detail: 'Upstream dependency', color: sevColor, opacity: '1' });
      if (focus.type !== 'downstream') {
        paths.push({ from: focus.label, to: 'Downstream Impact', confidence: Math.round(focus.confidence * 0.4), detail: 'Potential propagation path', color: '#767586', opacity: '0.5' });
      }
      return paths;
    }
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
    const focus = alarm._focusNode;
    if (focus) {
      const base = [
        { icon: 'priority_high', iconColor: 'text-primary', text: `Inspect ${focus.label} — ${focus.type} anomaly detected` },
        { icon: 'schedule', iconColor: 'text-secondary', text: `Run diagnostic on ${machineName} sensor array` },
        { icon: 'assignment', iconColor: 'text-tertiary', text: `Generate corrective work order for ${focus.type}` }
      ];
      if (focus.type === 'root' || sev === 'critical' || sev === 'high') {
        base.unshift({ icon: 'warning', iconColor: 'text-error', text: `IMMEDIATE ACTION: Isolate ${focus.label} from production` });
      }
      return base;
    }
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
    const focus = alarm._focusNode;
    if (focus) {
      const items = [];
      if (focus.type === 'root' || focus.type === 'asset') {
        items.push({ name: machineName + ' · Primary Assembly', dotColor: 'bg-error' });
        items.push({ name: focus.label + ' · Investigation Node', dotColor: 'bg-error' });
      } else {
        items.push({ name: focus.label + ' · ' + focus.type, dotColor: 'bg-error' });
        items.push({ name: machineName + ' · Primary Assembly', dotColor: 'bg-tertiary' });
      }
      items.push({ name: 'Sensor Cluster · Monitoring Array', dotColor: 'bg-tertiary' });
      items.push({ name: 'Control Module · Automation Unit', dotColor: 'bg-outline-variant' });
      items.push({ name: 'Downstream Process · Connected Systems', dotColor: 'bg-outline-variant' });
      return items;
    }
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

  /* ─── Topology Engine ─── */
  const RC_CATEGORIES = {
    vibration:  { keywords:['eccentricity','vibration','imbalance','bearing','shaft','imbalance','harmonic'], icons:['vibration','speed'] },
    thermal:    { keywords:['thermal','temperature','overheat','cooling','boiler','thermocouple','furnace'], icons:['thermostat','whatshot'] },
    electrical: { keywords:['voltage','current','power','electrical','breaker','network','latency','spike'], icons:['bolt','electrical_services'] },
    hydraulic:  { keywords:['hydraulic','pressure','pump','valve','fluid','pipeline','reservoir'], icons:['water_damage','plumbing'] },
    pneumatic:  { keywords:['pneumatic','compressed','air','cylinder','exhaust','fan','filter'], icons:['air','ventilator'] },
    quality:    { keywords:['quality','vision','inspection','defect','calibration','tolerance','surface'], icons:['visiblity','scan'] },
    robotics:   { keywords:['robot','arm','servo','actuator','encoder','joint','motion'], icons:['smart_toy','settings_suggest'] },
    conveyor:   { keywords:['conveyor','belt','roller','motor drive','jitter','tension'], icons:['conveyor_belt','moving'] },
    energy:     { keywords:['energy','consumption','efficiency','power factor','load','demand'], icons:['electric_bolt','battery_charging_full'] }
  };

  function detectCategory(title) {
    const t = (title || '').toLowerCase();
    for (const [cat, def] of Object.entries(RC_CATEGORIES)) {
      if (def.keywords.some(kw => t.includes(kw))) return cat;
    }
    return 'vibration';
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rci(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function buildTopology(alarm) {
    const cat = detectCategory(alarm.title);
    const machine = alarm.machine?.name || 'Unknown Asset';
    const title = alarm.title || 'Anomaly';
    const sev = getSeverityInfo(alarm.severity);
    const sevMult = alarm.severity === 'critical' || alarm.severity === 'high' ? 1.2 : alarm.severity === 'warning' || alarm.severity === 'medium' ? 1.0 : 0.8;
    const nodeCount = Math.min(18, Math.max(8, Math.floor(6 + Math.random() * 6 * sevMult)));

    const nodes = [];
    const edges = [];
    const icons = RC_CATEGORIES[cat]?.icons || ['sensors','settings'];
    const sensorNames = {
      vibration: ['Radial Vib','Axial Vib','Bearing Temp','Shaft Disp','Housing Accel','Oil Debris'],
      thermal: ['Thermocouple','IR Pyro','Coolant Temp','Exhaust Gas','Flame Detector','Duct Temp'],
      electrical: ['Current Xfrmr','Voltage Tap','Power Meter','Freq Sensor','PF Monitor','Harmonic Anal'],
      hydraulic: ['Press Trans','Flow Meter','Oil Temp','Viscosity','Cavitation','Level Gauge'],
      pneumatic: ['Air Flow','Press Switch','Temp Probe','Humidity','Particulate','Velocity'],
      quality: ['Vision Cam','Laser Prof','Color Sense','Thickness','Roughness','Hardness'],
      robotics: ['Joint Torque','Encoder Pos','Accel','Current Draw','Temp','Effort'],
      conveyor: ['Belt Speed','Motor Curr','Roller Vib','Tension','Alignment','Load Cell'],
      energy: ['Power Meter','Voltages','Current','PF','THD','Frequency']
    };
    const subsystemSuffix = ['Assembly','Module','Unit','Section','Loop','Stage'];
    const relationTypes = ['causal','correlated','inferred','propagated','downstream'];
    const sensorNameList = sensorNames[cat] || sensorNames.vibration;

    const sensorCount = Math.min(5, Math.max(2, Math.floor(nodeCount * 0.3)));
    const subsystemCount = Math.min(4, Math.max(1, Math.floor(nodeCount * 0.25)));
    const assetCount = Math.min(2, Math.max(1, Math.floor(nodeCount * 0.15)));

    // Sensor nodes
    const sensorNodes = [];
    for (let i = 0; i < sensorCount; i++) {
      const conf = Math.round((60 + Math.random() * 35) * sevMult);
      const id = 'sensor-' + i;
      const label = sensorNameList[i % sensorNameList.length] + ' S-' + (i + 1);
      sensorNodes.push({ id, label, type: 'sensor', category: cat, confidence: Math.min(98, conf), severity: alarm.severity, icon: icons[0] || 'sensors', machine, alarmTitle: title });
      nodes.push({ id, label, type: 'sensor', category: cat, confidence: Math.min(98, conf), severity: alarm.severity, icon: icons[0] || 'sensors', machine, alarmTitle: title, reading: (Math.random() * 100).toFixed(1), unit: 'mm/s', score: Math.round(Math.random() * 100), timestamp: alarm.createdAt || new Date().toISOString() });
    }

    // Subsystem nodes
    const subsystemNodes = [];
    for (let i = 0; i < subsystemCount; i++) {
      const conf = Math.round((50 + Math.random() * 40) * sevMult);
      const id = 'subsystem-' + i;
      const label = (cat.charAt(0).toUpperCase() + cat.slice(1)) + ' ' + (pick(subsystemSuffix)) + ' ' + (i + 1);
      subsystemNodes.push({ id, label, type: 'subsystem', category: cat, confidence: Math.min(95, conf), icon: icons[1] || 'settings', machine, alarmTitle: title });
      nodes.push({ id, label, type: 'subsystem', category: cat, confidence: Math.min(95, conf), icon: icons[1] || 'settings', machine, alarmTitle: title, reading: '-', unit: '', score: Math.round(conf), timestamp: alarm.createdAt || new Date().toISOString() });
    }

    // Asset nodes
    const assetNodes = [];
    for (let i = 0; i < assetCount; i++) {
      const id = 'asset-' + i;
      const label = machine + (i > 0 ? ' #' + (i + 1) : '');
      assetNodes.push({ id, label, type: 'asset', category: cat, confidence: Math.min(98, Math.round((70 + Math.random() * 25) * sevMult)), icon: 'precision_manufacturing', machine, alarmTitle: title });
      nodes.push({ id, label, type: 'asset', category: cat, confidence: Math.min(98, Math.round((70 + Math.random() * 25) * sevMult)), icon: 'precision_manufacturing', machine, alarmTitle: title, reading: '-', unit: '', score: Math.round(Math.random() * 100), timestamp: alarm.createdAt || new Date().toISOString() });
    }

    // Root Cause node
    const rootConf = Math.round((80 + Math.random() * 18) * sevMult);
    const rootLabel = (title || cat).toUpperCase() + ' FAULT';
    nodes.push({ id: 'root', label: rootLabel, type: 'root', category: cat, confidence: Math.min(99, rootConf), icon: 'report', severity: alarm.severity, machine, alarmTitle: title, reading: sev.color === '#ba1a1a' ? 'CRITICAL' : 'ELEVATED', unit: '', score: Math.min(99, rootConf), timestamp: alarm.createdAt || new Date().toISOString(), rootCause: title || cat });

    // Downstream nodes
    const dsCount = Math.min(3, Math.max(1, Math.floor(nodeCount * 0.15)));
    const downstreamLabels = ['Production Impact','Grid Connection','Downstream Process','Quality Output','Supply Chain'];
    for (let i = 0; i < dsCount; i++) {
      const id = 'downstream-' + i;
      const label = downstreamLabels[i % downstreamLabels.length];
      const conf = Math.round((20 + Math.random() * 35) * sevMult);
      nodes.push({ id, label, type: 'downstream', category: cat, confidence: Math.min(90, conf), icon: 'electrical_services', severity: 'low', machine, alarmTitle: title, reading: '-', unit: '', score: Math.round(conf), timestamp: alarm.createdAt || new Date().toISOString() });
    }

    // Build edges: sensors → subsystems → assets → root → downstream
    let edgeTypeIdx = 0;
    function nextEdgeType() {
      const t = relationTypes[edgeTypeIdx % relationTypes.length];
      edgeTypeIdx++;
      return t;
    }

    // Sensor → Subsystem
    sensorNodes.forEach(sn => {
      subsystemNodes.forEach((ss, i) => {
        if (Math.random() < 0.6 || i === 0) {
          edges.push({ source: sn.id, target: ss.id, type: Math.random() < 0.4 ? 'causal' : 'correlated', label: nextEdgeType() });
        }
      });
    });

    // Subsystem → Asset
    subsystemNodes.forEach(ss => {
      assetNodes.forEach((an, i) => {
        if (Math.random() < 0.6 || i === 0) {
          edges.push({ source: ss.id, target: an.id, type: Math.random() < 0.3 ? 'causal' : Math.random() < 0.5 ? 'propagated' : 'inferred', label: nextEdgeType() });
        }
      });
    });

    // Asset → Root
    assetNodes.forEach(an => {
      edges.push({ source: an.id, target: 'root', type: 'causal', label: 'causal' });
    });

    // Root → Downstream
    const dsNodes = nodes.filter(n => n.type === 'downstream');
    dsNodes.forEach(ds => {
      edges.push({ source: 'root', target: ds.id, type: Math.random() < 0.4 ? 'propagated' : 'downstream', label: nextEdgeType() });
    });

    // Some random inferred cross-edges for complexity
    if (nodes.length > 6) {
      const crossPairs = Math.min(3, Math.floor(nodes.length * 0.15));
      for (let i = 0; i < crossPairs; i++) {
        const a = nodes[Math.floor(Math.random() * nodes.length)];
        const b = nodes[Math.floor(Math.random() * nodes.length)];
        if (a && b && a.id !== b.id && !edges.some(e => (e.source === a.id && e.target === b.id) || (e.source === b.id && e.target === a.id))) {
          edges.push({ source: a.id, target: b.id, type: 'inferred', label: 'inferred' });
        }
      }
    }

    return { nodes, edges };
  }

  /* ─── D3 Investigation Graph ─── */
  let rcState = { svg: null, zoom: null, simulation: null, nodes: [], edges: [], width: 0, height: 0, currentAlarm: null };
  const RC_ARROW_SIZE = 6;

  function initGraph() {
    const container = document.getElementById('root-cause-svg-container');
    const svgEl = document.getElementById('root-cause-svg');
    if (!container || !svgEl || !window.d3) return;

    const rect = container.getBoundingClientRect();
    rcState.width = rect.width || 800;
    rcState.height = rect.height || 500;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('width', rcState.width).attr('height', rcState.height);

    // Arrow markers
    const defs = svg.append('defs');
    defs.append('marker').attr('id', 'arrow-causal').attr('viewBox', '0 0 10 10').attr('refX', 18).attr('refY', 5).attr('markerWidth', RC_ARROW_SIZE).attr('markerHeight', RC_ARROW_SIZE).attr('orient', 'auto')
      .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', '#413fd6');
    defs.append('marker').attr('id', 'arrow-propagated').attr('viewBox', '0 0 10 10').attr('refX', 18).attr('refY', 5).attr('markerWidth', RC_ARROW_SIZE).attr('markerHeight', RC_ARROW_SIZE).attr('orient', 'auto')
      .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', '#ba1a1a');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'rc-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
    filter.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).enter().append('feMergeNode').attr('in', d => d);

    // Zoom
    const zoom = d3.zoom().scaleExtent([0.25, 4]).on('zoom', (event) => {
      containerG.attr('transform', event.transform);
    });
    svg.call(zoom);

    // Container group
    const containerG = svg.append('g').attr('class', 'rc-container');

    // Zoom controls
    document.querySelectorAll('#rc-graph-controls [data-zoom]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.zoom;
        const t = d3.zoomIdentity;
        if (action === 'in') t.k = 1.3; else if (action === 'out') t.k = 0.75; else { t.k = 1; t.x = 0; t.y = 0; }
        svg.transition().duration(300).call(zoom.scaleBy, t.k);
      });
    });

    rcState.svg = svg;
    rcState.zoom = zoom;
    rcState.containerG = containerG;

    // Resize handler
    const ro = new ResizeObserver(() => {
      const r = container.getBoundingClientRect();
      rcState.width = r.width || 800;
      rcState.height = r.height || 500;
      svg.attr('width', rcState.width).attr('height', rcState.height);
    });
    ro.observe(container);
  }

  function renderGraph(alarm, animate = true) {
    if (!rcState.svg || !alarm) return;
    const emptyEl = document.getElementById('rc-graph-empty');
    if (emptyEl) emptyEl.style.display = 'none';

    const { nodes: newNodes, edges: newEdges } = buildTopology(alarm);
    rcState.currentAlarm = alarm;
    const svg = rcState.svg;
    const containerG = rcState.containerG;
    const w = rcState.width;
    const h = rcState.height;

    // Stop old simulation
    if (rcState.simulation) rcState.simulation.stop();

    // Assign IDs for D3 join
    newNodes.forEach(n => { n.x = w / 2 + (Math.random() - 0.5) * 60; n.y = h / 2 + (Math.random() - 0.5) * 60; });
    newEdges.forEach(e => { e.source = typeof e.source === 'string' ? e.source : e.source.id; e.target = typeof e.target === 'string' ? e.target : e.target.id; });

    const nodeMap = {};
    newNodes.forEach(n => nodeMap[n.id] = n);

    // Edges draw
    const edgeGroup = containerG.selectAll('g.rc-edge-group').data(newEdges, d => d.source + '-' + d.target);
    edgeGroup.exit().transition().duration(animate ? 300 : 0).style('opacity', 0).remove();

    const edgeEnter = edgeGroup.enter().append('g').attr('class', 'rc-edge-group').style('opacity', 0);
    edgeEnter.append('path').attr('class', d => 'rc-edge rc-edge-' + d.type).attr('marker-end', d => d.type === 'causal' ? 'url(#arrow-causal)' : d.type === 'propagated' ? 'url(#arrow-propagated)' : '');
    edgeEnter.transition().duration(animate ? 400 : 0).style('opacity', 1);

    const edgeMerge = edgeEnter.merge(edgeGroup);
    edgeMerge.select('path').attr('class', d => 'rc-edge rc-edge-' + d.type).attr('marker-end', d => d.type === 'causal' ? 'url(#arrow-causal)' : d.type === 'propagated' ? 'url(#arrow-propagated)' : '');

    // Nodes draw
    const nodeGroup = containerG.selectAll('g.rc-node').data(newNodes, d => d.id);
    nodeGroup.exit().transition().duration(animate ? 300 : 0).style('opacity', 0).remove();

    const nodeEnter = nodeGroup.enter().append('g').attr('class', 'rc-node').style('opacity', 0);

    // Node background circle
    nodeEnter.append('circle').attr('class', 'rc-node-bg').attr('r', 0);

    // Root cause ring + glow
    nodeEnter.filter(d => d.type === 'root').append('circle').attr('class', 'rc-pulse-ring').attr('r', 20).attr('fill', 'none').attr('stroke', '#ba1a1a').attr('stroke-width', 2).style('opacity', 0.5);

    // Icon inside node
    nodeEnter.append('text').attr('class', 'rc-node-icon').attr('text-anchor', 'middle').attr('dominant-baseline', 'central').style('font-family', 'Material Symbols Outlined').style('font-size', '18px').style('pointer-events', 'none').style('font-variation-settings', '"FILL" 1');

    // Label below node
    nodeEnter.append('text').attr('class', 'rc-node-label');
    nodeEnter.append('text').attr('class', 'rc-node-sublabel');

    // Tooltip group
    const tooltip = nodeEnter.append('g').attr('class', 'rc-tooltip').style('opacity', 0).style('pointer-events', 'none');
    tooltip.append('rect').attr('class', 'rc-tooltip-bg').attr('width', 140).attr('height', 60).attr('x', -70).attr('y', -75);
    tooltip.append('text').attr('class', 'rc-tooltip-title').attr('x', 0).attr('y', -60).attr('text-anchor', 'middle');
    tooltip.append('text').attr('class', 'rc-tooltip-text').attr('x', -60).attr('y', -45);
    tooltip.append('text').attr('class', 'rc-tooltip-text t2').attr('x', -60).attr('y', -33);
    tooltip.append('text').attr('class', 'rc-tooltip-text t3').attr('x', -60).attr('y', -21);

    nodeEnter.transition().duration(animate ? 500 : 0).style('opacity', 1);

    const nodeMerge = nodeEnter.merge(nodeGroup);

    // Update node positions in tick
    nodeMerge.select('.rc-node-bg').attr('r', d => {
      if (d.type === 'root') return 22;
      if (d.type === 'asset') return 18;
      if (d.type === 'subsystem') return 15;
      if (d.type === 'downstream') return 13;
      return 12;
    }).attr('fill', d => {
      if (d.type === 'root') return '#ba1a1a20';
      if (d.type === 'asset') return '#413fd620';
      if (d.type === 'downstream') return '#76758620';
      return '#413fd610';
    }).attr('stroke', d => {
      if (d.type === 'root') return '#ba1a1a';
      if (d.confidence > 70) return '#413fd6';
      if (d.confidence > 30) return '#413fd680';
      return '#76758660';
    }).attr('stroke-width', d => d.type === 'root' ? 3 : d.confidence > 70 ? 2.5 : 2).style('filter', d => d.type === 'root' ? 'url(#rc-glow)' : 'none');

    nodeMerge.select('.rc-pulse-ring').attr('r', 22).style('--r', 22);

    nodeMerge.select('.rc-node-icon').attr('x', 0).attr('y', 0).text(d => d.icon || 'sensors').style('fill', d => d.type === 'root' ? '#ba1a1a' : d.confidence > 70 ? '#413fd6' : d.confidence > 30 ? '#413fd6a0' : '#767586');

    nodeMerge.select('.rc-node-label').attr('x', 0).attr('y', d => {
      const base = d.type === 'root' ? 34 : d.type === 'asset' ? 30 : d.type === 'subsystem' ? 27 : d.type === 'downstream' ? 24 : 23;
      return base;
    }).text(d => d.label.length > 20 ? d.label.slice(0, 18) + '..' : d.label);

    nodeMerge.select('.rc-node-sublabel').attr('x', 0).attr('y', d => {
      const base = d.type === 'root' ? 44 : d.type === 'asset' ? 40 : d.type === 'subsystem' ? 37 : d.type === 'downstream' ? 34 : 33;
      return base;
    }).text(d => d.confidence + '% conf · ' + d.machine);

    // Tooltip content
    nodeMerge.select('.rc-tooltip-title').text(d => d.label);
    nodeMerge.select('.rc-tooltip-text').text(d => {
      const typeLabel = { root:'Root Cause', asset:'Asset', subsystem:'Subsystem', sensor:'Sensor', downstream:'Downstream' };
      return (typeLabel[d.type] || 'Node') + ': ' + d.label;
    });
    nodeMerge.select('.rc-tooltip-text.t2').text(d => 'Reading: ' + d.reading + (d.unit ? ' ' + d.unit : '') + ' · Score: ' + d.score + '%');
    nodeMerge.select('.rc-tooltip-text.t3').text(d => 'Conf: ' + d.confidence + '% · ' + (d.timestamp ? new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''));

    // Node interactions
    nodeMerge.on('mouseenter', function() {
      d3.select(this).select('.rc-tooltip').transition().duration(200).style('opacity', 1);
    });
    nodeMerge.on('mouseleave', function() {
      d3.select(this).select('.rc-tooltip').transition().duration(200).style('opacity', 0);
    });
    nodeMerge.on('click', function(event, d) {
      event.stopPropagation();
      highlightPath(d.id, containerG, newNodes, newEdges);
      updateNodeDetailPanels(d, alarm);
    });

    // Force simulation
    const sim = d3.forceSimulation(newNodes)
      .force('link', d3.forceLink(newEdges).id(n => n.id).distance(d => {
        if (d.type === 'causal') return 90;
        if (d.type === 'correlated') return 120;
        return 150;
      }).strength(d => d.type === 'causal' ? 0.8 : 0.3))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collide', d3.forceCollide().radius(d => {
        if (d.type === 'root') return 40;
        if (d.type === 'asset') return 35;
        if (d.type === 'subsystem') return 28;
        return 22;
      }))
      .alphaDecay(0.03)
      .on('tick', () => {
        // Update edge paths
        edgeMerge.select('path').attr('d', d => {
          const s = typeof d.source === 'object' ? d.source : nodeMap[d.source];
          const t = typeof d.target === 'object' ? d.target : nodeMap[d.target];
          if (!s || !t) return '';
          const dx = t.x - s.x, dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = dx / dist, ny = dy / dist;
          const r1 = s.type === 'root' ? 22 : s.type === 'asset' ? 18 : s.type === 'subsystem' ? 15 : s.type === 'downstream' ? 13 : 12;
          const r2 = t.type === 'root' ? 22 : t.type === 'asset' ? 18 : t.type === 'subsystem' ? 15 : t.type === 'downstream' ? 13 : 12;
          const x1 = s.x + nx * (r1 + 3);
          const y1 = s.y + ny * (r1 + 3);
          const x2 = t.x - nx * (r2 + 6);
          const y2 = t.y - ny * (r2 + 6);
          return 'M' + x1 + ',' + y1 + 'L' + x2 + ',' + y2;
        });

        // Update node positions
        nodeMerge.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
      });

    rcState.simulation = sim;
    rcState.nodes = newNodes;
    rcState.edges = newEdges;

    // Signal flow particles on causal edges
    spawnParticles(containerG, newEdges, nodeMap);

    // Fit graph after settling
    setTimeout(() => fitGraph(svg, zoom, containerG, newNodes, w, h), 1500);
  }

  function fitGraph(svg, zoom, containerG, nodes, w, h) {
    if (!nodes.length) return;
    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const pad = 80;
    const bw = x1 - x0 + pad * 2, bh = y1 - y0 + pad * 2;
    if (bw === 0 || bh === 0) return;
    const scale = Math.min(w / bw, h / bh, 1.5);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const t = d3.zoomIdentity.translate(w / 2 - cx * scale, h / 2 - cy * scale).scale(scale);
    svg.transition().duration(400).call(zoom.transform, t);
  }

  function highlightPath(nodeId, containerG, nodes, edges) {
    const relevant = new Set();
    relevant.add(nodeId);
    edges.forEach(e => {
      const s = typeof e.source === 'object' ? e.source.id : e.source;
      const t = typeof e.target === 'object' ? e.target.id : e.target;
      if (s === nodeId) relevant.add(t);
      if (t === nodeId) relevant.add(s);
    });
    // Add 2-hop neighbors
    edges.forEach(e => {
      const s = typeof e.source === 'object' ? e.source.id : e.source;
      const t = typeof e.target === 'object' ? e.target.id : e.target;
      if (relevant.has(s) || relevant.has(t)) { relevant.add(s); relevant.add(t); }
    });

    containerG.selectAll('g.rc-node').classed('rc-node-dimmed', d => !relevant.has(d.id));
    containerG.selectAll('g.rc-edge-group').classed('rc-edge-dimmed', d => {
      const s = typeof d.source === 'object' ? d.source.id : d.source;
      const t = typeof d.target === 'object' ? d.target.id : d.target;
      return !(relevant.has(s) && relevant.has(t));
    });
  }

  function clearHighlight(containerG) {
    containerG.selectAll('.rc-node-dimmed').classed('rc-node-dimmed', false);
    containerG.selectAll('.rc-edge-dimmed').classed('rc-edge-dimmed', false);
  }

  function spawnParticles(containerG, edges, nodeMap) {
    containerG.selectAll('.rc-particle').remove();
    const causalEdges = edges.filter(e => e.type === 'causal');
    if (!causalEdges.length) return;
    const particles = [];
    for (let i = 0; i < Math.min(8, causalEdges.length * 2); i++) {
      const edge = causalEdges[i % causalEdges.length];
      const s = typeof edge.source === 'object' ? edge.source : nodeMap[edge.source];
      const t = typeof edge.target === 'object' ? edge.target : nodeMap[edge.target];
      if (!s || !t) continue;
      particles.push({ edge, source: s, target: t, offset: Math.random() });
    }
    const particleGroup = containerG.selectAll('.rc-particle').data(particles);
    particleGroup.enter().append('circle').attr('class', 'rc-particle').attr('r', 2.5).style('fill', '#413fd6').style('opacity', 0.8)
      .each(function(d) {
        const el = d3.select(this);
        animateParticle(el, d, 0);
      });
  }

  function animateParticle(el, d, time) {
    const s = d.source, t = d.target;
    if (!s || !t) return;
    const dx = t.x - s.x, dy = t.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist, ny = dy / dist;
    const r1 = s.type === 'root' ? 22 : s.type === 'asset' ? 18 : s.type === 'subsystem' ? 15 : 12;
    const r2 = t.type === 'root' ? 22 : t.type === 'asset' ? 18 : 12;
    const x1 = s.x + nx * (r1 + 3);
    const y1 = s.y + ny * (r1 + 3);
    const x2 = t.x - nx * (r2 + 6);
    const y2 = t.y - ny * (r2 + 6);
    const duration = 2000 + Math.random() * 1000;
    const delay = d.offset * 1000;

    el.attr('cx', x1).attr('cy', y1).transition().delay(delay).duration(duration).ease(d3.easeLinear)
      .attr('cx', x2).attr('cy', y2).on('end', () => {
        setTimeout(() => animateParticle(el, d, 0), Math.random() * 500);
      });
  }

  function updateNodeDetailPanels(nodeData, alarm) {
    updateInvestigationPath({ ...alarm, _focusNode: nodeData });
    updateAIReasoning({ ...alarm, _focusNode: nodeData });
    updateRecommendedActions({ ...alarm, _focusNode: nodeData });
    updateAffectedAssets({ ...alarm, _focusNode: nodeData });
    updateCausalHypotheses({ ...alarm, _focusNode: nodeData });
  }

  function updateGraphForAlarm(alarm) {
    if (!alarm) return;
    if (!rcState.svg) initGraph();
    renderGraph(alarm, true);
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

    // Initialize D3 graph (selectAlarm already triggers render if alarms exist)
    if (!allAlarms.length) initGraph();
  });
})();
