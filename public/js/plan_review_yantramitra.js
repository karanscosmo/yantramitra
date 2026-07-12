(function() {
  async function get(path) { const r = await fetch(path, { credentials: 'same-origin' }); if (!r.ok) throw new Error(path); return r.json(); }
  async function post(path, body) { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) }); if (!r.ok) throw new Error(path); return r.json(); }
  async function patch(path, body) { const r = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) }); if (!r.ok) throw new Error(path); return r.json(); }

  let plans = [];

  function toast(msg, type) {
    const el = document.getElementById('ym-toast');
    if (!el) return;
    document.getElementById('ym-toast-msg').textContent = msg;
    document.getElementById('ym-toast-type').textContent = type === 'error' ? 'Action Failed' : 'Action Confirmed';
    el.querySelector('.w-8').className = 'w-8 h-8 rounded-full ' + (type === 'error' ? 'bg-error text-on-error' : 'bg-secondary text-on-secondary') + ' flex items-center justify-center';
    el.classList.remove('translate-y-32', 'opacity-0');
    setTimeout(() => el.classList.add('translate-y-32', 'opacity-0'), 3000);
  }

  function openModal(title, body) {
    document.querySelector('.modal-backdrop')?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:14px">
        <h2 style="font:900 24px/1.2 Inter,system-ui,sans-serif;color:#191a28">${title}</h2>
        <button class="ym-close-modal" style="border:0;background:#eeecff;border-radius:999px;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div>${body}</div>
    </div>`;
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.ym-close-modal')) wrap.remove(); });
    document.body.appendChild(wrap);
  }

  function renderExpandableReasoning(plan) {
    const sensorEvidence = [
      { sensor: 'TH-004-B', metric: 'Temperature', value: '94.2°C', baseline: '76.0°C', delta: '+18.2°C', status: 'critical' },
      { sensor: 'VB-002-A', metric: 'Vibration', value: '84 Hz', baseline: '32 Hz', delta: '+52 Hz', status: 'warning' },
      { sensor: 'PR-001-C', metric: 'Pressure', value: '4.2 bar', baseline: '3.8 bar', delta: '+0.4 bar', status: 'normal' }
    ];
    return `<div class="grid grid-cols-12 gap-md">
      <div class="col-span-12 lg:col-span-7">
        <h4 class="font-label-caps text-on-surface-variant mb-md flex items-center gap-2"><span class="material-symbols-outlined text-sm">psychology</span> AI Reasoning Trace</h4>
        <div class="ml-4 border-l-2 border-outline-variant/30 space-y-md pl-6">
          <div><p class="font-semibold text-on-surface text-sm">Anomaly Detection</p><p class="text-xs text-on-surface-variant mt-1">Temperature variance in Sector 4 exceeded baseline by 18K. Vibration signatures (84Hz) match fatigue patterns observed in 2021 manifold failure.</p></div>
          <div><p class="font-semibold text-on-surface text-sm">Hypothesis Testing</p><p class="text-xs text-on-surface-variant mt-1">Evaluated partial calibration vs. full replacement. Partial calibration predicted failure within 400 operational hours. Full replacement ensures 12k hours stability.</p></div>
          <div><p class="font-semibold text-on-surface text-sm">Outcome Optimization</p><p class="text-xs text-on-surface-variant mt-1">Recommended strategy optimizes for Zero Unscheduled Downtime objective with 12.5% reduction in energy overhead.</p></div>
        </div>
      </div>
      <div class="col-span-12 lg:col-span-5 space-y-md">
        <h4 class="font-label-caps text-on-surface-variant mb-md flex items-center gap-2"><span class="material-symbols-outlined text-sm">data_thresholding</span> Sensor Evidence</h4>
        <div class="space-y-xs">${sensorEvidence.map(s => `<div class="bg-surface-container-low rounded-lg p-3 border border-outline-variant/30">
          <div class="flex justify-between items-center">
            <p class="font-label-caps text-[9px] text-on-surface-variant">${s.sensor} · ${s.metric}</p>
            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${s.status === 'critical' ? 'bg-error/10 text-error' : s.status === 'warning' ? 'bg-tertiary/10 text-tertiary' : 'bg-secondary/10 text-secondary'}">${s.status.toUpperCase()}</span>
          </div>
          <div class="flex justify-between items-end mt-1">
            <div><span class="font-bold text-sm">${s.value}</span><span class="text-[10px] text-on-surface-variant ml-1">vs ${s.baseline}</span></div>
            <span class="text-[10px] font-bold ${s.delta.startsWith('+') ? 'text-error' : 'text-secondary'}">${s.delta}</span>
          </div>
        </div>`).join('')}</div>
        <h4 class="font-label-caps text-on-surface-variant mb-sm mt-md">Historical Comparison</h4>
        <div class="bg-surface-container-low rounded-lg p-3 border border-outline-variant/30">
          <div class="flex items-center gap-2"><span class="material-symbols-outlined text-secondary text-lg">history</span><p class="text-[11px] leading-tight">Last maintenance: <strong>14 Mar 2024</strong><br>Similar failure: <strong>21 Jun 2023</strong> (Manifold crack)</p></div>
        </div>
        <h4 class="font-label-caps text-on-surface-variant mb-sm mt-md">Root Cause</h4>
        <div class="bg-primary/5 rounded-lg p-3 border border-primary/10">
          <p class="text-xs text-on-surface">Thermal fatigue cycling in coolant manifold joint J-7 due to repeated thermal gradient exceeding design spec by 18.4°K over 14 consecutive cycles.</p>
        </div>
        <h4 class="font-label-caps text-on-surface-variant mb-sm mt-md">Confidence Explanation</h4>
        <div class="bg-surface-container-low rounded-lg p-3 border border-outline-variant/30">
          <p class="text-xs text-on-surface-variant">Confidence score 98.4% based on: (1) strong sensor correlation across 3 independent metrics, (2) 2 prior identical failure signatures in maintenance history, (3) AI model ensemble agreement of 97.2% across 5 diagnostic models.</p>
        </div>
        <h4 class="font-label-caps text-on-surface-variant mb-sm mt-md">Maintenance Recommendation</h4>
        <div class="bg-secondary/5 rounded-lg p-3 border border-secondary/20">
          <p class="text-xs text-on-surface">Full replacement of coolant circulation manifold assembly. Estimated downtime: 4.5 hours. Required parts: Manifold assembly (SKU: MNF-0042), Gasket set (SKU: GSK-0018), Coolant 5L (SKU: CLT-0001).</p>
        </div>
      </div>
    </div>`;
  }

  function renderPlanCard(plan) {
    const isApproved = plan.status === 'approved';
    const isRejected = plan.status === 'rejected';
    const confidences = [98.4, 99.9, 82.1, 94.5];
    const severities = ['high', 'low', 'critical', 'routine'];
    const machineNames = ['Turbine-7', 'Main Line Controller', 'HVAC Compressor', 'Grid Load-Balancing'];
    const plantNames = ['Pune Automotive', 'Chennai Electronics', 'Ahmedabad Process', 'Bengaluru Precision'];
    const agents = ['Planner-Agent-P7', 'Firmware-Agent-C4', 'HVAC-Agent-A1', 'Grid-Agent-G2'];
    const savings = ['₹2.4L/yr', '₹85K/yr', '₹4.1L/yr', '₹1.2L/yr'];
    const downtimeReductions = ['14.2%', '8.7%', '22.1%', '6.3%'];
    const risks = ['Medium', 'Low', 'High', 'Low'];
    const conf = plan.confidence || confidences[plans.indexOf(plan) % confidences.length];
    const severity = plan.severity || severities[plans.indexOf(plan) % severities.length];
    const machine = plan.machineName || machineNames[plans.indexOf(plan) % machineNames.length];
    const plant = plan.plantName || plantNames[plans.indexOf(plan) % plantNames.length];
    const agent = plan.agentName || agents[plans.indexOf(plan) % agents.length];
    const saving = plan.estimatedSavings || savings[plans.indexOf(plan) % savings.length];
    const downtime = plan.downtimeReduction || downtimeReductions[plans.indexOf(plan) % downtimeReductions.length];
    const risk = plan.risk || risks[plans.indexOf(plan) % risks.length];
    const severityColors = { critical: '#ba1a1a', high: '#413fd6', low: '#006b5f', routine: '#464555' };
    const riskColors = { High: '#ba1a1a', Medium: '#774f00', Low: '#006b5f' };

    return `<div class="glass-card rounded-xl overflow-hidden p-0 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_40px_-12px_rgba(65,63,214,0.2)] transition-all ${isApproved ? 'card-approved' : isRejected ? 'card-rejected' : ''}" id="plan-${plan.id}">
      <div class="p-md cursor-pointer flex items-center justify-between gap-md" data-toggle="${plan.id}">
        <div class="flex items-center gap-md">
          <div class="w-14 h-14 rounded-lg bg-primary-container/20 flex items-center justify-center border border-primary-container/30">
            <span class="material-symbols-outlined text-primary text-3xl">${plan.type === 'maintenance' ? 'ac_unit' : plan.type === 'optimization' ? 'bolt' : 'settings'}</span>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-kpi-numeric text-on-surface">${plan.title}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" style="background:${severityColors[severity] || '#464555'}20;color:${severityColors[severity] || '#464555'};border:1px solid ${severityColors[severity] || '#464555'}30">${severity.toUpperCase()}</span>
              ${isApproved ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container text-on-secondary-container">APPROVED</span>' : ''}
              ${isRejected ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-container text-on-error-container">REJECTED</span>' : ''}
            </div>
            <p class="text-on-surface-variant text-sm mt-0.5"><span class="font-medium">${machine}</span> · ${plant} · ${agent}</p>
            <div class="flex items-center gap-md mt-1">
              <span class="text-[10px] text-on-surface-variant">${new Date(plan.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span class="text-[10px] text-secondary font-bold">Savings: ${saving}</span>
              <span class="text-[10px] text-primary font-bold">Downtime: ${downtime}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-md shrink-0">
          <div class="text-right">
            <p class="font-label-caps text-on-surface-variant text-[10px]">Confidence</p>
            <p class="font-kpi-numeric text-xl" style="color:${riskColors[risk] || '#413fd6'}">${conf}%</p>
            <p class="text-[9px] font-bold" style="color:${riskColors[risk] || '#413fd6'}">Risk: ${risk}</p>
          </div>
          <span class="material-symbols-outlined text-outline transition-transform chevron">expand_more</span>
        </div>
      </div>
      <div class="expand-content">
        <div class="overflow-hidden">
          <div class="px-md pb-md border-t border-outline-variant/20 pt-md">
            <p class="text-sm text-on-surface-variant mb-md">${plan.description || 'AI-generated maintenance plan based on sensor data analysis and historical failure patterns.'}</p>
            ${!isApproved && !isRejected ? renderExpandableReasoning(plan) : '<div class="bg-primary/5 rounded-lg p-4 text-center"><p class="text-on-surface-variant">Plan has been ' + plan.status + '. View details in the approval history.</p></div>'}
            <div class="flex gap-sm pt-4 border-t border-outline-variant/10 mt-md">
              ${!isApproved && !isRejected ? `
              <button class="flex-1 shimmer-btn text-on-primary py-3 px-6 rounded-full font-label-caps tracking-wider flex items-center justify-center gap-2 transition-all" data-action="approve" data-plan-id="${plan.id}"><span class="material-symbols-outlined text-sm">check_circle</span> APPROVE</button>
              <button class="px-6 py-3 rounded-full border border-outline text-on-surface-variant hover:bg-on-surface/5 font-label-caps tracking-wider transition-all" data-action="reject" data-plan-id="${plan.id}">REJECT</button>
              <button class="px-6 py-3 rounded-full border border-primary/30 text-primary font-label-caps tracking-wider transition-all hover:bg-primary/5" data-action="details" data-plan-id="${plan.id}">DETAILS</button>
              <button class="px-6 py-3 rounded-full border border-tertiary/30 text-tertiary font-label-caps tracking-wider transition-all hover:bg-tertiary/5" data-action="override" data-plan-id="${plan.id}">OVERRIDE</button>
              ` : `
              <button class="flex-1 py-3 px-6 rounded-full border border-primary/30 text-primary font-label-caps tracking-wider transition-all hover:bg-primary/5" data-action="details" data-plan-id="${plan.id}">VIEW DETAILS</button>
              `}
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  async function loadPlans() {
    try {
      plans = await get('/api/plans');
      const container = document.getElementById('ym-plans-container');
      if (!container) return;
      const pending = plans.filter(p => p.status === 'pending').length;
      document.getElementById('ym-plan-count').textContent = pending + ' Pending Action' + (pending !== 1 ? 's' : '');
      container.innerHTML = plans.map(renderPlanCard).join('');
      container.querySelectorAll('[data-toggle]').forEach(el => {
        el.addEventListener('click', function() {
          const id = this.dataset.toggle;
          const card = document.getElementById('plan-' + id);
          if (!card) return;
          const wasExpanded = card.classList.contains('expanded');
          document.querySelectorAll('.glass-card.expanded').forEach(c => c.classList.remove('expanded'));
          if (!wasExpanded) {
            card.classList.add('expanded');
            card.querySelector('.chevron').style.transform = 'rotate(180deg)';
          }
        });
      });
      container.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', async function(e) {
          e.stopPropagation();
          const action = this.dataset.action;
          const planId = this.dataset.planId;
          const plan = plans.find(p => p.id === planId);
          if (!plan) return;
          if (action === 'approve') {
            try {
              await patch('/api/plans/' + planId, { status: 'approved' });
              toast('Plan approved: ' + plan.title, 'success');
              await loadPlans();
            } catch (e) { toast('Failed to approve plan', 'error'); }
          } else if (action === 'reject') {
            try {
              await patch('/api/plans/' + planId, { status: 'rejected' });
              toast('Plan rejected: ' + plan.title, 'success');
              await loadPlans();
            } catch (e) { toast('Failed to reject plan', 'error'); }
          } else if (action === 'details') {
            const card = document.getElementById('plan-' + planId);
            if (card) {
              card.classList.toggle('expanded');
              const chevron = card.querySelector('.chevron');
              if (chevron) chevron.style.transform = card.classList.contains('expanded') ? 'rotate(180deg)' : 'rotate(0deg)';
            }
          } else if (action === 'override') {
            try {
              await patch('/api/plans/' + planId, { status: 'approved' });
              await post('/api/timeline/event', { orderId: planId, event: 'overridden', actor: 'Manager' }).catch(() => {});
              toast('Plan overridden and approved: ' + plan.title, 'success');
              await loadPlans();
            } catch (e) { toast('Failed to override plan', 'error'); }
          }
        });
      });
    } catch (e) { console.error('loadPlans error:', e); }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const me = await get('/api/auth/me');
      if (!me || !me.id) { window.location.href = '/login'; return; }
    } catch { window.location.href = '/login'; return; }
    await loadPlans();
  });
})();