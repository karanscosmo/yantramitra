(function() {
  const navItems = [
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/map', icon: 'public', label: 'Global Map' },
    { path: '/assets', icon: 'precision_manufacturing', label: 'Assets' },
    { path: '/digital-twin', icon: 'view_in_ar', label: 'Digital Twin' },
    { path: '/reliability', icon: 'monitoring', label: 'Reliability' },
    { path: '/maintenance', icon: 'event_note', label: 'Maintenance' },
    { path: '/work-orders', icon: 'build', label: 'Work Orders' },
    { path: '/plans', icon: 'approval', label: 'Plans' },
    { path: '/agents', icon: 'smart_toy', label: 'Agents' },
    { path: '/anomaly', icon: 'troubleshoot', label: 'Anomaly' },
    { path: '/simulator', icon: 'science', label: 'Simulator' },
    { path: '/ai-console', icon: 'psychology', label: 'YantraNklan' },
    { path: '/settings', icon: 'settings', label: 'Settings' },
  ];

  const currentPath = window.location.pathname;
  const authPaths = ['/login', '/signup', '/reset-password'];
  const shellExcludedPaths = ['/', ...authPaths];
  const demoSteps = [
    { route: '/dashboard', target: 'h1, .font-headline-lg', caption: 'Global command center: live KPIs, open incidents, and agent activity across Indian facilities.' },
    { route: '/map', target: 'h1, .font-headline-lg', caption: 'Map view: all five facilities are pinned at real Indian city coordinates.' },
    { route: '/plant/detroit', target: 'h1, .font-headline-lg', caption: 'Plant overview: drill into one facility before opening its live digital twin.' },
    { route: '/digital-twin', target: '#ym-twin-canvas, main', caption: '3D Digital Twin: rotate, zoom, and click faulted red machines to inspect live sensor context.' },
    { route: '/assets', target: 'h1, .font-headline-lg', caption: 'Asset fleet: compare health, status, and maintenance exposure across machines.' },
    { route: '/assets/pump-p-102', target: 'h1, .font-headline-lg', caption: 'Asset detail: sensor traces, alarms, and linked work orders live in one view.' },
    { route: '/anomaly', target: 'h1, .font-headline-lg', caption: 'Anomaly investigation: operational context and fault evidence come together.' },
    { route: '/plans', target: 'h1, .font-headline-lg', caption: 'Plan review: approve or reject maintenance plans against current plant risk.' },
    { route: '/work-orders', target: 'h1, .font-headline-lg', caption: 'Work orders: track technician ownership and status changes.' },
    { route: '/agents', target: 'h1, .font-headline-lg', caption: 'Agent Mission Control: create and advance real persisted missions.' },
    { route: '/ai-console', target: 'input[type="text"], .chat-scroll', caption: 'YantraNklan: ask plant-aware questions, or use speech input in Chrome.' },
    { route: '/settings', target: 'h1, .font-headline-lg', caption: 'Settings: profile, notifications, team roles, integrations, and security are persisted.' },
  ];

  function injectStyles() {
    if (document.getElementById('ym-shell-styles')) return;
    const style = document.createElement('style');
    style.id = 'ym-shell-styles';
    style.textContent = `
      .ym-shell-rail {
        position: fixed;
        right: 16px;
        top: 88px;
        bottom: 24px;
        width: 72px;
        z-index: 70;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 14px 8px;
        border: 1px solid rgba(199, 196, 215, .6);
        border-radius: 9999px;
        background: rgba(255, 255, 255, .78);
        backdrop-filter: blur(18px);
        box-shadow: 0 18px 48px rgba(65, 63, 214, .18);
        overflow-y: auto;
        pointer-events: auto;
        scrollbar-width: none;
      }
      .ym-shell-rail::-webkit-scrollbar { display: none; }
      .ym-shell-rail a {
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 9999px;
        color: #464555;
        text-decoration: none;
        transition: transform .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease;
      }
      .ym-shell-rail a:hover {
        transform: translateY(-1px) scale(1.06);
        background: rgba(65, 63, 214, .10);
        color: #413fd6;
      }
      .ym-shell-rail a.is-active {
        background: #413fd6;
        color: #fff;
        box-shadow: 0 10px 24px rgba(65, 63, 214, .34);
      }
      .ym-shell-rail .material-symbols-outlined { font-size: 23px; line-height: 1; }
      .ym-ask-yantranklan {
        position: fixed;
        right: 108px;
        bottom: 96px;
        z-index: 62;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px 10px 10px;
        border: 1px solid rgba(94, 250, 228, .45);
        border-radius: 9999px;
        background: rgba(255, 255, 255, .88);
        color: #191a28;
        text-decoration: none;
        box-shadow: 0 18px 42px rgba(65, 63, 214, .20);
        backdrop-filter: blur(18px);
        font: 700 13px/1.2 Inter, system-ui, sans-serif;
      }
      body.ym-shell-safe-bottom main,
      body.ym-shell-safe-bottom footer {
        padding-bottom: 112px !important;
      }
      .ym-home-motion {
        position: fixed;
        inset: 0;
        z-index: -1;
        pointer-events: none;
        overflow: hidden;
      }
      .ym-home-motion::before {
        content: '';
        position: absolute;
        width: 280px;
        height: 280px;
        right: 8%;
        top: 20%;
        border-radius: 38% 62% 54% 46%;
        background: linear-gradient(135deg, rgba(65,63,214,.18), rgba(94,250,228,.24));
        box-shadow: inset 0 0 60px rgba(255,255,255,.65), 0 30px 80px rgba(65,63,214,.16);
        animation: ym-drift-3d 14s ease-in-out infinite alternate;
      }
      @keyframes ym-drift-3d {
        from { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
        to { transform: translate3d(-36px, 26px, 0) rotate(28deg) scale(1.08); }
      }
      .ym-demo-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 0;
        border-radius: 9999px;
        padding: 10px 16px;
        background: #191a28;
        color: #fff;
        font: 800 13px/1 Inter, system-ui, sans-serif;
        box-shadow: 0 14px 34px rgba(25,26,40,.18);
        cursor: pointer;
        text-decoration: none;
      }
      .ym-demo-overlay {
        position: fixed;
        inset: 0;
        z-index: 120;
        pointer-events: none;
      }
      .ym-demo-highlight {
        position: fixed;
        border: 3px solid #5efae4;
        border-radius: 16px;
        box-shadow: 0 0 0 9999px rgba(25,26,40,.32), 0 0 34px rgba(94,250,228,.75);
        transition: all .24s ease;
      }
      .ym-demo-card {
        position: fixed;
        width: min(360px, calc(100vw - 32px));
        border-radius: 18px;
        background: rgba(255,255,255,.94);
        border: 1px solid rgba(199,196,215,.75);
        box-shadow: 0 24px 70px rgba(65,63,214,.26);
        padding: 16px;
        pointer-events: auto;
      }
      .ym-demo-card button {
        border: 0;
        border-radius: 9999px;
        padding: 8px 12px;
        font-weight: 800;
        cursor: pointer;
      }
      .ym-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 130;
        background: rgba(25, 26, 40, .36);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
      }
      .ym-modal-card {
        width: min(760px, 100%);
        max-height: min(760px, 90vh);
        overflow: auto;
        border-radius: 18px;
        border: 1px solid rgba(199,196,215,.72);
        background: rgba(255,255,255,.96);
        box-shadow: 0 30px 90px rgba(25,26,40,.28);
        padding: 20px;
      }
      .ym-command-card {
        width: min(720px, calc(100vw - 28px));
        align-self: flex-start;
        margin-top: 8vh;
      }
      .ym-command-input {
        width: 100%;
        border: 1px solid rgba(199,196,215,.8);
        border-radius: 14px;
        padding: 13px 16px;
        font: 700 16px/1.2 Inter, system-ui, sans-serif;
        outline: none;
      }
      .ym-command-row {
        width: 100%;
        border: 0;
        background: transparent;
        text-align: left;
        display: flex;
        justify-content: space-between;
        gap: 14px;
        padding: 12px;
        border-radius: 12px;
        cursor: pointer;
      }
      .ym-command-row:hover { background: #eeecff; }
      .ym-notification-fab {
        position: fixed;
        right: 108px;
        top: 92px;
        z-index: 63;
        width: 44px;
        height: 44px;
        border-radius: 9999px;
        border: 1px solid rgba(199,196,215,.7);
        background: rgba(255,255,255,.9);
        color: #413fd6;
        box-shadow: 0 14px 34px rgba(65,63,214,.16);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .ym-notification-fab .ym-badge {
        position: absolute;
        top: -3px;
        right: -3px;
        min-width: 18px;
        height: 18px;
        border-radius: 999px;
        background: #ba1a1a;
        color: #fff;
        font-size: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
      }
      .ym-ask-yantranklan img {
        width: 34px;
        height: 34px;
        border-radius: 9999px;
        object-fit: cover;
        border: 2px solid rgba(94, 250, 228, .55);
      }
      .ym-home-auth {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin-left: 10px;
        flex-shrink: 0;
        white-space: nowrap;
      }
      .ym-home-auth a {
        border-radius: 9999px;
        padding: 9px 14px;
        font: 700 14px/1 Inter, system-ui, sans-serif;
        text-decoration: none;
      }
      .ym-home-auth .ym-login { color: #413fd6; background: rgba(65, 63, 214, .09); }
      .ym-home-auth .ym-signup { color: #fff; background: #413fd6; box-shadow: 0 10px 24px rgba(65, 63, 214, .25); }
      @media (max-width: 900px) {
        .ym-shell-rail { right: 8px; top: auto; left: 8px; bottom: 8px; width: auto; height: 64px; flex-direction: row; border-radius: 9999px; overflow-x: auto; overflow-y: hidden; }
        .ym-ask-yantranklan { right: 14px; bottom: 84px; }
      }
      @media (max-width: 1100px) {
        .ym-home-search,
        .ym-home-secondary-actions {
          display: none !important;
        }
      }
      @media (max-width: 640px) {
        .ym-home-auth {
          gap: 6px;
          margin-left: 4px;
        }
        .ym-home-auth a {
          padding: 8px 10px;
          font-size: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeRightRail() {
    const existingRails = Array.from(document.querySelectorAll('aside, nav')).filter(el => {
      const cls = el.className || '';
      return typeof cls === 'string' && cls.includes('right-4') && (cls.includes('72px') || cls.includes('rounded-full'));
    });
    if (shellExcludedPaths.includes(currentPath)) {
      existingRails.forEach(el => { el.style.display = 'none'; });
      return;
    }

    const rail = existingRails[0] || document.createElement('aside');
    rail.className = 'ym-shell-rail';
    rail.setAttribute('aria-label', 'YantraMitra app navigation');
    rail.innerHTML = navItems.map(item => {
      const active = currentPath === item.path || (item.path !== '/dashboard' && currentPath.startsWith(item.path + '/'));
      return `<a href="${item.path}" title="${item.label}" aria-label="${item.label}" class="${active ? 'is-active' : ''}">
        <span class="material-symbols-outlined">${item.icon}</span>
      </a>`;
    }).join('');

    existingRails.slice(1).forEach(el => { el.style.display = 'none'; });
    if (!rail.parentNode) document.body.appendChild(rail);
  }

  function addYantraNklanEntry() {
    if (shellExcludedPaths.includes(currentPath)) return;
    if (document.querySelector('.ym-ask-yantranklan') || currentPath === '/ai-console') return;
    document.body.classList.add('ym-shell-safe-bottom');
    const link = document.createElement('a');
    link.href = '/ai-console';
    link.className = 'ym-ask-yantranklan';
    link.innerHTML = '<img src="/images/yantranklan-avatar-ai.jpg" alt="YantraNklan"><span>Ask YantraNklan</span>';
    document.body.appendChild(link);
  }

  function addHomeAuthActions() {
    if (currentPath !== '/') return;
    if (!document.querySelector('.ym-home-motion')) {
      const motion = document.createElement('div');
      motion.className = 'ym-home-motion';
      document.body.prepend(motion);
    }
    const headerInner = document.querySelector('header .max-w-7xl, header > div, header');
    const searchInput = document.querySelector('header input[placeholder*="Search"]');
    const searchWrap = searchInput ? searchInput.closest('div') : null;
    if (searchWrap) searchWrap.classList.add('ym-home-search');
    const secondaryActions = searchWrap && searchWrap.nextElementSibling;
    if (secondaryActions) secondaryActions.classList.add('ym-home-secondary-actions');

    if (headerInner && !headerInner.querySelector('.ym-home-auth')) {
      const auth = document.createElement('div');
      auth.className = 'ym-home-auth';
      auth.innerHTML = '<a class="ym-login" href="/login">Login</a><a class="ym-signup" href="/signup">Sign Up</a>';
      headerInner.appendChild(auth);
    }

    const heroActions = document.querySelector('main section .flex.flex-wrap');
    if (heroActions && !heroActions.querySelector('a[href="/login"]')) {
      const login = document.createElement('a');
      login.href = '/login';
      login.className = 'glass-card flex items-center gap-xs px-xl py-4 rounded-full text-on-surface font-body-md text-lg hover:bg-white/90 transition-all';
      login.innerHTML = '<span class="material-symbols-outlined text-primary">login</span><span>Login</span>';
      heroActions.appendChild(login);
    }
  }

  function wireKnownButtons() {
    const routeByText = [
      [/view all plants|global map/i, '/map'],
      [/plant drilldown/i, '/map'],
      [/agent terminal|agents/i, '/agents'],
      [/work orders?/i, '/work-orders'],
      [/maintenance/i, '/maintenance'],
      [/plans?|approval/i, '/plans'],
      [/ask yantranklan|ai console|yantranklan/i, '/ai-console'],
      [/settings/i, '/settings'],
      [/assets?/i, '/assets'],
    ];

    document.querySelectorAll('button').forEach(button => {
      if (button.dataset.ymWired === 'true' || button.closest('form')) return;
      const text = button.textContent.trim();
      const lower = text.toLowerCase();
      if (/export|download/i.test(text)) {
        button.dataset.ymWired = 'true';
        button.addEventListener('click', exportCurrentPageCsv);
        return;
      }
      if (/share/i.test(text)) {
        button.dataset.ymWired = 'true';
        button.addEventListener('click', shareCurrentPage);
        return;
      }
      if (/history|timeline/i.test(text)) {
        button.dataset.ymWired = 'true';
        button.addEventListener('click', openHistoryModal);
        return;
      }
      if (/replay/i.test(text)) {
        button.dataset.ymWired = 'true';
        button.addEventListener('click', openIncidentReplay);
        return;
      }
      if (/compare/i.test(text)) {
        button.dataset.ymWired = 'true';
        button.addEventListener('click', openCompareModal);
        return;
      }
      if (/details|open/i.test(text) && !/open\s+maintenance/i.test(lower)) {
        button.dataset.ymWired = 'true';
        button.addEventListener('click', openDetailsModal);
        return;
      }
      if (/approve/i.test(text)) {
        button.dataset.ymWired = 'true';
        button.addEventListener('click', () => incidentAction('approve_plan'));
        return;
      }
      if (/reject/i.test(text)) {
        button.dataset.ymWired = 'true';
        button.addEventListener('click', () => showModal('Decision Logged', '<p class="text-on-surface-variant">Rejection recorded in the review workflow. A revised plan can be generated from the incident replay.</p>'));
        return;
      }
      const match = routeByText.find(([pattern]) => pattern.test(text));
      if (!match) return;
      button.dataset.ymWired = 'true';
      button.addEventListener('click', () => { window.location.href = match[1]; });
    });
  }

  async function api(path, options) {
    const r = await fetch(path, options);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  function showModal(title, body) {
    document.querySelector('.ym-modal-backdrop')?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'ym-modal-backdrop';
    wrap.innerHTML = `<section class="ym-modal-card" role="dialog" aria-modal="true">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:14px">
        <h2 style="font:900 24px/1.2 Inter,system-ui,sans-serif;color:#191a28">${title}</h2>
        <button class="ym-close-modal" style="border:0;background:#eeecff;border-radius:999px;width:36px;height:36px;cursor:pointer"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div>${body}</div>
    </section>`;
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.ym-close-modal')) wrap.remove(); });
    document.body.appendChild(wrap);
  }

  async function exportCurrentPageCsv() {
    const rows = [['page', 'timestamp', 'url'], [document.title, new Date().toISOString(), location.href]];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `yantramitra-${currentPath.replace(/\W+/g, '-') || 'home'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function shareCurrentPage() {
    const payload = { title: document.title, text: 'YantraMitra operational view', url: location.href };
    if (navigator.share) await navigator.share(payload).catch(() => {});
    else {
      await navigator.clipboard?.writeText(location.href).catch(() => {});
      showModal('Share Link Copied', '<p class="text-on-surface-variant">The current YantraMitra view link was copied to clipboard.</p>');
    }
  }

  async function openHistoryModal() {
    const incidents = await api('/api/incidents').catch(() => []);
    const incident = incidents[0];
    showModal('Operational Timeline', incident ? `<ol style="display:grid;gap:10px">${(incident.timeline || []).map(item => `<li style="padding:10px;border:1px solid #c7c4d7;border-radius:12px"><strong>${item.t} · ${item.stage}</strong><br><span>${item.label}</span></li>`).join('')}</ol>` : '<p>No incident timeline available.</p>');
  }

  async function openCompareModal() {
    const summary = await api('/api/executive/summary').catch(() => null);
    showModal('Plant Comparison', summary ? `<div style="display:grid;gap:10px">${summary.plantRanking.map(p => `<div style="display:flex;justify-content:space-between;padding:10px;border:1px solid #c7c4d7;border-radius:12px"><strong>${p.name}</strong><span>OEE ${p.oee}% · Health ${p.avgHealth}%</span></div>`).join('')}</div>` : '<p>Comparison data unavailable.</p>');
  }

  async function openDetailsModal() {
    const incidents = await api('/api/incidents').catch(() => []);
    const i = incidents[0];
    showModal('Connected Operational Detail', i ? `<p><strong>${i.title}</strong></p><p>Stage: ${i.stage}</p><p>Machine: ${i.machine?.name}</p><p>Root cause: ${i.rootCause || 'Under investigation'}</p>` : '<p>No active operational detail found.</p>');
  }

  async function incidentAction(action) {
    const incidents = await api('/api/incidents').catch(() => []);
    if (!incidents[0]) return showModal('No Active Incident', '<p>No incident available for this action.</p>');
    const result = await api(`/api/incidents/${incidents[0].id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    }).catch(e => ({ error: e.message }));
    showModal('Workflow Updated', result.error ? `<p>${result.error}</p>` : `<p>Incident moved to <strong>${result.incident.stage}</strong>.</p>`);
  }

  async function openIncidentReplay() {
    const incidents = await api('/api/incidents').catch(() => []);
    const incident = incidents[0];
    if (!incident) return showModal('Incident Replay', '<p>No incident available to replay.</p>');
    const steps = incident.timeline || [];
    showModal('Incident Replay', `
      <p style="margin-bottom:12px;color:#464555">${incident.title} · ${incident.machine?.name || ''}</p>
      <input id="ym-replay-range" type="range" min="0" max="${Math.max(0, steps.length - 1)}" value="0" style="width:100%">
      <div id="ym-replay-step" style="margin-top:14px;padding:14px;border:1px solid #c7c4d7;border-radius:14px"></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button id="ym-replay-play" class="ym-demo-button"><span class="material-symbols-outlined">play_arrow</span>Play</button>
        <button id="ym-replay-repair" class="ym-demo-button"><span class="material-symbols-outlined">healing</span>Mark Repaired</button>
      </div>`);
    const range = document.getElementById('ym-replay-range');
    const stepEl = document.getElementById('ym-replay-step');
    const render = () => {
      const item = steps[Number(range.value)] || {};
      stepEl.innerHTML = `<strong>${item.t || ''} · ${item.stage || incident.stage}</strong><p>${item.label || incident.rootCause || 'Incident active'}</p>`;
    };
    render();
    range.addEventListener('input', render);
    document.getElementById('ym-replay-play')?.addEventListener('click', () => {
      let i = 0;
      const timer = setInterval(() => {
        range.value = String(i++);
        render();
        if (i > steps.length) clearInterval(timer);
      }, 900);
    });
    document.getElementById('ym-replay-repair')?.addEventListener('click', () => incidentAction('mark_repaired'));
  }

  async function addNotificationCenter() {
    if (shellExcludedPaths.includes(currentPath) || document.querySelector('.ym-notification-fab')) return;
    const notes = await api('/api/notifications').catch(() => []);
    const unread = notes.filter(n => n.status === 'unread').length;
    const btn = document.createElement('button');
    btn.className = 'ym-notification-fab';
    btn.innerHTML = `<span class="material-symbols-outlined">notifications</span>${unread ? `<span class="ym-badge">${unread}</span>` : ''}`;
    btn.addEventListener('click', () => {
      showModal('Notification Center', notes.length ? `<div style="display:grid;gap:10px">${notes.map(n => `<a href="${n.link || '#'}" style="display:block;text-decoration:none;color:#191a28;padding:12px;border:1px solid #c7c4d7;border-radius:12px"><strong>${n.title}</strong><p style="color:#464555;margin:4px 0 0">${n.message}</p><small>${n.priority} · ${n.status}</small></a>`).join('')}</div>` : '<p>No notifications.</p>');
    });
    document.body.appendChild(btn);
  }

  function openCommandPalette() {
    showModal('Command Palette', `<div class="ym-command-card-inner">
      <input class="ym-command-input" id="ym-command-input" placeholder="Search plants, machines, work orders, agents, pages, actions..." autofocus>
      <div id="ym-command-results" style="margin-top:12px;display:grid;gap:4px"></div>
    </div>`);
    const card = document.querySelector('.ym-modal-card');
    if (card) card.classList.add('ym-command-card');
    const input = document.getElementById('ym-command-input');
    const results = document.getElementById('ym-command-results');
    const render = async () => {
      const items = await api('/api/command-palette?q=' + encodeURIComponent(input.value)).catch(() => []);
      results.innerHTML = items.map((item, idx) => `<button class="ym-command-row" data-idx="${idx}"><span><strong>${item.label}</strong><br><small>${item.type} · ${item.detail || ''}</small></span><span class="material-symbols-outlined">arrow_forward</span></button>`).join('');
      results.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
        const item = items[Number(btn.dataset.idx)];
        if (item.action === 'runDemo') return startDemo();
        if (item.action === 'incidentReplay') return openIncidentReplay();
        if (item.href) window.location.href = item.href;
      }));
    };
    input.addEventListener('input', render);
    input.focus();
    render();
  }

  function addRunDemoButtons() {
    if (currentPath === '/') {
      const heroActions = document.querySelector('main section .flex.flex-wrap') || document.querySelector('main .flex');
      if (heroActions && !heroActions.querySelector('.ym-demo-button')) {
        const btn = document.createElement('button');
        btn.className = 'ym-demo-button';
        btn.innerHTML = '<span class="material-symbols-outlined">play_circle</span><span>Run Demo</span>';
        btn.addEventListener('click', () => startDemo());
        heroActions.appendChild(btn);
      }
    }
    if (currentPath === '/dashboard') {
      const header = document.querySelector('main header, main');
      if (header && !document.querySelector('.ym-demo-button')) {
        const btn = document.createElement('button');
        btn.className = 'ym-demo-button';
        btn.innerHTML = '<span class="material-symbols-outlined">play_circle</span><span>Run Demo</span>';
        btn.addEventListener('click', () => startDemo());
        header.appendChild(btn);
      }
    }
  }

  function startDemo() {
    localStorage.setItem('ymDemoActive', '1');
    localStorage.setItem('ymDemoIndex', '0');
    window.location.href = demoSteps[0].route;
  }

  function stopDemo() {
    localStorage.removeItem('ymDemoActive');
    localStorage.removeItem('ymDemoIndex');
    document.querySelector('.ym-demo-overlay')?.remove();
  }

  function runDemoIfActive() {
    if (localStorage.getItem('ymDemoActive') !== '1') return;
    const index = Number(localStorage.getItem('ymDemoIndex') || '0');
    const step = demoSteps[index];
    if (!step) return stopDemo();
    if (currentPath !== step.route) {
      window.location.href = step.route;
      return;
    }
    setTimeout(() => {
      const target = document.querySelector(step.target) || document.querySelector('main') || document.body;
      const rect = target.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.className = 'ym-demo-overlay';
      const cardTop = Math.min(window.innerHeight - 190, Math.max(18, rect.bottom + 16));
      overlay.innerHTML = `
        <div class="ym-demo-highlight" style="left:${Math.max(8, rect.left - 8)}px;top:${Math.max(8, rect.top - 8)}px;width:${Math.min(window.innerWidth - 16, rect.width + 16)}px;height:${Math.min(window.innerHeight - 16, rect.height + 16)}px"></div>
        <div class="ym-demo-card" style="left:${Math.min(window.innerWidth - 376, Math.max(16, rect.left))}px;top:${cardTop}px">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#413fd6;font-weight:900">Run Demo · ${index + 1}/${demoSteps.length}</p>
          <p style="margin-top:8px;color:#191a28;font-weight:800;line-height:1.35">${step.caption}</p>
          <div style="height:6px;background:#eeecff;border-radius:999px;margin-top:12px;overflow:hidden"><div style="width:${((index + 1) / demoSteps.length) * 100}%;height:100%;background:#5efae4"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:12px"><button class="ym-demo-skip" style="background:#eeecff;color:#464555">Skip</button><button class="ym-demo-next" style="background:#413fd6;color:white">Next</button></div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('.ym-demo-skip').addEventListener('click', stopDemo);
      overlay.querySelector('.ym-demo-next').addEventListener('click', () => {
        localStorage.setItem('ymDemoIndex', String(index + 1));
        if (demoSteps[index + 1]) window.location.href = demoSteps[index + 1].route;
        else stopDemo();
      });
      setTimeout(() => {
        if (localStorage.getItem('ymDemoActive') !== '1') return;
        localStorage.setItem('ymDemoIndex', String(index + 1));
        if (demoSteps[index + 1]) window.location.href = demoSteps[index + 1].route;
        else stopDemo();
      }, 11000);
    }, 700);
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    normalizeRightRail();
    addYantraNklanEntry();
    addHomeAuthActions();
    wireKnownButtons();
    addRunDemoButtons();
    addNotificationCenter();
    runDemoIfActive();
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCommandPalette();
      }
      if (e.key === 'Escape') document.querySelector('.ym-modal-backdrop')?.remove();
    });
  });
})();
