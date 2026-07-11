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
        right: 104px;
        bottom: 24px;
        z-index: 75;
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
        .ym-ask-yantranklan { right: 14px; bottom: 86px; }
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
    if (authPaths.includes(currentPath)) return;
    const existingRails = Array.from(document.querySelectorAll('aside, nav')).filter(el => {
      const cls = el.className || '';
      return typeof cls === 'string' && cls.includes('right-4') && (cls.includes('72px') || cls.includes('rounded-full'));
    });

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
    if (authPaths.includes(currentPath)) return;
    if (document.querySelector('.ym-ask-yantranklan') || currentPath === '/ai-console') return;
    const link = document.createElement('a');
    link.href = '/ai-console';
    link.className = 'ym-ask-yantranklan';
    link.innerHTML = '<img src="/images/yantranklan-avatar-ai.jpg" alt="YantraNklan"><span>Ask YantraNklan</span>';
    document.body.appendChild(link);
  }

  function addHomeAuthActions() {
    if (currentPath !== '/') return;
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
      const match = routeByText.find(([pattern]) => pattern.test(text));
      if (!match) return;
      button.dataset.ymWired = 'true';
      button.addEventListener('click', () => { window.location.href = match[1]; });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    normalizeRightRail();
    addYantraNklanEntry();
    addHomeAuthActions();
    wireKnownButtons();
  });
})();
