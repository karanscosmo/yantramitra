(function() {
  const API = { base: '' };
  async function get(path) {
    const r = await fetch(API.base + path, { credentials: 'same-origin' });
    if (!r.ok) throw new Error(path);
    return r.json();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const setCount = (name, value) => {
      const node = document.querySelector(`[data-ym-count="${name}"]`);
      const numeric = Number(value);
      if (node && Number.isFinite(numeric)) node.textContent = numeric.toLocaleString();
    };

    const refreshStats = async () => {
      try {
        const stats = await get('/api/public/stats');
        setCount('facilities', stats.facilities || 5);
        setCount('machines', stats.machines || 29);
        setCount('sensors', stats.sensors || 174);
      } catch {
        setCount('facilities', 5);
        setCount('machines', 29);
        setCount('sensors', 174);
      }
    };

    refreshStats();

    const modal = document.getElementById('ym-contact-modal');
    const status = document.querySelector('[data-contact-status]');
    const openContact = () => {
      if (!modal) return;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      modal.querySelector('input')?.focus();
    };
    const closeContact = () => {
      if (!modal) return;
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    };

    document.querySelectorAll('[data-contact-sales]').forEach(btn => {
      btn.addEventListener('click', openContact);
    });
    document.querySelector('[data-close-contact]')?.addEventListener('click', closeContact);
    modal?.addEventListener('click', event => {
      if (event.target === modal) closeContact();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeContact();
    });

    document.querySelector('[data-contact-form]')?.addEventListener('submit', event => {
      event.preventDefault();
      if (status) status.classList.remove('hidden');
    });

    document.querySelector('[data-watch-demo]')?.addEventListener('click', () => {
      document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    (async () => {
      try {
        const me = await get('/api/auth/me');
        if (me && me.id) {
          document.querySelectorAll('.auth-show').forEach(el => el.style.display = '');
          document.querySelectorAll('.auth-hide').forEach(el => el.style.display = 'none');
        }
      } catch {}
    })();
  });
})();
