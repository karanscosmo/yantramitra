(function() {
  async function get(path) { const r = await fetch(path); return r.json(); }
  async function patch(path, body) { const r = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }
  const roleMap = {
    'plant-manager': 'plant_manager',
    'reliability-engineer': 'maintenance',
    'maintenance-supervisor': 'maintenance',
    technician: 'operator',
    operator: 'operator',
    maintenance: 'maintenance',
    plant_manager: 'plant_manager',
    executive: 'executive'
  };

  function selectedRole() {
    const selected = document.querySelector('[data-role].selected');
    const raw = selected ? selected.dataset.role : 'operator';
    return roleMap[raw] || 'operator';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const me = await get('/api/auth/me');
      if (!me || !me.id) { window.location.href = '/'; return; }
    } catch { window.location.href = '/'; return; }

    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await patch('/api/user/profile', {
            name: (form.querySelector('input[type="text"]') || {}).value || undefined,
            role: selectedRole()
          });
        } catch {}
        window.location.href = '/dashboard';
      });
    });

    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
      if (btn.dataset.role) return;
      if (btn.id !== 'continue-btn') {
        btn.addEventListener('click', async () => {
          try {
            await patch('/api/user/profile', { role: selectedRole() });
          } catch {}
          window.location.href = '/dashboard';
        });
      }
    });

    const links = document.querySelectorAll('a');
    links.forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = a.getAttribute('href') === '#' ? '/dashboard' : a.href;
      });
    });

    const inputs = document.querySelectorAll('input');
    const nextBtn = document.querySelector('button[type="submit"]') || document.querySelector('button:last-child');
    inputs.forEach(inp => {
      inp.addEventListener('input', () => {
        const filled = Array.from(inputs).every(i => i.value.trim().length > 0);
        if (nextBtn) nextBtn.disabled = !filled;
      });
    });

    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', async () => {
        if (continueBtn.disabled) return;
        try {
          await patch('/api/user/profile', { role: selectedRole() });
        } catch {}
        window.location.href = '/dashboard';
      });
    }
  });
})();
