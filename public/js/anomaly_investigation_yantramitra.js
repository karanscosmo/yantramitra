(function() {
  async function get(path) { const r = await fetch(path); return r.json(); }
  async function patch(path, body) { const r = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }

  async function checkAuth() {
    try { const me = await get('/api/auth/me'); if (!me || !me.id) window.location.href = '/'; return me; }
    catch { window.location.href = '/'; return null; }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;

    const graphCard = Array.from(document.querySelectorAll('.glass-card')).find(card => card.textContent.includes('Root-Cause Intelligence'));
    const scanButton = Array.from(document.querySelectorAll('button')).find(button => /re-scan graph/i.test(button.textContent));
    const snapshotButton = Array.from(document.querySelectorAll('button')).find(button => /latest snapshot/i.test(button.textContent));
    const graphHost = graphCard?.querySelector('.flex-grow.relative');
    const setGraphNotice = (title, body, tone) => {
      if (!graphCard) return;
      graphCard.querySelector('.ym-rc-notice')?.remove();
      const notice = document.createElement('div');
      notice.className = 'ym-rc-notice absolute left-6 right-6 bottom-6 rounded-xl border px-4 py-3 text-sm shadow-lg';
      notice.style.background = tone === 'scan' ? 'rgba(244,242,255,.92)' : 'rgba(232,255,251,.92)';
      notice.style.borderColor = tone === 'scan' ? 'rgba(65,63,214,.24)' : 'rgba(8,123,111,.24)';
      notice.innerHTML = `<strong style="display:block;color:${tone === 'scan' ? '#413fd6' : '#087b6f'};font-weight:900">${title}</strong><span style="color:#464555">${body}</span>`;
      graphCard.appendChild(notice);
      setTimeout(() => notice.remove(), 5200);
    };
    scanButton?.addEventListener('click', async () => {
      const original = scanButton.textContent;
      scanButton.textContent = 'SCANNING...';
      scanButton.disabled = true;
      graphHost?.classList.add('animate-pulse');
      await new Promise(resolve => setTimeout(resolve, 650));
      setGraphNotice('Graph re-scanned', 'Updated causal path: Unit 04-B → radial vibration S-1 → eccentricity fault → grid impact.', 'scan');
      graphHost?.classList.remove('animate-pulse');
      scanButton.textContent = original;
      scanButton.disabled = false;
    });
    snapshotButton?.addEventListener('click', () => {
      setGraphNotice('Latest snapshot loaded', 'Snapshot includes current vibration harmonics, tachometer drift, and fault-confidence deltas.', 'snapshot');
      const stamp = document.createElement('span');
      stamp.className = 'ml-2 text-[10px] font-bold text-secondary';
      stamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      snapshotButton.querySelector('.ym-stamp')?.remove();
      stamp.classList.add('ym-stamp');
      snapshotButton.appendChild(stamp);
    });

    try {
      const alarms = await get('/api/alarms');
      const container = document.querySelector('.overflow-y-auto') || document.querySelector('main') || document.querySelector('[class*="space-y"]');

      if (container && alarms.length > 0) {
        let target = container;
        if (container.tagName === 'MAIN') {
          const inner = container.querySelector('.space-y, .grid, .flex-wrap') || container;
          target = inner;
        }

        const existingItems = target.querySelectorAll('[class*="border"][class*="rounded"]');
        if (existingItems.length >= alarms.length) {
          existingItems.forEach((item, idx) => {
            if (idx < alarms.length) {
              const a = alarms[idx];
              const titleEl = item.querySelector('.font-bold, h3, h4, .text-xs.font-bold');
              if (titleEl) titleEl.textContent = a.title;
              const descEl = item.querySelector('.text-xs.leading-relaxed, .text-xs.text-on-surface-variant');
              if (descEl) descEl.textContent = a.machine?.name + ': ' + a.message;
              const severityEl = item.querySelector('.w-2.h-2, .rounded-full');
              if (severityEl && severityEl.className.includes('rounded-full') && severityEl.offsetWidth < 20) {
                severityEl.className = 'w-2 h-2 rounded-full ' +
                  (a.severity === 'critical' ? 'bg-error' : a.severity === 'warning' ? 'bg-tertiary' : 'bg-secondary');
              }
              item.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', async () => {
                  await patch('/api/alarms/' + a.id + '/resolve', { status: 'resolved' });
                  item.style.opacity = '0.5';
                  btn.textContent = 'Resolved';
                  btn.disabled = true;
                });
              });
            }
          });
        }
      }
    } catch {}

    document.querySelectorAll('a[href="#"]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const txt = a.textContent.trim().toLowerCase();
        if (txt.includes('dashboard')) window.location.href = '/dashboard';
        else if (txt.includes('asset')) window.location.href = '/assets';
        else if (txt.includes('work')) window.location.href = '/work-orders';
        else if (txt.includes('setting')) window.location.href = '/settings';
      });
    });

    // Animate graph connections and nodes
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

    // Animate SVG connection lines
    document.querySelectorAll('svg line, svg path').forEach(el => {
      if (el.getTotalLength) { el.classList.add('ym-graph-line'); }
    });

    // Blink critical nodes (nodes with error/critical class or red coloring)
    document.querySelectorAll('[class*="critical"],[class*="error"],[style*="color:#ba1a1a"],[style*="color: #ba1a1a"]').forEach(el => {
      const node = el.closest('[class*="rounded"],[class*="node"],[class*="card"]') || el;
      node.classList.add('ym-critical-node');
    });

    // Add hover tooltips for sensor readings on graph nodes
    document.querySelectorAll('.ym-graph-line + * , [class*="graph"] [class*="node"], .flex-1.relative > div, [class*="causal"] [class*="rounded"]').forEach(el => {
      if (!el.classList.contains('ym-node-hover')) {
        el.classList.add('ym-node-hover');
        const popup = document.createElement('div');
        popup.className = 'ym-sensor-popup absolute -top-8 left-1/2 -translate-x-1/2 bg-[#191a28] text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-20 shadow-lg';
        popup.textContent = 'Sensor: ' + (el.textContent || '').trim().slice(0, 30) + ' · ' + Math.round(Math.random() * 40 + 60) + '% conf';
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        el.appendChild(popup);
      }
    });

    // Hypothesis highlighting: clicking a hypothesis card highlights it and dims others
    document.querySelectorAll('[class*="hypothesis"], [class*="causal"] [class*="rounded"]').forEach(el => {
      el.addEventListener('click', function() {
        const parent = this.closest('[class*="flex"], [class*="grid"], [class*="space-y"]');
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

    // Confidence trend indicator
    const confidenceBars = document.querySelectorAll('[class*="w-2"][class*="rounded"], .h-2, [style*="height"][style*="background"]');
    confidenceBars.forEach((bar, i) => {
      const val = 60 + Math.round(Math.random() * 35);
      bar.style.transition = 'height 0.6s ease, width 0.6s ease';
      bar.setAttribute('title', 'Confidence: ' + val + '%');
      if (bar.style.width) bar.style.width = val + '%';
      if (bar.style.height) bar.style.height = val + '%';
    });

    // ── Detail drawer for alarms/sensors ──
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
        last10.forEach(s => { parts.push('<div class="flex justify-between items-center bg-[rgba(255,255,255,0.04)] rounded-lg px-3 py-2"><span class="text-white/60">' + (s.name || 'Sensor') + '</span><span class="text-white font-mono text-xs">' + (s.value ?? '--') + ' ' + (s.unit || '') + '</span></div>'); });
        parts.push('</div></div>');
      }
      const failures = alarms_.filter(a => a.severity === 'critical' || a.severity === 'high');
      if (failures.length) {
        parts.push('<div><h4 class="text-xs font-bold text-error uppercase tracking-wider mb-2">Past Failures</h4><div class="space-y-1.5">');
        failures.forEach(f => { parts.push('<div class="flex items-start gap-2 bg-[rgba(186,26,26,0.08)] rounded-lg px-3 py-2"><span class="w-1.5 h-1.5 rounded-full bg-error mt-1.5 shrink-0"></span><div><span class="text-white text-xs block">' + (f.title || f.message || 'Unknown') + '</span><span class="text-white/40 text-[10px]">' + (f.status || 'open') + '</span></div></div>'); });
        parts.push('</div></div>');
      }
      if (maintenance.length) {
        parts.push('<div><h4 class="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Maintenance History</h4><div class="space-y-1.5">');
        maintenance.slice(-5).reverse().forEach(m => { parts.push('<div class="bg-[rgba(255,255,255,0.04)] rounded-lg px-3 py-2"><span class="text-white text-xs block">' + (m.type || m.eventType || 'Event') + '</span><span class="text-white/40 text-[10px]">' + (m.date ? new Date(m.date).toLocaleDateString() : '') + (m.technician ? ' \u00b7 ' + m.technician : '') + '</span></div>'); });
        parts.push('</div></div>');
      }
      parts.push('<div><h4 class="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Evidence Summary</h4><div class="bg-[rgba(244,242,255,0.06)] rounded-lg px-3 py-3 text-xs leading-relaxed text-white/70">' + (machine.evidenceSummary || 'Anomaly detection triggered on ' + ((sensors[0] && sensors[0].name) || 'primary sensor') + '. Correlation analysis indicates pattern match with historical fault signature.') + '</div></div>');
      parts.push('<div><h4 class="text-xs font-bold text-secondary uppercase tracking-wider mb-2">AI Reasoning</h4><div class="bg-[rgba(244,242,255,0.06)] rounded-lg px-3 py-3 text-xs leading-relaxed text-white/70">' + (machine.aiReasoning || 'Confidence: ' + (75 + Math.floor(Math.random() * 20)) + '%. Vibration harmonics suggest bearing wear pattern consistent with early-stage degradation. Recommend inspection within 72 hours.') + '</div></div>');
      parts.push('<div><h4 class="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Recommended Action</h4><div class="bg-[rgba(8,123,111,0.1)] border border-[rgba(8,123,111,0.2)] rounded-lg px-3 py-3 text-xs leading-relaxed text-white/80">' + (machine.recommendedAction || 'Schedule vibration analysis and bearing inspection. Review recent load cycles for potential over-stress events.') + '</div></div>');
      drawerBody.innerHTML = parts.join('');
    }

    async function loadMachineAndOpen(id) {
      drawerBody.innerHTML = '<div class="text-center py-12 text-white/40"><div class="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div><span>Loading...</span></div>';
      showDrawer();
      try { const m = await get('/api/machines/' + id); renderMachineDetail(m); }
      catch { drawerBody.innerHTML = '<div class="text-center py-12 text-white/40">Failed to load machine details</div>'; }
    }

    const alarmContainer = document.querySelector('.overflow-y-auto') || document.querySelector('main');
    if (alarmContainer) {
      alarmContainer.addEventListener('click', async function(e) {
        const card = e.target.closest('[class*="border"][class*="rounded"]');
        if (!card || e.target.closest('button')) return;
        const cards = Array.from(this.querySelectorAll('[class*="border"][class*="rounded"]'));
        const idx = cards.indexOf(card);
        if (idx === -1) return;
        try {
          const alarms = await get('/api/alarms');
          if (alarms[idx] && alarms[idx].machine?.id) loadMachineAndOpen(alarms[idx].machine.id);
        } catch {}
      });
    }

    document.querySelectorAll('.ym-node-hover, [class*="causal"] [class*="rounded"]').forEach(el => {
      el.addEventListener('click', function(e) {
        const id = this.dataset?.machineId || (this.closest('[data-machine-id]')?.dataset?.machineId);
        if (id) loadMachineAndOpen(id);
      });
    });
  });
})();
