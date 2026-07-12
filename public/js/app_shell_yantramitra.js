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
        width: 280px;
        z-index: 70;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        padding: 14px 8px;
        border: 1px solid rgba(199, 196, 215, .6);
        border-radius: 28px;
        background: rgba(255, 255, 255, .78);
        backdrop-filter: blur(18px);
        box-shadow: 0 18px 48px rgba(65, 63, 214, .18);
        overflow-y: auto;
        pointer-events: auto;
        scrollbar-width: none;
        transition: width .3s ease, transform .3s ease, opacity .3s ease, box-shadow .3s ease;
      }
      .ym-shell-rail-toggle {
        position: fixed;
        right: 16px;
        top: 88px;
        z-index: 80;
        width: 40px;
        height: 40px;
        border: 1px solid rgba(199, 196, 215, .72);
        border-radius: 9999px;
        background: rgba(255, 255, 255, .96);
        color: #413fd6;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 12px 32px rgba(65, 63, 214, .20);
        cursor: pointer;
        font-size: 20px;
        font-weight: 900;
        line-height: 1;
        transition: right .3s ease, transform .3s ease;
      }
      .ym-shell-rail-toggle:hover {
        background: rgba(65, 63, 214, .10);
      }
      body.ym-rail-collapsed .ym-shell-rail {
        width: 88px;
        transform: translateX(0);
        opacity: 1;
      }
      body.ym-rail-collapsed .ym-shell-rail a,
      body.ym-rail-collapsed .ym-shell-rail button:not(.ym-shell-logout) {
        justify-content: center;
        padding-inline: 0;
      }
      body.ym-rail-collapsed .ym-shell-rail .ym-shell-label,
      body.ym-rail-collapsed .ym-shell-rail .ym-shell-pill {
        display: none;
      }
      body.ym-rail-collapsed main {
        margin-right: 104px !important;
        padding-right: 16px !important;
        max-width: calc(100vw - 104px);
      }
      body.ym-in-app main {
        margin-right: 328px !important;
        padding-right: 0 !important;
        max-width: calc(100vw - 328px);
        transition: margin-right .3s ease, max-width .3s ease, padding-right .3s ease;
        width: auto !important;
        box-sizing: border-box;
      }
      body.ym-in-app .ym-page-content {
        width: 100%;
        max-width: 100%;
        transition: width .3s ease, max-width .3s ease, padding .3s ease;
      }
      .ym-standard-topbar {
        position: fixed;
        left: 0;
        right: 0;
        top: 0;
        height: 72px;
        z-index: 95;
        display: flex;
        align-items: center;
        gap: 22px;
        padding: 0 28px;
        border-bottom: 1px solid rgba(199,196,215,.36);
        background: rgba(255,255,255,.88);
        backdrop-filter: blur(18px);
        box-shadow: 0 8px 32px rgba(65,63,214,.08);
      }
      body.ym-in-app { padding-top: 72px; }
      body.ym-in-app > header:not(.ym-standard-topbar) { display: none !important; }
      .ym-standard-topbar .ym-logo { height: 42px; flex: 0 0 auto; cursor: pointer; }
      .ym-standard-title {
        min-width: 180px;
        font: 900 14px/1.2 Space Grotesk, Inter, system-ui, sans-serif;
        letter-spacing: .12em;
        text-transform: uppercase;
        color: #464555;
        white-space: nowrap;
      }
      .ym-standard-search {
        flex: 1 1 420px;
        max-width: 720px;
        min-width: 240px;
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
        gap: 12px;
        flex: 0 0 auto;
      }
      .ym-standard-icon {
        width: 42px;
        height: 42px;
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
        width: 42px;
        height: 42px;
        border-radius: 9999px;
        border: 2px solid rgba(65,63,214,.18);
        object-fit: cover;
        cursor: pointer;
      }
      body.ym-in-app .primary-gradient,
      body.ym-in-app .shimmer-btn {
        color: #fff !important;
      }
      .ym-shell-rail::-webkit-scrollbar { display: none; }
      .ym-shell-rail a,
      .ym-shell-rail button {
        width: 100%;
        min-height: 44px;
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        gap: 12px;
        padding: 0 12px;
        border-radius: 9999px;
        color: #464555;
        border: 0;
        background: transparent;
        cursor: pointer;
        text-decoration: none;
        transition: transform .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease;
      }
      .ym-shell-rail a:hover,
      .ym-shell-rail button:hover {
        transform: translateY(-1px) scale(1.01);
        background: rgba(65, 63, 214, .10);
        color: #413fd6;
      }
      .ym-shell-label {
        font: 700 12px/1 Inter, system-ui, sans-serif;
        letter-spacing: .02em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .ym-shell-pill {
        margin-left: auto;
        padding: 3px 7px;
        border-radius: 999px;
        background: rgba(65, 63, 214, .10);
        color: #413fd6;
        font: 900 9px/1 Space Grotesk, Inter, system-ui, sans-serif;
        letter-spacing: .08em;
      }
      .ym-shell-toggle {
        margin-bottom: 4px;
        background: rgba(255, 255, 255, .94);
        border: 1px solid rgba(199, 196, 215, .72);
        box-shadow: 0 10px 24px rgba(65, 63, 214, .12);
        position: relative;
        z-index: 2;
        font-size: 20px;
        font-weight: 900;
        line-height: 1;
      }
      .ym-shell-rail a.is-active {
        background: #413fd6;
        color: #fff;
        box-shadow: 0 10px 24px rgba(65, 63, 214, .34);
      }
      .ym-shell-rail .material-symbols-outlined { font-size: 23px; line-height: 1; }
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
      header .ym-ask-yantranklan {
        box-shadow: 0 10px 24px rgba(65, 63, 214, .12);
      }
      body.ym-in-app footer {
        display: none !important;
      }
      body.ym-page-ai-console main {
        height: calc(100vh - 72px) !important;
        padding-top: 16px !important;
      }
      body.ym-page-ai-console .chat-scroll {
        padding-top: 12px !important;
        padding-bottom: 12px !important;
      }
      body.ym-page-settings main,
      body.ym-page-anomaly main,
      body.ym-page-plans main,
      body.ym-page-work-orders main {
        padding-top: 28px !important;
      }
      body.ym-page-map main,
      body.ym-page-simulator main {
        height: calc(100vh - 72px) !important;
        padding-top: 0 !important;
      }
      body.ym-page-content main {
        padding-right: 0 !important;
        width: 100% !important;
      }
      .ym-page-detail-drawer {
        position: fixed;
        top: 72px;
        right: 104px;
        bottom: 0;
        width: min(460px, calc(100vw - 420px));
        min-width: 360px;
        z-index: 62 !important;
        transition: right .3s ease, width .3s ease;
      }
      body.ym-rail-collapsed .ym-page-detail-drawer {
        right: 24px !important;
      }
      @media (max-width: 1024px) {
        .ym-page-detail-drawer { width: 400px !important; }
      }
      @media (max-width: 768px) {
        .ym-page-detail-drawer { width: 100% !important; right: 0 !important; }
        body.ym-rail-collapsed .ym-page-detail-drawer { right: 0 !important; }
      }
      body.ym-digital-twin .ym-shell-rail {
        z-index: 80;
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
      header .ym-badge {
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
      .ym-auth-back {
        position: fixed;
        left: 18px;
        top: 18px;
        z-index: 90;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(199,196,215,.72);
        border-radius: 9999px;
        background: rgba(255,255,255,.86);
        color: #413fd6;
        padding: 9px 13px;
        box-shadow: 0 12px 30px rgba(65,63,214,.12);
        font: 800 13px/1 Inter, system-ui, sans-serif;
        backdrop-filter: blur(14px);
        cursor: pointer;
      }
      .ym-auth-back .material-symbols-outlined { font-size: 18px; }
      @media (max-width: 900px) {
        .ym-shell-rail { right: 8px; top: auto; left: 8px; bottom: 8px; width: auto; height: 64px; flex-direction: row; border-radius: 9999px; overflow-x: auto; overflow-y: hidden; }
        header .ym-ask-yantranklan span { display: none; }
        header .ym-ask-yantranklan { padding: 6px; }
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
      const pill = item.path === '/ai-console' ? '<span class="ym-shell-pill">AI</span>' : '';
      return `<a href="${item.path}" title="${item.label}" aria-label="${item.label}" class="${active ? 'is-active' : ''}">
        <span class="material-symbols-outlined">${item.icon}</span>
        <span class="ym-shell-label">${item.label}</span>
        ${pill}
      </a>`;
    }).join('') + `<button type="button" class="ym-shell-logout" title="Log out" aria-label="Log out"><span class="material-symbols-outlined">logout</span><span class="ym-shell-label">Log out</span></button>`;
    rail.querySelector('.ym-shell-logout').addEventListener('click', async () => {
      const ok = window.confirm('Log out of YantraMitra?');
      if (!ok) return;
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
      window.location.href = '/login';
    });

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ym-shell-rail-toggle';
    toggle.title = 'Hide sidebar';
    toggle.setAttribute('aria-label', 'Hide sidebar');
    toggle.textContent = '‹';
    const setRailState = () => {
      const collapsed = document.body.classList.contains('ym-rail-collapsed');
      toggle.title = collapsed ? 'Open sidebar' : 'Hide sidebar';
      toggle.setAttribute('aria-label', collapsed ? 'Open sidebar' : 'Hide sidebar');
      toggle.textContent = collapsed ? '›' : '‹';
    };
    if (localStorage.getItem('ymRailExpanded') !== '1') document.body.classList.add('ym-rail-collapsed');
    setRailState();
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('ym-rail-collapsed');
      localStorage.setItem('ymRailExpanded', document.body.classList.contains('ym-rail-collapsed') ? '0' : '1');
      setRailState();
    });

    existingRails.slice(1).forEach(el => { el.style.display = 'none'; });
    if (!rail.parentNode) document.body.appendChild(rail);
    if (!toggle.parentNode) document.body.appendChild(toggle);
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
      <img class="ym-logo" src="/logo.svg" alt="YantraMitra">
      <div class="ym-standard-title">${pageTitle()}</div>
      <label class="ym-standard-search">
        <span class="material-symbols-outlined">search</span>
        <input type="search" placeholder="Search operations, assets, agents... (⌘K)" aria-label="Search operations">
      </label>
      <div class="ym-standard-actions">
        <a class="ym-ask-yantranklan" href="/ai-console"><img src="/images/yantranklan-avatar-ai.jpg" alt="YantraNklan"><span>Ask YantraNklan</span></a>
        <button type="button" class="ym-standard-icon" data-ym-notifications aria-label="Notifications"><span class="material-symbols-outlined">notifications</span></button>
        <button type="button" class="ym-standard-icon" data-ym-factory aria-label="Plant map"><span class="material-symbols-outlined">factory</span></button>
        <img class="ym-standard-avatar" src="/images/ym-operator-avatar.jpg" alt="Profile">
      </div>`;
    document.body.prepend(header);
    header.querySelector('.ym-logo').addEventListener('click', () => { window.location.href = '/dashboard'; });
    header.querySelector('[data-ym-factory]').addEventListener('click', () => { window.location.href = '/map'; });
    header.querySelector('.ym-standard-avatar').addEventListener('click', () => { window.location.href = '/settings'; });
    header.querySelector('input').addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.currentTarget.value.trim()) openCommandPalette();
    });
  }

  function addYantraNklanEntry() {
    if (shellExcludedPaths.includes(currentPath)) return;
    if (document.querySelector('.ym-standard-topbar')) return;
    if (document.querySelector('.ym-ask-yantranklan') || currentPath === '/ai-console') return;
    const link = document.createElement('a');
    link.href = '/ai-console';
    link.className = 'ym-ask-yantranklan';
    link.innerHTML = '<img src="/images/yantranklan-avatar-ai.jpg" alt="YantraNklan"><span>Ask YantraNklan</span>';
    const header = document.querySelector('header');
    const headerActions = header ? Array.from(header.querySelectorAll('div')).reverse().find(el => {
      const icons = el.querySelectorAll('.material-symbols-outlined').length;
      return icons >= 1 && el.querySelector('img[src*="ym-operator-avatar"]');
    }) : null;
    if (headerActions) headerActions.insertBefore(link, headerActions.firstChild);
    else if (header) header.appendChild(link);
    else document.body.appendChild(link);
  }

  function wireHeaderShortcuts() {
    if (shellExcludedPaths.includes(currentPath)) return;
    document.querySelectorAll('header .material-symbols-outlined').forEach(icon => {
      if (icon.textContent.trim() !== 'factory') return;
      const target = icon.closest('a, button') || icon;
      target.style.cursor = 'pointer';
      if (target.tagName === 'A') {
        target.setAttribute('href', '/map');
      } else {
        target.addEventListener('click', () => { window.location.href = '/map'; });
      }
    });
    document.querySelectorAll('header img[src*="ym-operator-avatar"]').forEach(avatar => {
      const target = avatar.closest('a, button') || avatar;
      target.style.cursor = 'pointer';
      if (target.tagName === 'A') {
        target.setAttribute('href', '/settings');
      } else {
        target.addEventListener('click', () => { window.location.href = '/settings'; });
      }
    });
  }

  function cleanupInAppChrome() {
    if (shellExcludedPaths.includes(currentPath)) return;
    document.querySelectorAll('footer').forEach(footer => { footer.style.display = 'none'; });
    document.querySelectorAll('.ym-notification-fab').forEach(el => el.remove());
    if (currentPath === '/digital-twin') {
      document.querySelectorAll('body > div, main > div, main section > div').forEach(el => {
        const text = el.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
        if (text.includes('grid status') || text.includes('active personnel')) el.remove();
      });
    }
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
    const logo = document.querySelector('img[src="/logo.svg"]');
    const isAuthPath = authPaths.includes(currentPath) || currentPath === '/onboarding';

    if (logo) {
      const anchor = logo.closest('a');
      if (currentPath === '/') {
        if (anchor) anchor.setAttribute('href', '#top');
      } else if (isAuthPath) {
        if (anchor) {
          anchor.setAttribute('href', '/');
        } else {
          logo.style.cursor = 'pointer';
          logo.addEventListener('click', () => { window.location.href = '/'; });
        }
      } else if (!shellExcludedPaths.includes(currentPath)) {
        if (anchor) {
          anchor.setAttribute('href', '/dashboard');
        } else {
          logo.style.cursor = 'pointer';
          logo.addEventListener('click', () => { window.location.href = '/dashboard'; });
        }
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
      if (/details/i.test(text) && !/open\s+maintenance/i.test(lower)) {
        button.dataset.ymWired = 'true';
        button.addEventListener('click', async function() {
          const card = this.closest('[id^="plan-"]');
          if (card) {
            card.classList.toggle('expanded');
            const chevron = card.querySelector('.chevron');
            if (chevron) chevron.style.transform = card.classList.contains('expanded') ? 'rotate(180deg)' : 'rotate(0deg)';
          } else {
            openDetailsModal();
          }
        });
        return;
      }
      if (/open/i.test(text) && !/open\s+maintenance/i.test(lower) && button.closest('.plan-card, [id^="plan-"]')) {
        button.dataset.ymWired = 'true';
        button.addEventListener('click', function() {
          const card = this.closest('[id^="plan-"]');
          if (card) {
            card.classList.toggle('expanded');
            const chevron = card.querySelector('.chevron');
            if (chevron) chevron.style.transform = card.classList.contains('expanded') ? 'rotate(180deg)' : 'rotate(0deg)';
          }
        });
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
      if (/create order|new mission|deploy scenario|advance state|auto-resolve|re-scan|latest snapshot|clear filters|save changes|restart/i.test(text)) {
        button.dataset.ymWired = 'true';
        button.addEventListener('click', () => {
          if (/create order/i.test(text)) { window.location.href = '/work-orders'; return; }
          if (/new mission/i.test(text)) { window.location.href = '/agents'; return; }
          if (/deploy scenario/i.test(text)) { window.location.href = '/simulator'; return; }
          showModal('Action Registered', `<p class="text-on-surface-variant">YantraMitra recorded <strong>${text || 'this action'}</strong> in the live operations workflow.</p>`);
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
    if (shellExcludedPaths.includes(currentPath)) return;
    const notes = await api('/api/notifications').catch(() => []);
    const unread = notes.filter(n => n.status === 'unread').length;
    const existingButtons = Array.from(document.querySelectorAll('header button, header a')).filter(el => {
      const icon = el.querySelector('.material-symbols-outlined') || (el.classList?.contains('material-symbols-outlined') ? el : null);
      return icon?.textContent.trim() === 'notifications' || el.hasAttribute('data-ym-notifications');
    });
    const btn = existingButtons[0] || document.createElement('button');
    if (!existingButtons.length) {
      btn.type = 'button';
      btn.className = 'material-symbols-outlined text-primary p-2 hover:bg-primary/10 rounded-full transition-colors';
      btn.textContent = 'notifications';
      document.querySelector('header')?.appendChild(btn);
    }
    if (unread && !btn.querySelector('.ym-badge')) {
      btn.style.position = 'relative';
      btn.insertAdjacentHTML('beforeend', `<span class="ym-badge">${unread}</span>`);
    }
    existingButtons.slice(1).forEach(el => { el.style.display = 'none'; });
    btn.addEventListener('click', event => {
      event.preventDefault();
      showModal('Notification Center', notes.length ? `<div style="display:grid;gap:10px">${notes.map(n => `<a href="${n.link || '#'}" style="display:block;text-decoration:none;color:#191a28;padding:12px;border:1px solid #c7c4d7;border-radius:12px"><strong>${n.title}</strong><p style="color:#464555;margin:4px 0 0">${n.message}</p><small>${n.priority} · ${n.status}</small></a>`).join('')}</div>` : '<p>No notifications.</p>');
    });
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
    if (isPublicEntryPath(currentPath)) {
      if (localStorage.getItem('ymDemoActive') === '1') stopDemo();
      return;
    }
    if (localStorage.getItem('ymDemoActive') !== '1') return;
    if (!isDemoSessionFresh()) return stopDemo();
    const index = Number(localStorage.getItem('ymDemoIndex') || '0');
    if (!Number.isInteger(index) || index < 0) return stopDemo();
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
          <div style="display:flex;justify-content:space-between;gap:8px;margin-top:12px"><button class="ym-demo-skip" style="background:#eeecff;color:#464555">Skip</button><button class="ym-demo-pause" style="background:#eeecff;color:#413fd6">${localStorage.getItem('ymDemoPaused') === '1' ? 'Resume' : 'Pause'}</button><button class="ym-demo-next" style="background:#413fd6;color:white">Next</button></div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('.ym-demo-skip').addEventListener('click', stopDemo);
      overlay.querySelector('.ym-demo-pause').addEventListener('click', event => {
        const paused = localStorage.getItem('ymDemoPaused') === '1';
        if (paused) {
          localStorage.removeItem('ymDemoPaused');
          event.currentTarget.textContent = 'Pause';
          setTimeout(() => advanceDemo(index), 11000);
        } else {
          localStorage.setItem('ymDemoPaused', '1');
          event.currentTarget.textContent = 'Resume';
        }
      });
      overlay.querySelector('.ym-demo-next').addEventListener('click', () => {
        localStorage.removeItem('ymDemoPaused');
        advanceDemo(index);
      });
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
    addYantraNklanEntry();
    cleanupInAppChrome();
    wireHeaderShortcuts();
    wireLogoAndBackNavigation();
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
