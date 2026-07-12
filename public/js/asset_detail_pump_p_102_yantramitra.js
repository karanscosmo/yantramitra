(function() {
  async function get(path) { const r = await fetch(path); return r.json(); }

  async function checkAuth() {
    try { const me = await get('/api/auth/me'); if (!me || !me.id) window.location.href = '/login'; return me; }
    catch { window.location.href = '/login'; return null; }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;

    const assetId = window.location.pathname.split('/assets/')[1] || '';
    try {
      const machines = await get('/api/machines');
      const slugify = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let machine = machines.find(m => m.id === assetId) ||
        machines.find(m => slugify(m.name) === assetId) ||
        machines.find(m => m.name.includes('Pump')) ||
        machines[0];
      const details = await get('/api/machines/' + (machine?.id || assetId));

      if (details) {
        document.querySelectorAll('h1').forEach(el => {
          if (el.textContent.includes('Pump') || el.textContent.includes('Asset') || el.textContent.includes('Detail')) {
            el.textContent = details.name + ' — Asset Detail';
          }
        });

        const statEls = document.querySelectorAll('.font-kpi-numeric, .text-2xl.font-bold, .text-3xl');
        statEls.forEach(el => {
          const text = el.textContent.trim();
          if (text.includes('%') || parseFloat(text) > 0) {
            el.textContent = details.health.toFixed(1) + '%';
          }
        });

        const statusIndicators = document.querySelectorAll('[class*="pulsing"]');
        statusIndicators.forEach(el => {
          el.className = 'w-3 h-3 rounded-full ' +
            (details.status === 'running' ? 'bg-secondary pulsing-green' : details.status === 'warning' || details.status === 'maintenance' ? 'bg-tertiary pulsing-amber' : 'bg-outline');
        });
      }

      if (details && details.readings) {
        const readingContainers = document.querySelectorAll('[class*="h-32"], [class*="h-40"], [class*="h-48"]');
        readingContainers.forEach(container => {
          const svg = container.querySelector('svg');
          if (svg) {
            try {
              const metrics = ['temperature', 'vibration', 'pressure', 'rpm'];
              const metricData = {};
              details.readings.forEach(r => {
                if (!metricData[r.metric]) metricData[r.metric] = [];
                metricData[r.metric].push(r.value);
              });
              const metric = metrics[Math.floor(Math.random() * metrics.length)];
              const vals = metricData[metric] || [65, 70, 68, 72, 75, 71, 69];
              const max = Math.max(...vals, 1);
              const pathEl = svg.querySelector('path');
              if (pathEl) {
                const points = vals.map((v, i) => {
                  const x = (i / (vals.length - 1)) * 100;
                  const y = 25 - ((v / max) * 20);
                  return x + ',' + y;
                }).join(' L');
                pathEl.setAttribute('d', 'M' + points);
              }
            } catch {}
          }
        });
      }
    } catch {}

    document.querySelectorAll('a[href="#"]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const txt = a.textContent.trim().toLowerCase();
        if (txt.includes('dashboard')) window.location.href = '/dashboard';
        else if (txt.includes('asset')) window.location.href = '/assets';
        else if (txt.includes('work')) window.location.href = '/work-orders';
      });
    });
  });
})();
