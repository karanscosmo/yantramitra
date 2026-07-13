(function() {
  async function get(path) { const r = await fetch(path); return r.json(); }
  async function post(path, body) { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const t = await r.json(); return t; }
  async function patch(path, body) { const r = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }
  async function del(path) { const r = await fetch(path, { method: 'DELETE' }); return r.json(); }

  let profile = null, settings = null, team = [], plants = [], orgId = 'YM-OPS-4402';

  async function checkAuth() {
    try { const me = await get('/api/auth/me'); if (!me || !me.id) window.location.href = '/'; return me; }
    catch { window.location.href = '/'; return null; }
  }

  function roleLabel(role) {
    return { admin: 'Admin', operator: 'Operator', maintenance: 'Maintenance', plant_manager: 'Plant Manager', executive: 'Executive' }[role] || role;
  }

  function toast(text, good = true) {
    const existing = document.querySelector('.ym-toast');
    if (existing) existing.remove();
    const msg = document.createElement('div');
    msg.className = `ym-toast fixed top-20 right-8 z-[100] rounded-xl px-5 py-3.5 font-bold shadow-2xl flex items-center gap-2.5 ${good ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-error'}`;
    msg.style.fontSize = '14px';
    msg.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px">${good ? 'check_circle' : 'error'}</span>${text}`;
    document.body.appendChild(msg);
    setTimeout(() => { msg.style.opacity = '0'; msg.style.transition = 'opacity .3s'; setTimeout(() => msg.remove(), 300); }, 2600);
  }

  function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  function activateTab(name) {
    document.querySelectorAll('main .flex.gap-gutter button').forEach(btn => {
      const active = btn.textContent.trim().toLowerCase().startsWith(name.toLowerCase());
      btn.className = active
        ? 'px-md py-3 rounded-full bg-primary text-on-primary shadow-lg shadow-primary/20 font-medium whitespace-nowrap'
        : 'px-md py-3 rounded-full glass-card hover:bg-white transition-colors text-on-surface-variant font-medium whitespace-nowrap';
    });
  }

  function showLoading(host) {
    host.innerHTML = '<div class="md:col-span-12 flex items-center justify-center py-20"><div class="flex items-center gap-3 text-on-surface-variant"><span class="material-symbols-outlined animate-spin text-primary" style="font-size:24px">sync</span><span style="font-size:15px">Loading...</span></div></div>';
  }

  // ──────────────── PROFILE TAB ────────────────
  function renderProfile() {
    activateTab('Profile');
    const host = document.getElementById('ym-settings-content');
    showLoading(host);
    Promise.all([get('/api/user/profile'), get('/api/plants')]).then(([prof, pl]) => {
      profile = prof; plants = pl || [];
      const orig = { name: profile.name, email: profile.email, phone: profile.phone || '' };
      let current = { ...orig };
      let hasChanged = false;
      function checkChanged() { hasChanged = current.name !== orig.name || current.email !== orig.email || current.phone !== orig.phone; saveBtn.disabled = !hasChanged; saveBtn.className = hasChanged ? 'shimmer-btn primary-gradient text-on-primary px-md py-2.5 rounded-lg font-bold shadow-[0_10px_20px_rgba(91,91,240,0.3)] cursor-pointer' : 'shimmer-btn primary-gradient text-on-primary/50 px-md py-2.5 rounded-lg font-bold cursor-not-allowed opacity-50'; }

      host.innerHTML = `
        <div class="md:col-span-4 space-y-gutter">
          <div class="glass-card rounded-xl p-md flex flex-col items-center text-center">
            <div class="relative mb-md group">
              <div class="w-32 h-32 rounded-full overflow-hidden border-2 border-white shadow-[0_0_30px_rgba(65,63,214,0.3)] ring-4 ring-primary/10">
                <img class="w-full h-full object-cover" id="ym-profile-avatar" src="${profile.avatar || '/assets/images/ym-operator-avatar.jpg'}" alt="${escapeHtml(profile.name)}">
                <input type="file" accept="image/*" id="ym-photo-input" style="display:none">
              </div>
              <button id="ym-change-photo" class="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform" title="Change photo">
                <span class="material-symbols-outlined text-[18px]">camera_alt</span>
              </button>
            </div>
            <h2 class="font-section-header text-section-header mb-1">${escapeHtml(profile.name)}</h2>
            <span class="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-label-caps tracking-wider mb-sm">${roleLabel(profile.role)}</span>
            <p class="text-body-md text-on-surface-variant">${profile.email}</p>
          </div>
          <div class="glass-card rounded-xl p-md">
            <div class="flex items-center justify-between mb-md">
              <h3 class="font-label-caps text-label-caps text-primary">Connected Facilities</h3>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" style="font-size:16px">search</span>
                <input id="ym-facility-search" class="glass-input rounded-full py-1.5 pl-8 pr-3 text-xs w-36" placeholder="Search...">
              </div>
            </div>
            <div id="ym-facility-list" class="flex flex-wrap gap-xs">
              ${plants.map(p => `
                <a href="/plant/${p.id}" class="facility-chip px-sm py-2 rounded-full glass-input text-on-surface text-body-md flex items-center gap-xs hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
                  <span class="w-2 h-2 rounded-full ${p.status === 'attention' ? 'bg-tertiary-fixed-dim' : 'bg-secondary animate-pulse'}"></span>
                  ${escapeHtml(p.name)}
                </a>`).join('') || '<span class="text-sm text-on-surface-variant">No connected facilities.</span>'}
            </div>
          </div>
        </div>
        <div class="md:col-span-8 space-y-gutter">
          <form class="glass-card rounded-xl p-md" id="ym-profile-form">
            <div class="flex justify-between items-center flex-wrap gap-md mb-xl">
              <h3 class="font-section-header text-section-header">Personal Information</h3>
              <div class="flex gap-sm">
                <button type="button" id="ym-cancel-profile" class="px-md py-2.5 rounded-lg border border-outline-variant/40 text-on-surface-variant font-medium hover:bg-white/70 transition-all">Cancel</button>
                <button type="submit" id="ym-save-profile" class="shimmer-btn primary-gradient text-on-primary/50 px-md py-2.5 rounded-lg font-bold cursor-not-allowed opacity-50" disabled>Save Changes</button>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
              <label class="space-y-xs"><span class="font-label-caps text-label-caps text-on-surface-variant ml-1">Full Name</span><input name="name" id="ym-field-name" class="w-full glass-input rounded-lg px-md py-3 text-on-surface" type="text" value="${escapeHtml(profile.name || '')}"></label>
              <label class="space-y-xs"><span class="font-label-caps text-label-caps text-on-surface-variant ml-1">Email Address</span><input name="email" id="ym-field-email" class="w-full glass-input rounded-lg px-md py-3 text-on-surface" type="email" value="${escapeHtml(profile.email || '')}"></label>
              <label class="space-y-xs"><span class="font-label-caps text-label-caps text-on-surface-variant ml-1">Organization ID</span><input class="w-full glass-input rounded-lg px-md py-3 bg-surface-container-low text-on-surface-variant cursor-not-allowed" readonly value="${orgId}"></label>
              <label class="space-y-xs"><span class="font-label-caps text-label-caps text-on-surface-variant ml-1">Phone</span><input name="phone" id="ym-field-phone" class="w-full glass-input rounded-lg px-md py-3 text-on-surface" type="tel" value="${escapeHtml(profile.phone || '')}"></label>
            </div>
            <div id="ym-profile-errors" class="mt-md hidden"></div>
          </form>
          <div class="rounded-xl border border-error/20 bg-error-container/10 p-md flex flex-col md:flex-row justify-between items-center gap-md">
            <div>
              <h4 class="font-bold text-error mb-1" style="font-size:16px">Danger Zone</h4>
              <p class="text-body-md text-on-surface-variant max-w-md">Once you delete your account, there is no going back. All node access and operation logs will be scrubbed.</p>
            </div>
            <button id="ym-delete-account" class="px-md py-3 rounded-lg border border-error text-error font-bold hover:bg-error hover:text-white transition-all">Delete Account</button>
          </div>
        </div>`;

      const saveBtn = document.getElementById('ym-save-profile');
      const cancelBtn = document.getElementById('ym-cancel-profile');
      const nameInput = document.getElementById('ym-field-name');
      const emailInput = document.getElementById('ym-field-email');
      const phoneInput = document.getElementById('ym-field-phone');

      function onChange() {
        current = { name: nameInput.value, email: emailInput.value, phone: phoneInput.value };
        checkChanged();
      }
      nameInput.addEventListener('input', onChange);
      emailInput.addEventListener('input', onChange);
      phoneInput.addEventListener('input', onChange);

      cancelBtn.addEventListener('click', () => {
        if (hasChanged && !confirm('Discard unsaved changes?')) return;
        nameInput.value = orig.name; emailInput.value = orig.email; phoneInput.value = orig.phone;
        current = { ...orig }; checkChanged();
      });

      document.getElementById('ym-profile-form').addEventListener('submit', async e => {
        e.preventDefault();
        const errDiv = document.getElementById('ym-profile-errors');
        errDiv.classList.add('hidden');
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const errors = [];
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email address');
        if (phone && !/^[\d\s\-+()]{7,20}$/.test(phone)) errors.push('Invalid phone number');
        if (errors.length) {
          errDiv.classList.remove('hidden');
          errDiv.innerHTML = errors.map(e => `<p class="text-error text-sm flex items-center gap-1"><span class="material-symbols-outlined" style="font-size:14px">error</span>${e}</p>`).join('');
          return;
        }
        saveBtn.disabled = true; saveBtn.textContent = 'Saving...';
        try {
          const res = await patch('/api/user/profile', { name: nameInput.value.trim(), email, phone });
          if (res && !res.error) {
            profile = res; orig.name = res.name; orig.email = res.email; orig.phone = res.phone || '';
            current = { ...orig }; hasChanged = false; checkChanged();
            toast('Profile saved successfully');
          } else toast(res.error || 'Save failed', false);
        } catch { toast('Save failed', false); }
        saveBtn.textContent = 'Save Changes'; saveBtn.disabled = !hasChanged;
      });

      document.getElementById('ym-change-photo').addEventListener('click', () => document.getElementById('ym-photo-input').click());
      document.getElementById('ym-photo-input').addEventListener('change', async function() {
        if (!this.files.length) return;
        const fd = new FormData();
        fd.append('photo', this.files[0]);
        try {
          const r = await fetch('/api/user/profile/photo', { method: 'POST', body: fd });
          const res = await r.json();
          if (res.url) {
            document.getElementById('ym-profile-avatar').src = res.url + '?t=' + Date.now();
            profile.avatar = res.url;
            toast('Photo updated');
          } else toast(res.error || 'Upload failed', false);
        } catch { toast('Upload failed', false); }
      });

      document.getElementById('ym-delete-account').addEventListener('click', () => {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
          toast('Account deletion initiated. This is a demo.', false);
        }
      });

      // Facility search
      const searchInput = document.getElementById('ym-facility-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          const q = searchInput.value.toLowerCase();
          document.querySelectorAll('.facility-chip').forEach(chip => {
            chip.style.display = chip.textContent.toLowerCase().includes(q) ? '' : 'none';
          });
        });
      }
    }).catch(() => { host.innerHTML = '<div class="md:col-span-12 text-center py-20 text-error">Failed to load profile.</div>'; });
  }

  // ──────────────── NOTIFICATIONS TAB ────────────────
  function renderNotifications() {
    activateTab('Notifications');
    const host = document.getElementById('ym-settings-content');
    showLoading(host);
    get('/api/user/preferences').then(prefs => {
      settings = prefs; const p = prefs.prefs || {};
      const items = [
        ['criticalAlerts', 'Critical Alarms', 'Immediate push alerts for production-stopping faults and safety events.', 'warning'],
        ['shiftHandover', 'Shift Handover Digest', 'Summary of open alarms, pending plans, and work order status at shift change.', 'swap_horiz'],
        ['agentApprovals', 'Agent Approvals', 'Notify when an AI agent proposes an action requiring your approval.', 'smart_toy'],
        ['weeklyReport', 'Weekly Reports', 'Monday morning plant reliability summary with KPI trends.', 'calendar_month'],
        ['maintenanceReminders', 'Maintenance Reminders', 'Upcoming and overdue maintenance alerts for your assigned machines.', 'build'],
        ['anomalyDetections', 'Anomaly Detections', 'Real-time alerts when sensor readings deviate from expected patterns.', 'report_problem'],
      ];
      host.innerHTML = `<div class="md:col-span-12 glass-card rounded-xl p-md"><div class="flex items-center justify-between mb-sm"><h3 class="font-section-header text-section-header">Notification Preferences</h3><span class="text-xs text-on-surface-variant">Changes save instantly</span></div><div class="space-y-xs">${items.map(([key, title, desc, icon]) => `
        <label class="flex items-center justify-between gap-md rounded-xl border border-outline-variant/40 bg-white/60 p-md hover:bg-white/80 transition-colors cursor-pointer">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-primary" style="font-size:22px">${icon}</span>
            <div><span class="block font-bold" style="font-size:15px">${title}</span><span class="block text-sm text-on-surface-variant" style="font-size:13px">${desc}</span></div>
          </div>
          <div class="relative">
            <input type="checkbox" data-pref="${key}" class="ym-notif-toggle sr-only" ${p[key] ? 'checked' : ''}>
            <div class="ym-toggle-track" style="width:44px;height:24px;background:${p[key] ? '#413fd6' : '#c7c4d7'};border-radius:999px;transition:background .2s;cursor:pointer;position:relative" data-toggle="${key}"><div style="width:20px;height:20px;background:white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.15);transition:transform .2s;position:absolute;top:2px;left:${p[key] ? '22px' : '2px'}"></div></div>
          </div>
        </label>`).join('')}</div></div>`;

      document.querySelectorAll('[data-toggle]').forEach(toggle => {
        toggle.addEventListener('click', async function() {
          const key = this.dataset.toggle;
          const checkbox = document.querySelector(`[data-pref="${key}"]`);
          const wasChecked = checkbox.checked;
          const newChecked = !wasChecked;
          checkbox.checked = newChecked;
          this.style.background = newChecked ? '#413fd6' : '#c7c4d7';
          const knob = this.querySelector('div');
          knob.style.left = newChecked ? '22px' : '2px';
          try {
            const res = await patch('/api/user/preferences', { prefs: { [key]: newChecked } });
            if (res && res.prefs) settings.prefs = res.prefs;
            toast(newChecked ? `${title} enabled` : `${title} disabled`);
          } catch { checkbox.checked = wasChecked; toast('Failed to save preference', false); }
        });
      });
    }).catch(() => { host.innerHTML = '<div class="md:col-span-12 text-center py-20 text-error">Failed to load preferences.</div>'; });
  }

  // ──────────────── TEAM & ROLES TAB ────────────────
  function renderTeam() {
    activateTab('Team');
    const host = document.getElementById('ym-settings-content');
    showLoading(host);
    Promise.all([get('/api/team'), get('/api/plants')]).then(([t, pl]) => {
      team = t; plants = pl || [];
      host.innerHTML = `
        <div class="md:col-span-12 glass-card rounded-xl p-md lg:p-xl">
          <div class="flex items-center justify-between flex-wrap gap-md mb-md">
            <div>
              <h3 class="font-section-header text-section-header">Team & Roles</h3>
              <p class="text-sm text-on-surface-variant mt-0.5">${team.length} team members</p>
            </div>
            <div class="flex items-center gap-sm">
              <div class="relative">
                <span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" style="font-size:16px">search</span>
                <input id="ym-team-search" class="glass-input rounded-full py-1.5 pl-8 pr-3 text-xs w-36" placeholder="Search...">
              </div>
              <select id="ym-role-filter" class="glass-input rounded-full py-1.5 px-3 text-xs"><option value="">All Roles</option><option value="admin">Admin</option><option value="operator">Operator</option><option value="maintenance">Maintenance</option><option value="executive">Executive</option><option value="plant_manager">Plant Manager</option></select>
              <button id="ym-invite-user" class="shimmer-btn primary-gradient text-on-primary px-md py-2 rounded-lg font-bold shadow-[0_5px_15px_rgba(91,91,240,0.3)] flex items-center gap-1.5"><span class="material-symbols-outlined" style="font-size:18px">person_add</span>Invite</button>
            </div>
          </div>
          <div id="ym-team-grid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
            ${team.map(m => renderTeamCard(m)).join('')}
          </div>
        </div>`;

      // Search + filter
      function applyFilters() {
        const q = document.getElementById('ym-team-search').value.toLowerCase();
        const role = document.getElementById('ym-role-filter').value;
        document.querySelectorAll('.ym-team-card').forEach(card => {
          const name = (card.dataset.name || '').toLowerCase();
          const email = (card.dataset.email || '').toLowerCase();
          const cardRole = card.dataset.role || '';
          const matchSearch = !q || name.includes(q) || email.includes(q);
          const matchRole = !role || cardRole === role;
          card.style.display = matchSearch && matchRole ? '' : 'none';
        });
      }
      document.getElementById('ym-team-search').addEventListener('input', applyFilters);
      document.getElementById('ym-role-filter').addEventListener('change', applyFilters);

      document.getElementById('ym-invite-user').addEventListener('click', () => showInviteModal());
      wireTeamActions();
    }).catch(() => { host.innerHTML = '<div class="md:col-span-12 text-center py-20 text-error">Failed to load team.</div>'; });
  }

  function renderTeamCard(m) {
    const status = m.status || 'active';
    const statusColor = status === 'active' ? 'bg-secondary' : status === 'disabled' ? 'bg-error' : 'bg-tertiary-fixed-dim';
    const lastLogin = m.lastLogin ? new Date(m.lastLogin).toLocaleDateString() : 'Never';
    const plantNames = (m.assignedPlants || []).map(id => {
      const p = plants.find(x => x.id === id);
      return p ? p.name : null;
    }).filter(Boolean).join(', ') || '—';
    return `<article class="ym-team-card rounded-xl border border-outline-variant/40 bg-white/70 p-md flex flex-col" data-id="${m.id}" data-name="${escapeHtml(m.name)}" data-email="${escapeHtml(m.email)}" data-role="${m.role}">
      <div class="flex items-start gap-3 mb-3">
        <div class="relative">
          <img src="${m.avatar || '/assets/images/ym-operator-avatar.jpg'}" alt="${escapeHtml(m.name)}" class="w-14 h-14 rounded-full border-2 border-primary/20 object-cover">
          <span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${statusColor}"></span>
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-bold truncate" style="font-size:15px">${escapeHtml(m.name)}</h4>
          <p class="text-sm text-on-surface-variant truncate">${escapeHtml(m.email)}</p>
          <div class="flex items-center gap-2 mt-1.5">
            <span class="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase" style="font-size:10px">${roleLabel(m.role)}</span>
            <span class="text-xs text-on-surface-variant">Last login: ${lastLogin}</span>
          </div>
        </div>
      </div>
      <div class="text-xs text-on-surface-variant space-y-0.5 mb-3">
        <div><span class="font-medium">Plants:</span> ${escapeHtml(plantNames)}</div>
        <div><span class="font-medium">Status:</span> <span class="${status === 'active' ? 'text-secondary font-bold' : status === 'disabled' ? 'text-error font-bold' : ''}">${status}</span></div>
      </div>
      <div class="flex flex-wrap gap-1.5 mt-auto pt-2 border-t border-outline-variant/20">
        <button class="ym-team-view flex-1 px-2 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors">View</button>
        <button class="ym-team-role flex-1 px-2 py-1.5 rounded-lg bg-secondary-container/50 text-on-secondary-container text-xs font-bold hover:bg-secondary-container transition-colors">Role</button>
        <button class="ym-team-disable flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${status === 'disabled' ? 'bg-secondary-container/50 text-on-secondary-container hover:bg-secondary-container' : 'bg-tertiary-fixed-dim/30 text-tertiary hover:bg-tertiary-fixed-dim/50'}">${status === 'disabled' ? 'Enable' : 'Disable'}</button>
        <button class="ym-team-reset-pw flex-1 px-2 py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant text-xs font-bold hover:bg-outline-variant/40 transition-colors">Reset PW</button>
        <button class="ym-team-remove flex-1 px-2 py-1.5 rounded-lg bg-error-container/30 text-error text-xs font-bold hover:bg-error-container/60 transition-colors">Remove</button>
      </div>
    </article>`;
  }

  function wireTeamActions() {
    document.querySelectorAll('.ym-team-view').forEach(btn => {
      btn.addEventListener('click', function() {
        const card = this.closest('.ym-team-card');
        const id = card.dataset.id;
        const m = team.find(x => x.id === id);
        if (!m) return;
        const plantNames = (m.assignedPlants || []).map(pid => { const p = plants.find(x => x.id === pid); return p ? p.name : null; }).filter(Boolean).join(', ') || 'None';
        openModal('Team Member: ' + m.name, `
          <div class="flex items-center gap-3 mb-4"><img src="${m.avatar || '/assets/images/ym-operator-avatar.jpg'}" class="w-20 h-20 rounded-full border-2 border-primary/20 object-cover"><div><h3 style="font-size:20px;font-weight:700">${escapeHtml(m.name)}</h3><p style="font-size:13px" class="text-on-surface-variant">${escapeHtml(m.email)}</p><span class="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase" style="font-size:10px">${roleLabel(m.role)}</span></div></div>
          <div class="grid grid-cols-2 gap-3 text-sm"><div><span class="font-bold text-on-surface-variant">Phone</span><p>${m.phone || '—'}</p></div><div><span class="font-bold text-on-surface-variant">Role</span><p>${roleLabel(m.role)}</p></div><div><span class="font-bold text-on-surface-variant">Member Since</span><p>${new Date(m.createdAt).toLocaleDateString()}</p></div><div><span class="font-bold text-on-surface-variant">Assigned Plants</span><p>${plantNames}</p></div></div>
          <div class="mt-4"><span class="font-bold text-on-surface-variant text-sm">Active Permissions</span><div class="flex flex-wrap gap-1 mt-1.5">${getPermissions(m.role).map(p => `<span class="px-2 py-0.5 rounded-full bg-primary/5 text-primary text-xs font-medium">${p}</span>`).join('')}</div></div>
        `);
      });
    });
    document.querySelectorAll('.ym-team-role').forEach(btn => {
      btn.addEventListener('click', function() {
        const card = this.closest('.ym-team-card');
        const id = card.dataset.id;
        const m = team.find(x => x.id === id);
        if (!m) return;
        const currentRole = m.role;
        const roles = ['admin', 'operator', 'maintenance', 'executive', 'plant_manager'];
        openModal('Change Role: ' + m.name, `
          <p class="text-sm text-on-surface-variant mb-3">Select a new role for <strong>${escapeHtml(m.name)}</strong>.</p>
          <div class="space-y-2">${roles.map(r => `
            <label class="flex items-center gap-3 p-3 rounded-xl border ${r === currentRole ? 'border-primary bg-primary/5' : 'border-outline-variant/40'} cursor-pointer hover:bg-white/60 transition-colors">
              <input type="radio" name="ym-new-role" value="${r}" ${r === currentRole ? 'checked' : ''} class="text-primary">
              <div><span class="font-bold text-sm">${roleLabel(r)}</span><span class="block text-xs text-on-surface-variant">${getRoleDesc(r)}</span></div>
            </label>`).join('')}</div>
          <div class="flex gap-2 mt-4"><button id="ym-role-save" class="flex-1 shimmer-btn primary-gradient text-on-primary py-2.5 rounded-lg font-bold">Save</button><button class="flex-1 px-md py-2.5 rounded-lg border border-outline-variant/40 text-on-surface-variant font-medium ym-close-modal2">Cancel</button></div>
        `, async () => {
          const sel = document.querySelector('[name="ym-new-role"]:checked');
          if (!sel || sel.value === currentRole) return;
          try {
            const res = await patch('/api/team/' + id, { role: sel.value });
            if (res && !res.error) {
              toast('Role updated to ' + roleLabel(sel.value));
              closeModal(); renderTeam();
            } else toast(res.error || 'Failed to update role', false);
          } catch { toast('Failed to update role', false); }
        });
      });
    });
    document.querySelectorAll('.ym-team-disable').forEach(btn => {
      btn.addEventListener('click', async function() {
        const card = this.closest('.ym-team-card');
        const id = card.dataset.id;
        const m = team.find(x => x.id === id);
        if (!m) return;
        const isDisabled = m.status === 'disabled';
        const action = isDisabled ? 'enable' : 'disable';
        if (!confirm(`Are you sure you want to ${action} ${m.name}?`)) return;
        try {
          const res = await post('/api/team/' + id + '/' + action, {});
          if (res && !res.error) { toast(m.name + ' ' + (isDisabled ? 'enabled' : 'disabled')); renderTeam(); }
          else toast(res.error || 'Action failed', false);
        } catch { toast('Action failed', false); }
      });
    });
    document.querySelectorAll('.ym-team-reset-pw').forEach(btn => {
      btn.addEventListener('click', function() {
        const card = this.closest('.ym-team-card');
        const id = card.dataset.id;
        const m = team.find(x => x.id === id);
        if (!m) return;
        if (!confirm(`Send password reset link to ${m.email}?`)) return;
        post('/api/team/' + id + '/reset-password', {}).then(res => {
          if (res && !res.error) toast('Reset link sent to ' + m.email);
          else toast(res.error || 'Failed to send reset', false);
        }).catch(() => toast('Failed to send reset', false));
      });
    });
    document.querySelectorAll('.ym-team-remove').forEach(btn => {
      btn.addEventListener('click', async function() {
        const card = this.closest('.ym-team-card');
        const id = card.dataset.id;
        const m = team.find(x => x.id === id);
        if (!m) return;
        if (!confirm(`Permanently remove ${m.name} from the platform? This cannot be undone.`)) return;
        try {
          const res = await del('/api/team/' + id);
          if (res && !res.error) { toast(m.name + ' removed'); renderTeam(); }
          else toast(res.error || 'Failed to remove', false);
        } catch { toast('Failed to remove', false); }
      });
    });
  }

  function getPermissions(role) {
    const perms = {
      admin: ['Full Access', 'User Management', 'System Config', 'Audit Logs', 'All Plants'],
      operator: ['View Dashboards', 'View Alarms', 'View Work Orders', 'Assigned Plants'],
      maintenance: ['View Work Orders', 'Update Work Orders', 'View Machine Health', 'Assigned Plants'],
      executive: ['View Reports', 'View KPIs', 'View Plans', 'All Plants (Read)'],
      plant_manager: ['View/Edit Plans', 'View/Edit Work Orders', 'Manage Team', 'Assigned Plants', 'View Reports'],
    };
    return perms[role] || ['Basic Access'];
  }

  function getRoleDesc(role) {
    return {
      admin: 'Full system access. Can manage users, roles, and configuration.',
      operator: 'Day-to-day operations. View dashboards, alarms, and work orders.',
      maintenance: 'Machine maintenance. View and update work orders and health data.',
      executive: 'Read-only access to reports, KPIs, and high-level plans.',
      plant_manager: 'Manage plant operations, plans, work orders, and team members.',
    }[role] || '';
  }

  function showInviteModal() {
    openModal('Invite Team Member', `
      <form id="ym-invite-form" class="space-y-3">
        <label class="block"><span class="font-bold text-sm text-on-surface-variant">Full Name</span><input name="name" class="w-full glass-input rounded-lg px-md py-2.5 mt-1 text-sm" required></label>
        <label class="block"><span class="font-bold text-sm text-on-surface-variant">Email Address</span><input name="email" type="email" class="w-full glass-input rounded-lg px-md py-2.5 mt-1 text-sm" required></label>
        <label class="block"><span class="font-bold text-sm text-on-surface-variant">Role</span><select name="role" class="w-full glass-input rounded-lg px-md py-2.5 mt-1 text-sm"><option value="operator">Operator</option><option value="maintenance">Maintenance</option><option value="plant_manager">Plant Manager</option><option value="executive">Executive</option><option value="admin">Admin</option></select></label>
        <label class="block"><span class="font-bold text-sm text-on-surface-variant">Assign Plants</span><div class="flex flex-wrap gap-1.5 mt-1.5">${plants.map(p => `<label class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-outline-variant/30 text-xs cursor-pointer hover:bg-white/60"><input type="checkbox" name="plants" value="${p.id}" class="rounded text-primary">${escapeHtml(p.name)}</label>`).join('')}</div></label>
        <div class="flex gap-2 pt-2"><button type="submit" class="flex-1 shimmer-btn primary-gradient text-on-primary py-2.5 rounded-lg font-bold">Send Invitation</button><button type="button" class="flex-1 px-md py-2.5 rounded-lg border border-outline-variant/40 text-on-surface-variant font-medium ym-close-modal2">Cancel</button></div>
      </form>
    `, null);
    document.getElementById('ym-invite-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const assignPlants = Array.from(document.querySelectorAll('[name="plants"]:checked')).map(cb => cb.value);
      const subBtn = e.currentTarget.querySelector('button[type="submit"]');
      subBtn.disabled = true; subBtn.textContent = 'Sending...';
      try {
        const res = await post('/api/team/invite', { name: fd.get('name'), email: fd.get('email'), role: fd.get('role'), assignedPlants: assignPlants });
        if (res && !res.error) { toast('Invitation sent to ' + fd.get('email')); closeModal(); renderTeam(); }
        else toast(res.error || 'Failed to send invitation', false);
      } catch { toast('Failed to send invitation', false); }
      subBtn.disabled = false; subBtn.textContent = 'Send Invitation';
    });
  }

  // ──────────────── INTEGRATIONS TAB ────────────────
  function renderIntegrations() {
    activateTab('Integrations');
    const host = document.getElementById('ym-settings-content');
    showLoading(host);
    get('/api/user/preferences').then(prefs => {
      settings = prefs; const ints = prefs.integrations || {};
      const systems = [
        { key: 'SCADA', name: 'Ignition / Siemens WinCC', desc: 'Real-time machine monitoring and control-system data ingestion.', icon: 'monitor_heart', health: ints.SCADA?.health || 98, latency: ints.SCADA?.latency || '12ms', version: ints.SCADA?.version || '8.1.3', lastSync: ints.SCADA?.lastSync || '—' },
        { key: 'CMMS', name: 'MaintainX / SAP PM', desc: 'Maintenance work order synchronization and asset lifecycle tracking.', icon: 'build', health: ints.CMMS?.health || 95, latency: ints.CMMS?.latency || '45ms', version: ints.CMMS?.version || '24.2', lastSync: ints.CMMS?.lastSync || '—' },
        { key: 'ERP', name: 'SAP S/4HANA', desc: 'Material availability, costing data, and production planning integration.', icon: 'account_balance', health: ints.ERP?.health || 92, latency: ints.ERP?.latency || '120ms', version: ints.ERP?.version || '2023 FPS02', lastSync: ints.ERP?.lastSync || '—' },
        { key: 'Historian', name: 'OSIsoft PI / TimescaleDB', desc: 'High-frequency process data archival and trend analytics.', icon: 'database', health: ints.Historian?.health || 97, latency: ints.Historian?.latency || '8ms', version: ints.Historian?.version || '2024-Q1', lastSync: ints.Historian?.lastSync || '—' },
        { key: 'MQTT', name: 'Mosquitto / HiveMQ', desc: 'Edge device telemetry ingestion via MQTT broker.', icon: 'hub', health: ints.MQTT?.health || 89, latency: ints.MQTT?.latency || '22ms', version: ints.MQTT?.version || '2.0.18', lastSync: ints.MQTT?.lastSync || '—' },
      ];
      const state = key => { const s = ints[key]?.state || 'disconnected'; return s; };
      const badge = key => {
        const s = state(key);
        const map = { connected: ['bg-secondary', 'Connected'], disconnected: ['bg-outline-variant', 'Disconnected'], connecting: ['bg-tertiary-fixed-dim', 'Connecting...'], error: ['bg-error', 'Error'] };
        const [color, label] = map[s] || map.disconnected;
        return `<span class="flex items-center gap-1.5 text-xs font-bold"><span class="w-2 h-2 rounded-full ${color}"></span>${label}</span>`;
      };

      host.innerHTML = `<div class="md:col-span-12 glass-card rounded-xl p-md">
        <div class="flex items-center justify-between mb-sm">
          <h3 class="font-section-header text-section-header">Industrial Integrations</h3>
          <span class="text-xs text-on-surface-variant">${systems.filter(s => state(s.key) === 'connected').length}/${systems.length} connected</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
          ${systems.map(sys => {
            const s = state(sys.key);
            const healthColor = sys.health >= 95 ? 'text-secondary' : sys.health >= 80 ? 'text-tertiary' : 'text-error';
            return `<div class="rounded-xl border border-outline-variant/40 bg-white/70 p-md integration-card" data-key="${sys.key}">
              <div class="flex items-start justify-between gap-md mb-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><span class="material-symbols-outlined text-primary" style="font-size:22px">${sys.icon}</span></div>
                  <div><h4 class="font-bold" style="font-size:15px">${sys.key}</h4><p class="text-xs text-on-surface-variant">${sys.name}</p></div>
                </div>
                ${badge(sys.key)}
              </div>
              <p class="text-xs text-on-surface-variant mb-3">${sys.desc}</p>
              <div class="grid grid-cols-2 gap-2 text-xs mb-3">
                <div><span class="text-on-surface-variant">Last Sync</span><p class="font-bold">${sys.lastSync}</p></div>
                <div><span class="text-on-surface-variant">Latency</span><p class="font-bold">${sys.latency}</p></div>
                <div><span class="text-on-surface-variant">Health</span><p class="font-bold ${healthColor}">${sys.health}%</p></div>
                <div><span class="text-on-surface-variant">Version</span><p class="font-bold">${sys.version}</p></div>
              </div>
              <div class="flex flex-wrap gap-1.5" data-int-actions="${sys.key}">
                ${s === 'disconnected' || s === 'error' ? `<button class="int-connect flex-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90">${s === 'error' ? 'Reconnect' : 'Connect'}</button>` : ''}
                ${s === 'connected' ? `<button class="int-disconnect flex-1 px-3 py-1.5 rounded-lg border border-error/40 text-error text-xs font-bold hover:bg-error/5">Disconnect</button>` : ''}
                ${s === 'connected' ? `<button class="int-reconnect flex-1 px-3 py-1.5 rounded-lg bg-secondary-container/50 text-on-secondary-container text-xs font-bold hover:bg-secondary-container">Reconnect</button>` : ''}
                <button class="int-configure flex-1 px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant text-xs font-bold hover:bg-outline-variant/40">Configure</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;

      wireIntegrationActions(systems);
    }).catch(() => { host.innerHTML = '<div class="md:col-span-12 text-center py-20 text-error">Failed to load integrations.</div>'; });
  }

  function wireIntegrationActions(systems) {
    document.querySelectorAll('.int-connect, .int-reconnect').forEach(btn => {
      btn.addEventListener('click', async function() {
        const card = this.closest('.integration-card');
        const key = card.dataset.key;
        const sys = systems.find(s => s.key === key);
        if (!sys) return;
        card.querySelector('[data-int-actions]').innerHTML = '<span class="text-xs text-on-surface-variant w-full text-center py-1">Connecting...</span>';
        try {
          const res = await post('/api/integrations/' + key + '/connect', {});
          if (res && !res.error) { toast(key + ' connected'); renderIntegrations(); }
          else toast(res.error || 'Connection failed', false);
        } catch { toast('Connection failed', false); }
      });
    });
    document.querySelectorAll('.int-disconnect').forEach(btn => {
      btn.addEventListener('click', async function() {
        const card = this.closest('.integration-card');
        const key = card.dataset.key;
        if (!confirm('Disconnect ' + key + '?')) return;
        try {
          const res = await post('/api/integrations/' + key + '/disconnect', {});
          if (res && !res.error) { toast(key + ' disconnected'); renderIntegrations(); }
          else toast(res.error || 'Disconnect failed', false);
        } catch { toast('Disconnect failed', false); }
      });
    });
    document.querySelectorAll('.int-configure').forEach(btn => {
      btn.addEventListener('click', function() {
        const card = this.closest('.integration-card');
        const key = card.dataset.key;
        const sys = systems.find(s => s.key === key);
        if (!sys) return;
        const ints = (settings.integrations || {})[key] || {};
        openModal('Configure: ' + key, `
          <p class="text-sm text-on-surface-variant mb-3">Connection settings for <strong>${sys.name}</strong></p>
          <form id="ym-int-config-form" class="space-y-3">
            <label class="block"><span class="font-bold text-sm text-on-surface-variant">Endpoint URL</span><input name="endpoint" class="w-full glass-input rounded-lg px-md py-2.5 mt-1 text-sm" value="${ints.endpoint || 'https://' + key.toLowerCase() + '.company.com/api'}"></label>
            <label class="block"><span class="font-bold text-sm text-on-surface-variant">API Key</span><input name="apiKey" type="password" class="w-full glass-input rounded-lg px-md py-2.5 mt-1 text-sm" value="${ints.apiKey || ''}" placeholder="Enter API key"></label>
            <label class="block"><span class="font-bold text-sm text-on-surface-variant">Polling Interval (seconds)</span><input name="interval" type="number" class="w-full glass-input rounded-lg px-md py-2.5 mt-1 text-sm" value="${ints.interval || 30}"></label>
            <div class="flex gap-2 pt-2"><button type="submit" class="flex-1 shimmer-btn primary-gradient text-on-primary py-2.5 rounded-lg font-bold">Save Configuration</button><button type="button" class="flex-1 px-md py-2.5 rounded-lg border border-outline-variant/40 text-on-surface-variant font-medium ym-close-modal2">Cancel</button></div>
          </form>
        `, null);
        document.getElementById('ym-int-config-form').addEventListener('submit', async e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const subBtn = e.currentTarget.querySelector('button[type="submit"]');
          subBtn.disabled = true; subBtn.textContent = 'Saving...';
          try {
            const res = await post('/api/integrations/' + key + '/configure', { endpoint: fd.get('endpoint'), apiKey: fd.get('apiKey'), interval: parseInt(fd.get('interval')) || 30 });
            if (res && !res.error) { toast(key + ' configuration saved'); closeModal(); renderIntegrations(); }
            else toast(res.error || 'Save failed', false);
          } catch { toast('Save failed', false); }
          subBtn.disabled = false; subBtn.textContent = 'Save Configuration';
        });
      });
    });
  }

  // ──────────────── SECURITY TAB ────────────────
  function renderSecurity() {
    activateTab('Security');
    const host = document.getElementById('ym-settings-content');
    showLoading(host);
    get('/api/user/preferences').then(prefs => {
      settings = prefs; const sessions = prefs.sessions || []; const p = prefs.prefs || {};
      const twoFA = p.twoFactorEnabled || false;
      host.innerHTML = `
        <div class="md:col-span-6 space-y-gutter">
          <div class="glass-card rounded-xl p-md">
            <h3 class="font-section-header text-section-header mb-sm">Change Password</h3>
            <form id="ym-password-form" class="space-y-3">
              <label class="block"><span class="font-bold text-sm text-on-surface-variant">Current Password</span><input name="currentPassword" type="password" class="w-full glass-input rounded-lg px-md py-2.5 mt-1 text-sm" required></label>
              <label class="block"><span class="font-bold text-sm text-on-surface-variant">New Password</span><input name="newPassword" id="ym-new-pw" type="password" class="w-full glass-input rounded-lg px-md py-2.5 mt-1 text-sm" required minlength="8"></label>
              <div id="ym-pw-strength" class="hidden"><div class="h-1.5 rounded-full bg-outline-variant/50 mt-1 overflow-hidden"><div id="ym-pw-bar" class="h-full rounded-full transition-all" style="width:0%"></div></div><p id="ym-pw-label" class="text-xs mt-0.5"></p></div>
              <label class="block"><span class="font-bold text-sm text-on-surface-variant">Confirm New Password</span><input name="confirmPassword" id="ym-confirm-pw" type="password" class="w-full glass-input rounded-lg px-md py-2.5 mt-1 text-sm" required></label>
              <p id="ym-pw-match" class="text-xs hidden"></p>
              <button type="submit" class="w-full rounded-lg bg-primary text-white font-bold py-2.5 hover:opacity-90 transition-all">Update Password</button>
            </form>
          </div>
          <div class="glass-card rounded-xl p-md">
            <div class="flex items-center justify-between">
              <div><h3 class="font-section-header text-section-header">Two-Factor Authentication</h3><p class="text-xs text-on-surface-variant mt-0.5">Add an extra layer of security to your account.</p></div>
              <button id="ym-2fa-toggle" style="width:48px;height:28px;border-radius:999px;background:${twoFA ? '#413fd6' : '#c7c4d7'};position:relative;border:none;cursor:pointer;transition:background .2s"><div style="width:24px;height:24px;background:white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.15);position:absolute;top:2px;left:${twoFA ? '22px' : '2px'};transition:left .2s"></div></button>
            </div>
          </div>
        </div>
        <div class="md:col-span-6 glass-card rounded-xl p-md lg:p-xl">
          <div class="flex items-center justify-between mb-md">
            <div><h3 class="font-section-header text-section-header">Active Sessions</h3><p class="text-xs text-on-surface-variant mt-0.5">${sessions.length} active session${sessions.length !== 1 ? 's' : ''}</p></div>
            ${sessions.length > 1 ? '<button id="ym-signout-all" class="px-3 py-1.5 rounded-lg border border-error/40 text-error text-xs font-bold hover:bg-error/5">Sign Out Others</button>' : ''}
          </div>
          <div class="space-y-2" id="ym-sessions-list">
            ${sessions.length ? sessions.map((s, i) => `
              <div class="rounded-xl bg-white/70 border border-outline-variant/40 p-md session-card" data-idx="${i}">
                <div class="flex justify-between items-start">
                  <div class="flex items-center gap-2.5">
                    <span class="material-symbols-outlined text-on-surface-variant" style="font-size:22px">${s.device?.toLowerCase().includes('mobile') ? 'phone_android' : s.device?.toLowerCase().includes('tablet') ? 'tablet' : 'laptop'}</span>
                    <div><p class="font-bold text-sm">${escapeHtml(s.device || 'Unknown Device')}</p>
                    <p class="text-xs text-on-surface-variant">${escapeHtml(s.browser || '—')} · ${escapeHtml(s.location || '—')}</p>
                    <p class="text-xs text-on-surface-variant">Last active: ${s.lastSeen || 'Just now'}</p></div>
                  </div>
                  <div class="flex items-center gap-2">
                    ${s.current ? '<span class="text-secondary font-bold text-xs bg-secondary/10 px-2 py-0.5 rounded-full">Current</span>' : '<button class="ym-signout-session text-xs font-bold text-error hover:bg-error/5 px-2 py-1 rounded-lg">Sign Out</button>'}
                  </div>
                </div>
              </div>`).join('') : '<p class="text-sm text-on-surface-variant py-4 text-center">No active sessions.</p>'}
          </div>
        </div>`;

      // Password strength meter
      const newPw = document.getElementById('ym-new-pw');
      const pwStrength = document.getElementById('ym-pw-strength');
      const pwBar = document.getElementById('ym-pw-bar');
      const pwLabel = document.getElementById('ym-pw-label');
      const pwMatch = document.getElementById('ym-pw-match');
      const confirmPw = document.getElementById('ym-confirm-pw');

      newPw.addEventListener('input', () => {
        const v = newPw.value;
        if (!v) { pwStrength.classList.add('hidden'); return; }
        pwStrength.classList.remove('hidden');
        let score = 0;
        if (v.length >= 8) score++; if (v.length >= 12) score++;
        if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
        if (/\d/.test(v)) score++;
        if (/[^a-zA-Z0-9]/.test(v)) score++;
        const levels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
        const colors = ['#ba1a1a', '#774f00', '#986500', '#006b5f', '#006b5f'];
        const widths = ['20%', '40%', '60%', '80%', '100%'];
        pwBar.style.width = widths[score] || '0%';
        pwBar.style.background = colors[score] || '#e1dfff';
        pwLabel.textContent = levels[score] || '';
        pwLabel.style.color = colors[score] || 'inherit';
        checkMatch();
      });
      confirmPw.addEventListener('input', checkMatch);
      function checkMatch() {
        if (!confirmPw.value) { pwMatch.classList.add('hidden'); return; }
        pwMatch.classList.remove('hidden');
        if (newPw.value === confirmPw.value) { pwMatch.innerHTML = '<span class="text-secondary">✓ Passwords match</span>'; pwMatch.style.color = ''; }
        else { pwMatch.innerHTML = '<span class="text-error">✗ Passwords do not match</span>'; pwMatch.style.color = ''; }
      }

      document.getElementById('ym-password-form').addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const newPassword = fd.get('newPassword');
        const confirm = fd.get('confirmPassword');
        if (newPassword !== confirm) { toast('Passwords do not match', false); return; }
        if (newPassword.length < 8) { toast('Password must be at least 8 characters', false); return; }
        const subBtn = e.currentTarget.querySelector('button[type="submit"]');
        subBtn.disabled = true; subBtn.textContent = 'Updating...';
        try {
          const result = await post('/api/user/change-password', { currentPassword: fd.get('currentPassword'), newPassword });
          if (result.ok) { toast('Password updated'); e.currentTarget.reset(); pwStrength.classList.add('hidden'); pwMatch.classList.add('hidden'); }
          else toast(result.error || 'Password update failed', false);
        } catch { toast('Password update failed', false); }
        subBtn.disabled = false; subBtn.textContent = 'Update Password';
      });

      // 2FA toggle
      document.getElementById('ym-2fa-toggle').addEventListener('click', async function() {
        const wasEnabled = twoFA;
        const newVal = !wasEnabled;
        this.style.background = newVal ? '#413fd6' : '#c7c4d7';
        this.querySelector('div').style.left = newVal ? '22px' : '2px';
        try {
          const res = await patch('/api/user/preferences', { prefs: { twoFactorEnabled: newVal } });
          if (res && res.prefs) settings.prefs = res.prefs;
          toast(newVal ? '2FA enabled' : '2FA disabled');
        } catch { toast('Failed to update 2FA', false); }
      });

      // Sign out session
      document.querySelectorAll('.ym-signout-session').forEach(btn => {
        btn.addEventListener('click', async function() {
          const card = this.closest('.session-card');
          const idx = card.dataset.idx;
          if (!confirm('Sign out this session?')) return;
          try {
            const res = await del('/api/user/sessions/' + idx);
            if (res && !res.error) { toast('Session signed out'); renderSecurity(); }
            else toast(res.error || 'Failed to sign out', false);
          } catch { toast('Failed to sign out', false); }
        });
      });

      // Sign out all other devices
      const signoutAll = document.getElementById('ym-signout-all');
      if (signoutAll) {
        signoutAll.addEventListener('click', async function() {
          if (!confirm('Sign out all other devices? You will remain logged in here.')) return;
          try {
            const res = await del('/api/user/sessions');
            if (res && !res.error) { toast('Other sessions signed out'); renderSecurity(); }
            else toast(res.error || 'Failed to sign out', false);
          } catch { toast('Failed to sign out', false); }
        });
      }
    }).catch(() => { host.innerHTML = '<div class="md:col-span-12 text-center py-20 text-error">Failed to load security data.</div>'; });
  }

  // ──────────────── MODAL UTILITY ────────────────
  let activeModal = null;

  function openModal(title, body, onSave) {
    closeModal();
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop ym-modal';
    wrap.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:14px">
        <h2 style="font:700 20px/1.2 Geist,system-ui,sans-serif;color:#191a28">${title}</h2>
        <button class="ym-close-modal-top" style="border:0;background:#eeecff;border-radius:999px;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined" style="font-size:20px">close</span></button>
      </div>
      <div>${body}</div>
    </div>`;
    wrap.addEventListener('click', e => { if (e.target === wrap) closeModal(); });
    wrap.querySelector('.ym-close-modal-top').addEventListener('click', closeModal);
    wrap.querySelectorAll('.ym-close-modal2').forEach(el => el.addEventListener('click', closeModal));
    document.body.appendChild(wrap);
    activeModal = wrap;
    if (onSave) {
      document.getElementById('ym-role-save')?.addEventListener('click', onSave);
    }
  }

  function closeModal() {
    if (activeModal) { activeModal.remove(); activeModal = null; }
  }

  // ──────────────── INIT ────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;
    const tabActions = {
      Profile: renderProfile,
      Notifications: renderNotifications,
      'Team & Roles': renderTeam,
      Integrations: renderIntegrations,
      Security: renderSecurity,
    };
    document.querySelectorAll('main .flex.gap-gutter button').forEach(btn => {
      const text = btn.textContent.trim();
      btn.addEventListener('click', () => (tabActions[text] || renderProfile)());
    });
    renderProfile();
  });
})();
