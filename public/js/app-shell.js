(function() {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    try {
      const si = document.createElement('script');
      si.src = '/_vercel/speed-insights/script.js';
      si.defer = true;
      document.head.appendChild(si);
      const va = document.createElement('script');
      va.src = '/_vercel/analytics/script.js';
      va.defer = true;
      document.head.appendChild(va);
    } catch (e) { console.debug('Vercel insights injection failed (non-critical):', e); }
  }

  const navItems = [
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard', kbd: '1', section: 'ops' },
    { path: '/map', icon: 'public', label: 'Global Map', kbd: '2', section: 'ops' },
    { path: '/assets', icon: 'precision_manufacturing', label: 'Assets', kbd: '3', section: 'ops' },
    { path: '/digital-twin', icon: 'view_in_ar', label: 'Digital Twin', kbd: '4', section: 'ops' },
    { path: '/reliability', icon: 'monitoring', label: 'Reliability', kbd: '5', section: 'ops' },
    { path: '/maintenance', icon: 'event_note', label: 'Maintenance', kbd: '6', section: 'ops' },
    { path: '/work-orders', icon: 'build', label: 'Work Orders', kbd: '7', badge: 0, section: 'ops' },
    { path: '/plans', icon: 'approval', label: 'Plans', kbd: '8', section: 'ops' },
    { path: '/agents', icon: 'smart_toy', label: 'Agents', kbd: '9', section: 'intel' },
    { path: '/anomaly', icon: 'troubleshoot', label: 'Anomaly', kbd: '0', badge: 0, section: 'intel' },
    { path: '/simulator', icon: 'science', label: 'Simulator', kbd: '-', section: 'intel' },
    { path: '/ai-console', icon: 'psychology', label: 'YantraNklan', kbd: '=', section: 'intel' },
    { path: '/settings', icon: 'settings', label: 'Settings', kbd: "'", section: 'sys' },
    { path: '#logout', icon: 'logout', label: 'Log out', section: 'sys' },
  ];
  let navBadgeData = { workOrders: 0, anomalies: 0 };

  const currentPath = window.location.pathname;
  const authPaths = ['/login', '/signup', '/reset-password'];
  const shellExcludedPaths = ['/', ...authPaths];
  const demoStorageKeys = ['ymDemoActive', 'ymDemoIndex', 'ymDemoPaused', 'ymDemoStartedAt'];
  const demoTtlMs = 8 * 60 * 1000;

  const demoSteps = [
    { route: '/dashboard', target: 'h1, .font-headline-lg', caption: 'Global command center: live KPIs, open incidents, and agent activity across Indian facilities.' },
    { route: '/map', target: 'h1, .font-headline-lg', caption: 'Map view: all five facilities are pinned at real Indian city coordinates.' },
    { route: '/plant/pune-auto', target: 'h1, .font-headline-lg', caption: 'Plant overview: drill into the Pune automotive facility before opening its live digital twin.' },
    { route: '/digital-twin', target: '#ym-twin-canvas, main', caption: '3D Digital Twin: rotate, zoom, and click faulted red machines to inspect live sensor context.' },
    { route: '/assets', target: 'h1, .font-headline-lg', caption: 'Asset fleet: compare health, status, and maintenance exposure across machines.' },
    { route: '/assets/cnc-cell-pna-01', target: 'h1, .font-headline-lg', caption: 'Asset detail: sensor traces, alarms, and linked work orders live in one view.' },
    { route: '/anomaly', target: 'h1, .font-headline-lg', caption: 'Anomaly investigation: operational context and fault evidence come together.' },
    { route: '/plans', target: 'h1, .font-headline-lg', caption: 'Plan review: approve or reject maintenance plans against current plant risk.' },
    { route: '/work-orders', target: 'h1, .font-headline-lg', caption: 'Work orders: track technician ownership and status changes.' },
    { route: '/agents', target: 'h1, .font-headline-lg', caption: 'Agent Mission Control: create and advance real persisted missions.' },
    { route: '/ai-console', target: 'input[type="text"], .chat-scroll', caption: 'YantraNklan: ask plant-aware questions, or use speech input in Chrome.' },
    { route: '/settings', target: 'h1, .font-headline-lg', caption: 'Settings: profile, notifications, team roles, integrations, and security are persisted.' },
  ];

  /* ─── Shared layout CSS ─── */
  function injectStyles() {
    if (document.getElementById('ym-shell-styles')) return;
    const style = document.createElement('style');
    style.id = 'ym-shell-styles';
    style.textContent = `
      :root { --header-height: 72px; --sidebar-width: 64px; --sidebar-gap: 16px; --status-bar-height: 26px; }

      .ym-empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:48px 24px; text-align:center; }
      .ym-empty-state .material-symbols-outlined { font-size:48px; color:#c7c4d7; margin-bottom:12px; }
      .ym-empty-state h3 { font:700 16px/1.3 Geist,system-ui,sans-serif; color:#191a28; margin-bottom:4px; }
      .ym-empty-state p { font-size:13px; color:#767586; max-width:360px; margin-bottom:16px; }
      .ym-empty-state a, .ym-empty-state button { padding:8px 20px; border-radius:8px; background:#413fd6; color:#fff; font-weight:700; font-size:12px; text-decoration:none; transition:opacity .15s; }
      .ym-empty-state a:hover, .ym-empty-state button:hover { opacity:.85; }
      .ym-nav-rail {
        position: fixed;
        top: var(--header-height);
        right: var(--sidebar-gap);
        width: var(--sidebar-width);
        max-height: calc(100vh - var(--header-height) - var(--sidebar-gap));
        overflow-y: auto;
        transform: none;
        z-index: 999;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        padding: 12px 8px;
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(18px) saturate(1.4);
        border: 1px solid rgba(229, 231, 235, 0.8);
        border-radius: 24px;
        overflow: visible;
        scrollbar-width: none;
        box-shadow: 0 8px 40px rgba(0,0,0,0.08);
      }
      .ym-nav-rail .ym-nav-section {
        display:flex; flex-direction:column; align-items:stretch; gap:2px; width:100%; padding:0 0 6px;
      }
      .ym-nav-rail .ym-nav-section + .ym-nav-section {
        margin-top:6px;
        padding-top:6px;
        position:relative;
      }
      .ym-nav-rail .ym-nav-section + .ym-nav-section::before {
        content:''; position:absolute; top:0; left:20%; right:20%;
        height:1px; background:rgba(0,0,0,0.06);
      }
      .ym-nav-rail .ym-nav-section-label {
        display:block;
        padding:0 2px 4px 2px;
        font:600 6px/1 Inter,system-ui,sans-serif;
        letter-spacing:0;
        text-transform:uppercase;
        color:#9CA3AF;
        text-align:center;
        overflow:hidden;
        white-space:nowrap;
        text-overflow:ellipsis;
      }
      .ym-nav-rail .ym-nav-link {
        position:relative;
        width:100%;
        min-height:42px;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:0;
        border-radius:8px;
        color:#6B7280;
        border:0;
        background:transparent;
        cursor:pointer;
        text-decoration:none;
        transition:all .2s cubic-bezier(.4,0,.2,1);
        flex-shrink:0;
        padding:4px 0;
      }
      .ym-nav-rail .ym-nav-link:hover {
        color:#4F46E5;
        background:rgba(79,70,229,0.06);
      }
      .ym-nav-rail .ym-nav-link.is-active {
        color:#4338CA;
        background:#EEF2FF;
        box-shadow:0 0 12px rgba(67,56,202,0.1);
      }
      .ym-nav-rail .ym-nav-link.is-active .material-symbols-outlined {
        color:#4338CA;
      }
      .ym-nav-rail .ym-nav-link .material-symbols-outlined {
        font-size:22px; line-height:1;
      }
      .ym-nav-rail .ym-nav-label {
        display:none;
      }
      .ym-nav-rail .ym-nav-badge {
        position:absolute; top:0; right:0;
        min-width:18px; height:18px;
        display:flex; align-items:center; justify-content:center;
        border-radius:9999px;
        background:linear-gradient(135deg,#ba1a1a,#e84545);
        color:#fff;
        font:700 9px/1 Inter,system-ui,sans-serif;
        padding:0 5px;
        box-shadow:0 0 0 2px rgba(255,255,255,0.9), 0 2px 8px rgba(186,26,26,0.4);
        animation:ymBadgePop .3s cubic-bezier(.34,1.56,.64,1);
      }
      @keyframes ymBadgePop { 0%{transform:scale(0)} 100%{transform:scale(1)} }
      .ym-nav-rail .ym-nav-tooltip {
        position:absolute;
        right:calc(100% + 14px);
        top:50%; transform:translateY(-50%);
        white-space:nowrap;
        background:rgba(25,26,40,0.95);
        backdrop-filter:blur(8px);
        color:#fff;
        font:500 12px/1.3 Inter,system-ui,sans-serif;
        padding:8px 14px;
        border-radius:10px;
        pointer-events:none;
        z-index:999;
        opacity:0;
        transition:opacity .2s,transform .2s;
        transform:translateY(-50%) translateX(8px);
        border:1px solid rgba(255,255,255,0.08);
        box-shadow:0 12px 32px rgba(0,0,0,0.4);
      }
      .ym-nav-rail .ym-nav-tooltip::after {
        content:''; position:absolute; right:-5px; top:50%; transform:translateY(-50%);
        border:5px solid transparent; border-left-color:rgba(25,26,40,0.95);
      }
      .ym-nav-rail .ym-nav-link:hover .ym-nav-tooltip {
        opacity:1; transform:translateY(-50%) translateX(0);
      }
      .ym-standard-topbar {
        position: fixed;
        left: 0;
        right: 0;
        top: 0;
        height: var(--header-height);
        z-index: 95;
        display: flex;
        align-items: center;
        gap: 22px;
        padding: 0 28px;
        border-bottom: 1px solid #ececec;
        background: rgba(255,255,255,.88);
        backdrop-filter: blur(18px);
        box-shadow: 0 8px 32px rgba(65,63,214,.08);
      }
      body.ym-in-app { padding-top: calc(var(--header-height) + var(--status-bar-height)); }
      body.ym-in-app > header:not(.ym-standard-topbar) { display: none !important; }

      body.ym-in-app main {
        margin-right: calc(var(--sidebar-width) + var(--sidebar-gap));
        width: auto !important;
        max-width: none !important;
        box-sizing: border-box;
      }
      body.ym-in-app .ym-page-content {
        width: 100%;
        max-width: 100%;
      }

      .ym-standard-topbar .ym-logo { height: 42px; flex: 0 0 auto; cursor: pointer; }
      .ym-standard-title {
        min-width: 140px;
        font: 900 14px/1.2 Space Grotesk, Inter, system-ui, sans-serif;
        letter-spacing: .12em;
        text-transform: uppercase;
        color: #464555;
        white-space: nowrap;
      }
      .ym-standard-search {
        flex: 1 1 420px;
        max-width: 720px;
        min-width: 180px;
        display: flex;
        align-items: center;
        gap: 10px;
        border: 1px solid rgba(199,196,215,.65);
        border-radius: 9999px;
        background: rgba(244,242,255,.72);
        padding: 10px 16px;
      }
      .ym-standard-search input {
        width: 100%;
        border: 0;
        outline: 0;
        background: transparent;
        color: #191a28;
        font: 700 15px/1.2 Inter, system-ui, sans-serif;
      }
      .ym-standard-actions {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 0 0 auto;
      }
      .ym-standard-icon {
        width: 42px; height: 42px;
        border: 0;
        border-radius: 9999px;
        background: transparent;
        color: #413fd6;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
      }
      .ym-standard-icon:hover { background: rgba(65,63,214,.1); }
      .ym-standard-avatar {
        width: 42px; height: 42px;
        border-radius: 9999px;
        border: 2px solid rgba(65,63,214,.18);
        object-fit: cover;
      }
      body.ym-in-app .primary-gradient,
      body.ym-in-app .shimmer-btn { color: #fff !important; }

      .ym-ask-yantranklan {
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
        white-space: nowrap;
      }
      header .ym-ask-yantranklan { box-shadow: 0 10px 24px rgba(65, 63, 214, .12); }
      .ym-ask-yantranklan img {
        width: 34px; height: 34px;
        border-radius: 9999px;
        object-fit: cover;
        border: 2px solid rgba(94, 250, 228, .55);
      }
      body.ym-in-app footer { display: none !important; }

      body.ym-page-map main,
      body.ym-page-simulator main,
      body.ym-page-digital-twin main {
        height: calc(100vh - var(--header-height) - var(--status-bar-height)) !important;
        padding-top: 0 !important;
      }
      body.ym-page-ai-console main {
        height: calc(100vh - var(--header-height) - var(--status-bar-height)) !important;
        padding-top: 16px !important;
      }

      .ym-page-detail-drawer {
        position: fixed;
        top: var(--header-height);
        right: calc(var(--sidebar-width) + var(--sidebar-gap));
        bottom: 0;
        width: min(460px, calc(100vw - var(--sidebar-width) - var(--sidebar-gap) - 20px));
        min-width: 360px;
        z-index: 62 !important;
      }
      @media (max-width: 1024px) {
        .ym-page-detail-drawer { width: 400px !important; }
      }
      @media (max-width: 768px) {
        .ym-page-detail-drawer { width: 100% !important; right: 0 !important; }
      }


      body:not(.ym-no-status) .ym-standard-topbar + .ym-status-bar { display:flex; }
      body.ym-no-status .ym-status-bar { display:none; }

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
        width: 280px; height: 280px;
        right: 8%; top: 20%;
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
        position: fixed; inset: 0; z-index: 120; pointer-events: none;
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
        position: fixed; inset: 0; z-index: 130;
        background: rgba(25, 26, 40, .36);
        display: flex; align-items: center; justify-content: center; padding: 18px;
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
        width: 100%; border: 0; background: transparent; text-align: left;
        display: flex; justify-content: space-between; gap: 14px;
        padding: 12px; border-radius: 12px; cursor: pointer;
      }
      .ym-command-row:hover { background: #eeecff; }

      header .ym-badge {
        position: absolute; top: -3px; right: -3px;
        min-width: 18px; height: 18px;
        border-radius: 999px;
        background: #ba1a1a; color: #fff;
        font-size: 10px;
        display: inline-flex; align-items: center; justify-content: center;
        padding: 0 4px;
      }

      .ym-home-auth {
        display: inline-flex; align-items: center; gap: 10px;
        margin-left: 10px; flex-shrink: 0; white-space: nowrap;
      }
      .ym-home-auth a {
        border-radius: 9999px; padding: 9px 14px;
        font: 700 14px/1 Inter, system-ui, sans-serif; text-decoration: none;
      }
      .ym-home-auth .ym-login { color: #413fd6; background: rgba(65, 63, 214, .09); }
      .ym-home-auth .ym-signup { color: #fff; background: #413fd6; box-shadow: 0 10px 24px rgba(65, 63, 214, .25); }

      .ym-auth-back {
        position: fixed; left: 18px; top: 18px; z-index: 90;
        display: inline-flex; align-items: center; gap: 8px;
        border: 1px solid rgba(199,196,215,.72);
        border-radius: 9999px;
        background: rgba(255,255,255,.86);
        color: #413fd6; padding: 9px 13px;
        box-shadow: 0 12px 30px rgba(65,63,214,.12);
        font: 800 13px/1 Inter, system-ui, sans-serif;
        backdrop-filter: blur(14px); cursor: pointer;
      }
      .ym-auth-back .material-symbols-outlined { font-size: 18px; }

      .ym-palette-hints {
        display: flex; gap: 18px; justify-content: center; flex-wrap: wrap;
        margin-top: 14px; padding-top: 14px;
        border-top: 1px solid rgba(199,196,215,.45);
        font: 600 12px/1 Inter, system-ui, sans-serif;
        color: #767586;
      }
      .ym-palette-hints kbd {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid rgba(199,196,215,.6);
        background: rgba(244,242,255,.6);
        font: 700 11px/1.2 Inter, system-ui, sans-serif;
        color: #464555;
        margin: 0 2px;
      }
      .ym-command-row.is-highlighted {
        background: #413fd6;
        color: #fff;
      }
      .ym-command-row.is-highlighted small,
      .ym-command-row.is-highlighted .material-symbols-outlined {
        color: rgba(255,255,255,.8);
      }
      .ym-command-row.is-highlighted strong { color: #fff; }
      .ym-palette-wrapper .ym-command-results {
        margin-top: 8px;
        display: grid;
        gap: 4px;
        max-height: 50vh;
        overflow-y: auto;
      }
      .ym-palette-wrapper .ym-command-input {
        box-sizing: border-box;
      }
      .ym-status-bar { position:fixed; top:var(--header-height); left:0; right:0; z-index:45; height:var(--status-bar-height); background:rgba(244,242,255,.85); backdrop-filter:blur(8px); border-bottom:1px solid rgba(199,196,215,.3); display:flex; align-items:center; padding:0 16px; }
      .ym-status-items { display:flex; align-items:center; gap:16px; font:500 10px/1 Inter,system-ui,sans-serif; color:#767586; overflow-x:auto; white-space:nowrap; width:100%; }
      .ym-status-item { display:inline-flex; align-items:center; gap:4px; }
      @media (max-width: 768px) {
        .ym-standard-search { display: none; }
        .ym-standard-title { min-width: auto; font-size: 11px; }
        .ym-status-bar { display:none; }
      }
      @media (max-width: 480px) {
        .ym-standard-title { display: none; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ─── Enterprise navigation rail ─── */
  function normalizeRightRail() {
    if (shellExcludedPaths.includes(currentPath)) {
      document.querySelectorAll('.ym-nav-rail').forEach(el => el.remove());
      return;
    }

    const existing = document.querySelector('.ym-nav-rail');
    if (existing) existing.remove();

    const sections = { ops: [], intel: [], sys: [] };
    navItems.forEach(item => {
      if (sections[item.section]) sections[item.section].push(item);
    });

    const sectionLabels = { ops: 'Operations', intel: 'Intelligence', sys: 'System' };

    function renderSection(items, label) {
      if (!items.length) return '';
      return `<div class="ym-nav-section"><span class="ym-nav-section-label">${label}</span>${items.map(item => {
        const active = currentPath === item.path || (item.path !== '/dashboard' && currentPath.startsWith(item.path + '/'));
        const badgeHtml = item.badge !== undefined && item.badge > 0 ? `<span class="ym-nav-badge">${item.badge > 99 ? '99+' : item.badge}</span>` : '';
        return `<a href="${item.path}" class="ym-nav-link ${active ? 'is-active' : ''}">
          <span class="ym-nav-tooltip">${item.label}${item.kbd ? ' <span style="opacity:0.5;margin-left:4px">⌘'+item.kbd+'</span>' : ''}</span>
          <span class="material-symbols-outlined">${item.icon}</span>${badgeHtml}
        </a>`;
      }).join('')}</div>`;
    }

    const rail = document.createElement('aside');
    rail.className = 'ym-nav-rail';
    rail.setAttribute('aria-label', 'YantraMitra app navigation');
    rail.innerHTML = renderSection(sections.ops, 'Operations')
      + renderSection(sections.intel, 'Intelligence')
      + renderSection(sections.sys, 'System');

    document.body.appendChild(rail);

    /* Intercept logout click */
    rail.addEventListener('click', async (e) => {
      const link = e.target.closest('[href="#logout"]');
      if (!link) return;
      e.preventDefault();
      const ok = window.confirm('Log out of YantraMitra?');
      if (!ok) return;
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
      window.location.href = '/';
    });

    /* Update badges from API */
    fetch('/api/work-orders?status=open,in_progress&_t=' + Date.now(), { credentials: 'same-origin' }).then(r => r.json()).then(orders => {
      if (Array.isArray(orders)) {
        const open = orders.filter(o => o.status === 'open' || o.status === 'in_progress').length;
        const badge = rail.querySelector(`.ym-nav-link[href="/work-orders"] .ym-nav-badge`);
        if (badge) { badge.textContent = open > 99 ? '99+' : open; badge.style.display = open > 0 ? 'flex' : 'none'; }
      }
    }).catch(() => {});
    fetch('/api/alarms?status=active&_t=' + Date.now(), { credentials: 'same-origin' }).then(r => r.json()).then(alarms => {
      if (Array.isArray(alarms) && alarms.length) {
        const badge = rail.querySelector(`.ym-nav-link[href="/anomaly"] .ym-nav-badge`);
        if (badge) { badge.textContent = alarms.length > 99 ? '99+' : alarms.length; badge.style.display = alarms.length > 0 ? 'flex' : 'none'; }
      }
    }).catch(() => {});
  }

  function pageTitle() {
    const map = {
      '/dashboard': 'Global Command',
      '/map': 'Plant Network',
      '/assets': 'Asset Fleet',
      '/digital-twin': 'Digital Twin',
      '/reliability': 'Reliability Forecast',
      '/maintenance': 'Maintenance Planner',
      '/work-orders': 'Work Orders',
      '/plans': 'Plan Review',
      '/agents': 'Mission Control',
      '/anomaly': 'Anomaly Investigation',
      '/simulator': 'Scenario Simulator',
      '/ai-console': 'AI Operations',
      '/settings': 'Settings'
    };
    if (currentPath.startsWith('/plant/')) return 'Plant Overview';
    if (currentPath.startsWith('/assets/')) return 'Asset Detail';
    return map[currentPath] || document.title.replace(/\s*\|\s*YantraMitra.*/i, '') || 'Ops Intel';
  }

  function normalizeTopBar() {
    if (shellExcludedPaths.includes(currentPath)) return;
    document.querySelector('.ym-standard-topbar')?.remove();
    const header = document.createElement('header');
    header.className = 'ym-standard-topbar';
    header.innerHTML = `
      <img class="ym-logo" src="/assets/logos/logo.svg" alt="YantraMitra">
      <div class="ym-standard-title">${pageTitle()}</div>
      <label class="ym-standard-search">
        <span class="material-symbols-outlined">search</span>
        <input type="search" placeholder="Search operations, assets, agents... (⌘K)" aria-label="Search operations">
      </label>
      <div class="ym-standard-actions">
        <a class="ym-ask-yantranklan" href="/ai-console"><img src="/assets/images/yantranklan-avatar-ai.jpg" alt="YantraNklan"><span>Ask YantraNklan</span></a>
        <button type="button" class="ym-standard-icon" data-ym-notifications aria-label="Notifications"><span class="material-symbols-outlined">notifications</span></button>
        <button type="button" class="ym-standard-icon" data-ym-factory aria-label="Plant map"><span class="material-symbols-outlined">factory</span></button>
        <img class="ym-standard-avatar" src="/assets/images/ym-operator-avatar.jpg" alt="Profile">
      </div>`;
    document.body.prepend(header);
    header.querySelector('.ym-logo').addEventListener('click', () => { window.location.href = '/dashboard'; });
    header.querySelector('[data-ym-factory]').addEventListener('click', () => { window.location.href = '/map'; });
    header.querySelector('.ym-standard-avatar').addEventListener('click', () => { window.location.href = '/settings'; });
    header.querySelector('input').addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.currentTarget.value.trim()) openCommandPalette();
    });

    // Enterprise Status Bar
    if (!shellExcludedPaths.includes(currentPath) && !document.querySelector('.ym-status-bar') && currentPath !== '/' && currentPath !== '/login' && currentPath !== '/signup' && currentPath !== '/reset-password' && currentPath !== '/onboarding') {
      const bar = document.createElement('div');
      bar.className = 'ym-status-bar';
      bar.innerHTML = `<div class="ym-status-items"><span class="ym-status-item" style="color:#006b5f"><span class="w-1.5 h-1.5 rounded-full bg-secondary" style="display:inline-block;margin-right:4px;vertical-align:middle"></span>Production</span><span class="ym-status-item">AI: Llama 3.3 70B</span><span class="ym-status-item" id="ym-status-plants">Plants: —</span><span class="ym-status-item" id="ym-status-devices">Devices: —</span><span class="ym-status-item" id="ym-status-uptime">Uptime: —</span><span class="ym-status-item">Last Sync: <span id="ym-status-sync">just now</span></span></div>`;
      document.body.appendChild(bar);
      fetch('/api/plants').then(r => r.json()).then(ps => {
        document.getElementById('ym-status-plants').textContent = 'Plants: ' + (ps?.length || 0);
        let devices = 0;
        ps?.forEach(p => { if (p.machines) devices += p.machines.length; });
        document.getElementById('ym-status-devices').textContent = 'Devices: ' + (devices || '—');
      }).catch(() => {});
      fetch('/api/dashboard/summary').then(r => r.json()).then(d => {
        if (d?.uptime) document.getElementById('ym-status-uptime').textContent = 'Uptime: ' + d.uptime + '%';
      }).catch(() => {});
      setInterval(() => {
        const el = document.getElementById('ym-status-sync');
        if (el) el.textContent = new Date().toLocaleTimeString();
      }, 30000);
    }
  }

  function cleanupInAppChrome() {
    if (shellExcludedPaths.includes(currentPath)) return;
    document.querySelectorAll('footer').forEach(footer => { footer.style.display = 'none'; });
    document.querySelectorAll('.ym-notification-fab').forEach(el => el.remove());
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
  }

  function wireLogoAndBackNavigation() {
    const logo = document.querySelector('img[src="/assets/logos/logo.svg"]');
    const isAuthPath = authPaths.includes(currentPath) || currentPath === '/onboarding';

    if (logo) {
      const anchor = logo.closest('a');
      if (currentPath === '/') {
        if (anchor) anchor.setAttribute('href', '#top');
      } else if (isAuthPath) {
        if (anchor) { anchor.setAttribute('href', '/'); }
        else { logo.style.cursor = 'pointer'; logo.addEventListener('click', () => { window.location.href = '/'; }); }
      } else if (!shellExcludedPaths.includes(currentPath)) {
        if (anchor) { anchor.setAttribute('href', '/dashboard'); }
        else { logo.style.cursor = 'pointer'; logo.addEventListener('click', () => { window.location.href = '/dashboard'; }); }
      }
    }

    if (isAuthPath && !document.querySelector('.ym-auth-back')) {
      const back = document.createElement('button');
      back.className = 'ym-auth-back';
      back.type = 'button';
      back.innerHTML = '<span class="material-symbols-outlined">arrow_back</span><span>Go Back</span>';
      back.addEventListener('click', () => {
        if (history.length > 1) history.back();
        else window.location.href = '/';
      });
      document.body.appendChild(back);
    }
  }

  /* ─── Button wiring (unchanged) ─── */
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
      if (/export|download/i.test(text)) { button.dataset.ymWired = 'true'; button.addEventListener('click', exportCurrentPageCsv); return; }
      if (/share/i.test(text)) { button.dataset.ymWired = 'true'; button.addEventListener('click', shareCurrentPage); return; }
      if (/history|timeline/i.test(text)) { button.dataset.ymWired = 'true'; button.addEventListener('click', openHistoryModal); return; }
      if (/replay/i.test(text)) { button.dataset.ymWired = 'true'; button.addEventListener('click', openIncidentReplay); return; }
      if (/compare/i.test(text)) { button.dataset.ymWired = 'true'; button.addEventListener('click', openCompareModal); return; }
      if (/details/i.test(text) && !/open\s+maintenance/i.test(lower) && !button.closest('.agent-card')) {
        button.dataset.ymWired = 'true';
        button.addEventListener('click', async function() {
          const card = this.closest('[id^="plan-"]');
          if (card) { card.classList.toggle('expanded'); const chevron = card.querySelector('.chevron'); if (chevron) chevron.style.transform = card.classList.contains('expanded') ? 'rotate(180deg)' : 'rotate(0deg)'; }
          else { openDetailsModal(); }
        });
        return;
      }
      if (/open/i.test(text) && !/open\s+maintenance/i.test(lower) && button.closest('.plan-card, [id^="plan-"]')) {
        button.dataset.ymWired = 'true';
        button.addEventListener('click', function() {
          const card = this.closest('[id^="plan-"]');
          if (card) { card.classList.toggle('expanded'); const chevron = card.querySelector('.chevron'); if (chevron) chevron.style.transform = card.classList.contains('expanded') ? 'rotate(180deg)' : 'rotate(0deg)'; }
        });
        return;
      }
      if (/approve/i.test(text)) { button.dataset.ymWired = 'true'; button.addEventListener('click', () => incidentAction('approve_plan')); return; }
      if (/reject/i.test(text)) { button.dataset.ymWired = 'true'; button.addEventListener('click', () => showModal('Decision Logged', '<p class="text-on-surface-variant">Rejection recorded in the review workflow. A revised plan can be generated from the incident replay.</p>')); return; }
      if (!button.closest('.agent-card') && /deploy scenario|advance state|auto-resolve|re-scan|latest snapshot|clear filters|restart/i.test(text)) {
        button.dataset.ymWired = 'true';
        button.addEventListener('click', () => {
          if (/deploy scenario/i.test(text)) { window.location.href = '/simulator'; return; }
          showModal('Action Registered', '<p class="text-on-surface-variant">YantraMitra recorded <strong>' + (text || 'this action') + '</strong> in the live operations workflow.</p>');
        });
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
    wrap.innerHTML = '<section class="ym-modal-card" role="dialog" aria-modal="true"><div style="display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:14px"><h2 style="font:900 24px/1.2 Inter,system-ui,sans-serif;color:#191a28">' + title + '</h2><button class="ym-close-modal" style="border:0;background:#eeecff;border-radius:999px;width:36px;height:36px;cursor:pointer"><span class="material-symbols-outlined">close</span></button></div><div>' + body + '</div></section>';
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.ym-close-modal')) wrap.remove(); });
    document.body.appendChild(wrap);
  }

  async function exportCurrentPageCsv() {
    const rows = [['page', 'timestamp', 'url'], [document.title, new Date().toISOString(), location.href]];
    const csv = rows.map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'yantramitra-' + (currentPath.replace(/\W+/g, '-') || 'home') + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function shareCurrentPage() {
    const payload = { title: document.title, text: 'YantraMitra operational view', url: location.href };
    if (navigator.share) await navigator.share(payload).catch(() => {});
    else { await navigator.clipboard?.writeText(location.href).catch(() => {}); showModal('Share Link Copied', '<p class="text-on-surface-variant">The current YantraMitra view link was copied to clipboard.</p>'); }
  }

  async function openHistoryModal() {
    const incidents = await api('/api/incidents').catch(() => []);
    const incident = incidents[0];
    showModal('Operational Timeline', incident ? '<ol style="display:grid;gap:10px">' + (incident.timeline || []).map(item => '<li style="padding:10px;border:1px solid #c7c4d7;border-radius:12px"><strong>' + item.t + ' · ' + item.stage + '</strong><br><span>' + item.label + '</span></li>').join('') + '</ol>' : '<p>No incident timeline available.</p>');
  }

  async function openCompareModal() {
    const summary = await api('/api/executive/summary').catch(() => null);
    showModal('Plant Comparison', summary ? '<div style="display:grid;gap:10px">' + summary.plantRanking.map(p => '<div style="display:flex;justify-content:space-between;padding:10px;border:1px solid #c7c4d7;border-radius:12px"><strong>' + p.name + '</strong><span>OEE ' + p.oee + '% · Health ' + p.avgHealth + '%</span></div>').join('') + '</div>' : '<p>Comparison data unavailable.</p>');
  }

  async function openDetailsModal() {
    const incidents = await api('/api/incidents').catch(() => []);
    const i = incidents[0];
    showModal('Connected Operational Detail', i ? '<p><strong>' + i.title + '</strong></p><p>Stage: ' + i.stage + '</p><p>Machine: ' + (i.machine?.name || '') + '</p><p>Root cause: ' + (i.rootCause || 'Under investigation') + '</p>' : '<p>No active operational detail found.</p>');
  }

  async function incidentAction(action) {
    const incidents = await api('/api/incidents').catch(() => []);
    if (!incidents[0]) return showModal('No Active Incident', '<p>No incident available for this action.</p>');
    const result = await api('/api/incidents/' + incidents[0].id + '/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }).catch(e => ({ error: e.message }));
    showModal('Workflow Updated', result.error ? '<p>' + result.error + '</p>' : '<p>Incident moved to <strong>' + result.incident.stage + '</strong>.</p>');
  }

  async function openIncidentReplay() {
    const incidents = await api('/api/incidents').catch(() => []);
    const incident = incidents[0];
    if (!incident) return showModal('Incident Replay', '<p>No incident available to replay.</p>');
    const steps = incident.timeline || [];
    showModal('Incident Replay', '<p style="margin-bottom:12px;color:#464555">' + incident.title + ' · ' + (incident.machine?.name || '') + '</p><input id="ym-replay-range" type="range" min="0" max="' + Math.max(0, steps.length - 1) + '" value="0" style="width:100%"><div id="ym-replay-step" style="margin-top:14px;padding:14px;border:1px solid #c7c4d7;border-radius:14px"></div><div style="display:flex;gap:8px;margin-top:12px"><button id="ym-replay-play" class="ym-demo-button"><span class="material-symbols-outlined">play_arrow</span>Play</button><button id="ym-replay-repair" class="ym-demo-button"><span class="material-symbols-outlined">healing</span>Mark Repaired</button></div>');
    const range = document.getElementById('ym-replay-range');
    const stepEl = document.getElementById('ym-replay-step');
    const render = () => { const item = steps[Number(range.value)] || {}; stepEl.innerHTML = '<strong>' + (item.t || '') + ' · ' + (item.stage || incident.stage) + '</strong><p>' + (item.label || incident.rootCause || 'Incident active') + '</p>'; };
    render();
    range.addEventListener('input', render);
    document.getElementById('ym-replay-play')?.addEventListener('click', () => { let i = 0; const timer = setInterval(() => { range.value = String(i++); render(); if (i > steps.length) clearInterval(timer); }, 900); });
    document.getElementById('ym-replay-repair')?.addEventListener('click', () => incidentAction('mark_repaired'));
  }

  async function addNotificationCenter() {
    if (shellExcludedPaths.includes(currentPath)) return;
    const notes = await api('/api/notifications').catch(() => []);
    const unread = notes.filter(n => n.status === 'unread').length;
    const existingButtons = Array.from(document.querySelectorAll('header button, header a')).filter(el => {
      const icon = el.querySelector('.material-symbols-outlined') || (el.classList?.contains('material-symbols-outlined') ? el : null);
      return icon?.textContent.trim() === 'notifications' || el.hasAttribute('data-ym-notifications');
    });
    const btn = existingButtons[0] || document.createElement('button');
    if (!existingButtons.length) { btn.type = 'button'; btn.className = 'material-symbols-outlined text-primary p-2 hover:bg-primary/10 rounded-full transition-colors'; btn.textContent = 'notifications'; document.querySelector('header')?.appendChild(btn); }
    if (unread && !btn.querySelector('.ym-badge')) { btn.style.position = 'relative'; btn.insertAdjacentHTML('beforeend', '<span class="ym-badge">' + unread + '</span>'); }
    existingButtons.slice(1).forEach(el => { el.style.display = 'none'; });
    btn.addEventListener('click', event => {
      event.preventDefault();
      showModal('Notification Center', notes.length ? '<div style="display:grid;gap:10px">' + notes.map(n => '<a href="' + (n.link || '#') + '" style="display:block;text-decoration:none;color:#191a28;padding:12px;border:1px solid #c7c4d7;border-radius:12px"><strong>' + n.title + '</strong><p style="color:#464555;margin:4px 0 0">' + n.message + '</p><small>' + n.priority + ' · ' + n.status + '</small></a>').join('') + '</div>' : '<p>No notifications.</p>');
    });
  }

  function openCommandPalette() {
    if (document.querySelector('.ym-palette-wrapper')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'ym-palette-wrapper ym-modal-backdrop';
    wrapper.innerHTML = `
      <div class="ym-modal-card ym-command-card" role="dialog" aria-modal="true" aria-label="Command palette">
        <input class="ym-command-input" id="ym-command-input" placeholder="Search plants, machines, work orders, agents, pages, actions..." autofocus>
        <div class="ym-command-results" id="ym-command-results"></div>
        <div class="ym-palette-hints">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>`;
    wrapper.addEventListener('click', function(e) { if (e.target === wrapper) wrapper.remove(); });
    document.body.appendChild(wrapper);

    const input = wrapper.querySelector('#ym-command-input');
    const results = wrapper.querySelector('#ym-command-results');
    let highlightedIndex = -1;
    let items = [];

    async function render() {
      items = await api('/api/command-palette?q=' + encodeURIComponent(input.value)).catch(() => []);
      highlightedIndex = items.length > 0 ? 0 : -1;
      if (items.length === 0) {
        results.innerHTML = '<div style="padding:16px;text-align:center;color:#767586;font-weight:600">No results found</div>';
        return;
      }
      results.innerHTML = items.map(function(item, idx) {
        return '<button class="ym-command-row' + (idx === 0 ? ' is-highlighted' : '') + '" data-idx="' + idx + '"><span><strong>' + item.label + '</strong><br><small>' + item.type + ' · ' + (item.detail || '') + '</small></span><span class="material-symbols-outlined">arrow_forward</span></button>';
      }).join('');
      results.querySelectorAll('button').forEach(function(btn) {
        btn.addEventListener('click', function() { executeCommand(items[Number(btn.dataset.idx)]); });
        btn.addEventListener('mouseenter', function() {
          highlightedIndex = Number(btn.dataset.idx);
          results.querySelectorAll('.ym-command-row').forEach(function(b, i) { b.classList.toggle('is-highlighted', i === highlightedIndex); });
        });
      });
    }

    function executeCommand(item) {
      if (!item) return;
      wrapper.remove();
      if (item.action === 'runDemo') return startDemo();
      if (item.action === 'incidentReplay') return openIncidentReplay();
      if (item.href) window.location.href = item.href;
    }

    function highlightAdjacent(delta) {
      if (items.length === 0) return;
      highlightedIndex = Math.max(0, Math.min(items.length - 1, highlightedIndex + delta));
      results.querySelectorAll('.ym-command-row').forEach(function(b, i) { b.classList.toggle('is-highlighted', i === highlightedIndex); });
      var el = results.querySelector('.is-highlighted');
      if (el) el.scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('input', render);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); highlightAdjacent(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlightAdjacent(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); executeCommand(items[highlightedIndex]); }
      else if (e.key === 'Escape') { wrapper.remove(); }
    });

    input.focus();
    render();
  }

  function addRunDemoButtons() {
    if (currentPath === '/dashboard' && !document.body.hasAttribute('data-no-demo')) {
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
    localStorage.setItem('ymDemoStartedAt', String(Date.now()));
    localStorage.removeItem('ymDemoPaused');
    window.location.href = demoSteps[0].route;
  }

  function stopDemo() {
    demoStorageKeys.forEach(key => localStorage.removeItem(key));
    document.querySelector('.ym-demo-overlay')?.remove();
  }

  function isPublicEntryPath(pathname) {
    return shellExcludedPaths.includes(pathname) || pathname === '/onboarding';
  }

  function isDemoSessionFresh() {
    const startedAt = Number(localStorage.getItem('ymDemoStartedAt') || '0');
    return Number.isFinite(startedAt) && startedAt > 0 && Date.now() - startedAt < demoTtlMs;
  }

  function advanceDemo(index) {
    if (localStorage.getItem('ymDemoActive') !== '1') return;
    if (!isDemoSessionFresh()) return stopDemo();
    if (localStorage.getItem('ymDemoPaused') === '1') return;
    localStorage.setItem('ymDemoIndex', String(index + 1));
    if (demoSteps[index + 1]) window.location.href = demoSteps[index + 1].route;
    else stopDemo();
  }

  function runDemoIfActive() {
    if (isPublicEntryPath(currentPath)) { if (localStorage.getItem('ymDemoActive') === '1') stopDemo(); return; }
    if (localStorage.getItem('ymDemoActive') !== '1') return;
    if (!isDemoSessionFresh()) return stopDemo();
    const index = Number(localStorage.getItem('ymDemoIndex') || '0');
    if (!Number.isInteger(index) || index < 0) return stopDemo();
    const step = demoSteps[index];
    if (!step) return stopDemo();
    if (currentPath !== step.route) { window.location.href = step.route; return; }
    setTimeout(() => {
      const target = document.querySelector(step.target) || document.querySelector('main') || document.body;
      const rect = target.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.className = 'ym-demo-overlay';
      const cardTop = Math.min(window.innerHeight - 190, Math.max(18, rect.bottom + 16));
      overlay.innerHTML = '<div class="ym-demo-highlight" style="left:' + Math.max(8, rect.left - 8) + 'px;top:' + Math.max(8, rect.top - 8) + 'px;width:' + Math.min(window.innerWidth - 16, rect.width + 16) + 'px;height:' + Math.min(window.innerHeight - 16, rect.height + 16) + 'px"></div><div class="ym-demo-card" style="left:' + Math.min(window.innerWidth - 376, Math.max(16, rect.left)) + 'px;top:' + cardTop + 'px"><p style="font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#413fd6;font-weight:900">Run Demo · ' + (index + 1) + '/' + demoSteps.length + '</p><p style="margin-top:8px;color:#191a28;font-weight:800;line-height:1.35">' + step.caption + '</p><div style="height:6px;background:#eeecff;border-radius:999px;margin-top:12px;overflow:hidden"><div style="width:' + ((index + 1) / demoSteps.length) * 100 + '%;height:100%;background:#5efae4"></div></div><div style="display:flex;justify-content:space-between;gap:8px;margin-top:12px"><button class="ym-demo-skip" style="background:#eeecff;color:#464555">Skip</button><button class="ym-demo-pause" style="background:#eeecff;color:#413fd6">' + (localStorage.getItem('ymDemoPaused') === '1' ? 'Resume' : 'Pause') + '</button><button class="ym-demo-next" style="background:#413fd6;color:white">Next</button></div></div>';
      document.body.appendChild(overlay);
      overlay.querySelector('.ym-demo-skip').addEventListener('click', stopDemo);
      overlay.querySelector('.ym-demo-pause').addEventListener('click', event => {
        const paused = localStorage.getItem('ymDemoPaused') === '1';
        if (paused) { localStorage.removeItem('ymDemoPaused'); event.currentTarget.textContent = 'Pause'; setTimeout(() => advanceDemo(index), 11000); }
        else { localStorage.setItem('ymDemoPaused', '1'); event.currentTarget.textContent = 'Resume'; }
      });
      overlay.querySelector('.ym-demo-next').addEventListener('click', () => { localStorage.removeItem('ymDemoPaused'); advanceDemo(index); });
      setTimeout(() => advanceDemo(index), 11000);
    }, 700);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!shellExcludedPaths.includes(currentPath)) {
      document.body.classList.add('ym-in-app');
      const slug = (currentPath.replace(/^\/+/, '') || 'dashboard').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
      document.body.classList.add('ym-page-' + slug);
    }
    if (currentPath === '/digital-twin') document.body.classList.add('ym-digital-twin');
    injectStyles();
    normalizeTopBar();
    normalizeRightRail();
    cleanupInAppChrome();
    wireLogoAndBackNavigation();
    addHomeAuthActions();
    wireKnownButtons();
    addRunDemoButtons();
    addNotificationCenter();
    runDemoIfActive();
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCommandPalette(); }
      if (e.key === 'Escape') document.querySelector('.ym-modal-backdrop')?.remove();
      if (e.key === '/' && !e.target.closest('input, textarea, [contenteditable]')) { e.preventDefault(); openCommandPalette(); }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const keyMap = { '1':0,'2':1,'3':2,'4':3,'5':4,'6':5,'7':6,'8':7,'9':8,'0':9,'-':10,'=':11,"'":12 };
        const idx = keyMap[e.key];
        if (idx !== undefined && navItems[idx]) {
          e.preventDefault();
          window.location.href = navItems[idx].path;
        }
      }
    });
  });
})();
