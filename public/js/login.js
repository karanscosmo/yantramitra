(function() {
  async function post(path, body) {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, data: await r.json() };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorEl = document.createElement('p');
    errorEl.className = 'text-error text-sm mt-2 hidden';
    form.appendChild(errorEl);

    const forgotLink = document.querySelector('a[href="#"]');
    if (forgotLink) {
      forgotLink.setAttribute('href', '/reset-password');
      forgotLink.addEventListener('click', e => {
        e.preventDefault();
        window.location.href = '/reset-password';
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span>';

      const { status, data } = await post('/api/auth/login', {
        email: emailInput.value.trim(),
        password: passwordInput.value
      });

      if (status === 200) {
        window.location.href = '/dashboard';
      } else {
        errorEl.textContent = data.error || 'Invalid credentials';
        errorEl.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Initialize Session</span><span class="material-symbols-outlined">arrow_forward</span>';
      }
    });

    const ssoBtn = form.querySelector('button[type="button"]');
    if (ssoBtn) {
      ssoBtn.addEventListener('click', () => {
        errorEl.textContent = 'SSO is ready for your identity provider configuration. Use email login or request access from an administrator.';
        errorEl.classList.remove('hidden');
      });
    }
  });
})();
