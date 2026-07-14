(function() {
  const ROLE_STYLES = {
    admin:          { bg: '#e1dfff', primary: '#413fd6', secondary: '#2e29c6', label: 'Admin' },
    plant_manager:  { bg: '#f3e8ff', primary: '#7c3aed', secondary: '#5b21b6', label: 'Plant Manager' },
    maintenance:    { bg: '#fff7ed', primary: '#ea580c', secondary: '#c2410c', label: 'Maintenance' },
    operator:       { bg: '#f0fdfa', primary: '#0d9488', secondary: '#0f766e', label: 'Operator' },
    executive:      { bg: '#f1f5f9', primary: '#1e293b', secondary: '#0f172a', label: 'Executive' },
    reliability:    { bg: '#f0fdf4', primary: '#16a34a', secondary: '#15803d', label: 'Reliability' },
    inventory:      { bg: '#ecfeff', primary: '#0891b2', secondary: '#0e7490', label: 'Inventory' },
    safety:         { bg: '#fef2f2', primary: '#dc2626', secondary: '#b91c1c', label: 'Safety' },
    engineer:       { bg: '#eef2ff', primary: '#4f46e5', secondary: '#3730a3', label: 'Engineer' },
    quality:        { bg: '#f5f3ff', primary: '#9333ea', secondary: '#7e22ce', label: 'Quality' },
  };

  function styleForRole(role) {
    return ROLE_STYLES[role] || ROLE_STYLES.admin;
  }

  function initials(name) {
    if (!name) return '?';
    return name.split(/\s+/).filter(Boolean).map(s => s[0]).join('').toUpperCase().slice(0, 2) || '?';
  }

  function hashNum(str, max) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i), h |= 0;
    return Math.abs(h) % max;
  }

  const SKIN_TONES = ['#d4a574','#c89b6e','#bd8f62','#e8b88a','#f5d0b8','#b8855a','#a86a4c'];
  const HAIR_COLORS = ['#1a1a1a','#2d1a0e','#3a251c','#4a2c17','#25212b','#6b3a1f','#4a3828','#5a3a1e'];

  function generateAvatarSVG(user) {
    const name = user.name || 'User';
    const role = user.role || 'admin';
    const s = styleForRole(role);
    const init = initials(name);
    const seed = name + (user.email || '') + (user.id || '');
    const h = hashNum(seed, 1000);
    const skinIdx = h % SKIN_TONES.length;
    const hairIdx = (h + 3) % HAIR_COLORS.length;
    const glasses = h % 4 === 0;
    const gender = h % 2;
    const hairStyle = (h + 7) % 4;
    const neckLen = gender === 0 ? 10 : 8;

    const skin = SKIN_TONES[skinIdx];
    const hair = HAIR_COLORS[hairIdx];
    const faceR = 22;
    const cx = 64;
    const cy = gender === 0 ? 56 : 58;

    let hairPath;
    if (gender === 0) {
      if (hairStyle === 0) hairPath = `M${cx-faceR-2},${cy-6} Q${cx},${cy-faceR-6} ${cx+faceR+2},${cy-6}`;
      else if (hairStyle === 1) hairPath = `M${cx-faceR-4},${cy-2} Q${cx},${cy-faceR-10} ${cx+faceR+4},${cy-2}`;
      else if (hairStyle === 2) hairPath = `M${cx-faceR-3},${cy-4} Q${cx-faceR/2},${cy-faceR-8} ${cx},${cy-faceR-6} Q${cx+faceR/2},${cy-faceR-8} ${cx+faceR+3},${cy-4}`;
      else hairPath = `M${cx-faceR-2},${cy-8} L${cx-faceR-2},${cy-faceR-4} Q${cx},${cy-faceR-12} ${cx+faceR+2},${cy-faceR-4} L${cx+faceR+2},${cy-8}`;
    } else {
      if (hairStyle === 0) hairPath = `M${cx-faceR-2},${cy-4} Q${cx},${cy-faceR-4} ${cx+faceR+2},${cy-4}`;
      else if (hairStyle === 1) hairPath = `M${cx-faceR-3},${cy-2} Q${cx},${cy-faceR-6} ${cx+faceR+3},${cy-2}`;
      else if (hairStyle === 2) hairPath = `M${cx-faceR-2},${cy-4} L${cx-faceR-4},${cy-faceR} Q${cx},${cy-faceR-8} ${cx+faceR+4},${cy-faceR} L${cx+faceR+2},${cy-4}`;
      else hairPath = `M${cx-faceR-3},${cy-6} Q${cx-faceR/2},${cy-faceR-10} ${cx},${cy-faceR-6} Q${cx+faceR/2},${cy-faceR-10} ${cx+faceR+3},${cy-6}`;
    }

    let glassesEl = '';
    if (glasses) {
      glassesEl = `<ellipse cx="${cx-8}" cy="${cy-2}" rx="8" ry="5" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
        <ellipse cx="${cx+8}" cy="${cy-2}" rx="8" ry="5" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
        <line x1="${cx}" y1="${cy-2}" x2="${cx}" y2="${cy-2}" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>`;
    }

    const bodyY = cy + faceR + 4;
    const shoulderW = 40;
    const shoulderCurve = 18;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
      <defs>
        <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${s.bg}"/>
          <stop offset="100%" stop-color="${s.bg}ee"/>
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="64" fill="url(#bg-grad)"/>
      <path d="${hairPath}" fill="${hair}"/>
      <circle cx="${cx}" cy="${cy}" r="${faceR}" fill="${skin}"/>
      ${glassesEl}
      <path d="M${cx-shoulderW},128 Q${cx},${bodyY+shoulderCurve} ${cx+shoulderW},128" fill="${s.primary}" opacity="0.9"/>
      <path d="M${cx-shoulderW},128 Q${cx},${bodyY+shoulderCurve+6} ${cx+shoulderW},128" fill="${s.secondary}" opacity="0.3"/>
      <text x="${cx}" y="118" text-anchor="middle" font-family="Inter, Geist, system-ui, sans-serif" font-size="16" font-weight="800" fill="${s.primary}" opacity="0.9">${init}</text>
    </svg>`;
  }

  function dataURI(svg) {
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  let popoverInstance = null;

  function closePopover() {
    if (popoverInstance) { popoverInstance.remove(); popoverInstance = null; }
  }

  function showPopover(user, avatarEl, options) {
    closePopover();
    const rect = avatarEl.getBoundingClientRect();
    const s = styleForRole(user.role);
    const init = initials(user.name);
    const avatarSrc = options.avatarUrl || dataURI(generateAvatarSVG(user));

    const wrap = document.createElement('div');
    wrap.className = 'ym-avatar-popover';
    wrap.style.cssText = 'position:fixed;z-index:200;background:rgba(255,255,255,0.96);backdrop-filter:blur(16px);border:1px solid rgba(199,196,215,0.72);border-radius:18px;box-shadow:0 24px 70px rgba(65,63,214,0.18);padding:20px;width:300px;opacity:0;transform:translateY(8px);transition:opacity .2s ease,transform .2s ease;';

    const plants = user.assignedPlants && user.assignedPlants.length ? user.assignedPlants.map(p => typeof p === 'object' ? p.name : p).join(', ') : '—';
    const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never';
    const statusDot = user.status === 'active' ? '<span class="w-2 h-2 rounded-full bg-secondary" style="display:inline-block"></span>' : '<span class="w-2 h-2 rounded-full bg-outline-variant" style="display:inline-block"></span>';

    wrap.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;text-align:center">
      <div style="width:72px;height:72px;border-radius:9999px;overflow:hidden;border:3px solid ${s.primary}30;margin-bottom:12px">
        <img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(user.name)}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy">
        <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;background:${s.primary}12;color:${s.primary};font-weight:800;font-size:24px;font-family:Inter,Geist,sans-serif">${init}</div>
      </div>
      <h3 style="font-weight:700;font-size:16px;color:#191a28;margin:0">${escapeHtml(user.name)}</h3>
      <p style="font-size:13px;color:#767586;margin:2px 0 4px">${escapeHtml(user.email || '')}</p>
      <span style="display:inline-block;padding:3px 12px;border-radius:9999px;background:${s.primary}12;color:${s.primary};font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.04em">${s.label}</span>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;margin-top:14px;padding-top:14px;border-top:1px solid rgba(199,196,215,0.4);font-size:12px;text-align:left">
        <div><span style="color:#767586;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;display:block">Plants</span><span style="color:#191a28;font-weight:500">${escapeHtml(plants)}</span></div>
        <div><span style="color:#767586;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;display:block">Status</span><span style="color:#191a28;font-weight:500">${statusDot} ${escapeHtml(user.status || 'active')}</span></div>
        <div style="grid-column:1/-1"><span style="color:#767586;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;display:block">Last Login</span><span style="color:#191a28;font-weight:500">${escapeHtml(lastLogin)}</span></div>
      </div>
      <div style="display:flex;gap:8px;width:100%;margin-top:14px">
        <button class="ym-popover-action" data-action="copy-email" style="flex:1;padding:8px;border-radius:10px;border:1px solid ${s.primary}30;background:transparent;color:${s.primary};font-weight:700;font-size:11px;cursor:pointer">Copy Email</button>
        <button class="ym-popover-action" data-action="view-profile" style="flex:1;padding:8px;border-radius:10px;background:${s.primary};color:white;font-weight:700;font-size:11px;border:0;cursor:pointer">View Profile</button>
      </div>
    </div>`;

    document.body.appendChild(wrap);
    requestAnimationFrame(() => { wrap.style.opacity = '1'; wrap.style.transform = 'translateY(0)'; });

    const popRect = wrap.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left + rect.width / 2 - popRect.width / 2;
    if (top + popRect.height > window.innerHeight - 8) top = rect.top - popRect.height - 8;
    if (left < 8) left = 8;
    if (left + popRect.width > window.innerWidth - 8) left = window.innerWidth - popRect.width - 8;
    wrap.style.top = top + 'px';
    wrap.style.left = left + 'px';

    popoverInstance = wrap;

    wrap.querySelectorAll('.ym-popover-action').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (this.dataset.action === 'copy-email' && user.email) {
          navigator.clipboard.writeText(user.email).then(() => { closePopover(); });
        } else if (this.dataset.action === 'view-profile') {
          closePopover();
          window.location.href = '/settings';
        }
      });
    });

    const closeOnClick = function(e) {
      if (!wrap.contains(e.target) && !avatarEl.contains(e.target)) {
        closePopover();
        document.removeEventListener('click', closeOnClick);
      }
    };
    setTimeout(() => document.addEventListener('click', closeOnClick), 10);
  }

  function renderAvatar(user, options) {
    options = options || {};
    const size = options.size || 48;
    const name = user.name || 'User';
    const role = user.role || 'admin';
    const s = styleForRole(role);
    const init = initials(name);
    const svgAvatar = generateAvatarSVG(user);
    const avatarDataURI = dataURI(svgAvatar);
    const imgSrc = user.avatar || avatarDataURI;
    const showStatus = options.showStatus !== false;
    const statusColor = user.status === 'active' ? 'bg-secondary' : user.status === 'disabled' ? 'bg-error' : 'bg-tertiary-fixed-dim';
    const hasRealImage = !!user.avatar;

    const wrap = document.createElement('div');
    wrap.className = 'ym-avatar';
    wrap.style.cssText = `position:relative;display:inline-flex;flex-shrink:0;width:${size}px;height:${size}px;`;

    const img = document.createElement('img');
    img.className = 'ym-avatar-img';
    img.style.cssText = `width:100%;height:100%;border-radius:9999px;object-fit:cover;border:2px solid ${s.primary}20;transition:opacity .3s ease;opacity:0;`;
    img.alt = name;
    img.loading = 'lazy';
    img.src = imgSrc;

    const fallback = document.createElement('div');
    fallback.className = 'ym-avatar-fallback';
    fallback.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:${s.bg};color:${s.primary};font-weight:800;font-family:Inter,Geist,system-ui,sans-serif;font-size:${Math.max(11, size * 0.38)}px;border:2px solid ${s.primary}15;`;
    fallback.textContent = init;

    const skeleton = document.createElement('div');
    skeleton.className = 'ym-avatar-skeleton';
    skeleton.style.cssText = `position:absolute;inset:0;border-radius:9999px;background:linear-gradient(110deg,${s.bg} 30%,rgba(255,255,255,0.5) 50%,${s.bg} 70%);background-size:200% 100%;animation:ymAvatarShimmer 1.5s ease-in-out infinite;`;

    const statusDot = document.createElement('span');
    if (showStatus) {
      statusDot.className = 'ym-avatar-status';
      const dotSize = Math.max(8, Math.round(size * 0.2));
      statusDot.style.cssText = `position:absolute;bottom:-1px;right:-1px;width:${dotSize}px;height:${dotSize}px;border-radius:9999px;border:2px solid white;${statusColor === 'bg-secondary' ? 'background:#006b5f' : statusColor === 'bg-error' ? 'background:#ba1a1a' : 'background:#986500'};`;
    }

    wrap.appendChild(skeleton);
    wrap.appendChild(fallback);
    wrap.appendChild(img);
    if (showStatus) wrap.appendChild(statusDot);

    img.addEventListener('load', function() {
      skeleton.style.display = 'none';
      img.style.opacity = '1';
    });

    img.addEventListener('error', function() {
      skeleton.style.display = 'none';
      img.style.display = 'none';
    });

    if (options.clickable !== false) {
      wrap.style.cursor = 'pointer';
      wrap.addEventListener('click', function(e) {
        e.stopPropagation();
        showPopover(user, wrap, { avatarUrl: imgSrc });
      });
    }

    return wrap;
  }

  const styleId = 'ym-avatar-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes ymAvatarShimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      .ym-avatar-img:hover { transform:scale(1.05); transition:transform 0.2s ease; }
      .ym-avatar { transition:transform 0.2s ease; }
      .ym-avatar:hover { transform:translateY(-1px); }
    `;
    document.head.appendChild(style);
  }

  function showPopoverForUser(user, anchorEl) {
    showPopover(user, anchorEl, { avatarUrl: user.avatar || dataURI(generateAvatarSVG(user)) });
  }

  window.YMAvatar = { render: renderAvatar, initials: initials, styleForRole: styleForRole, generateSVG: generateAvatarSVG, dataURI: dataURI, closePopover: closePopover, showPopover: showPopoverForUser };
})();
