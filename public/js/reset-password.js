(function() {
  async function post(path, body) {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, data: await r.json() };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    if (!form) return;

    const emailInput = form.querySelector('input[type="email"]');
    const passwordInputs = form.querySelectorAll('input[type="password"]');
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorEl = document.createElement('p');
    errorEl.className = 'text-error text-sm mt-2 hidden';
    form.appendChild(errorEl);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = passwordInputs[0] ? passwordInputs[0].value : '';

      if (passwordInputs.length > 1 && password !== passwordInputs[1].value) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.classList.remove('hidden');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Resetting...';

      const { status, data } = await post('/api/auth/reset-password', {
        email: emailInput ? emailInput.value.trim() : '',
        password: password
      });

      if (status === 200) {
        errorEl.className = 'text-secondary text-sm mt-2';
        errorEl.textContent = 'Password reset successful! Redirecting to login...';
        errorEl.classList.remove('hidden');
        setTimeout(() => window.location.href = '/', 2000);
      } else {
        errorEl.textContent = data.error || 'Reset failed';
        errorEl.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset Password';
      }
    });
  });
})();
