(function() {
  async function post(path, body) {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body)
    });
    let data = {};
    try { data = await r.json(); } catch {}
    return { status: r.status, data };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    if (!form) return;
    const emailInput = form.querySelector('input[type="email"]');
    const passwordInput = form.querySelector('input[type="password"]');
    const nameInput = form.querySelector('input[type="text"]') || form.querySelector('input:not([type="email"]):not([type="password"])');
    const roleInput = form.querySelector('select');
    const termsInput = form.querySelector('#terms');
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorEl = document.createElement('p');
    errorEl.className = 'text-error text-sm mt-2 hidden';
    form.appendChild(errorEl);

    const inputs = form.querySelectorAll('input');
    inputs.forEach((inp, i) => { if (!inp.id) inp.id = 'signup-input-' + i; });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (termsInput && !termsInput.checked) {
        errorEl.textContent = 'Please accept the Terms and Privacy Policy to continue.';
        errorEl.classList.remove('hidden');
        return;
      }
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Creating account...';

      const { status, data } = await post('/api/auth/signup', {
        email: emailInput ? emailInput.value.trim() : '',
        password: passwordInput ? passwordInput.value : '',
        name: nameInput ? nameInput.value.trim() : '',
        role: roleInput ? roleInput.value : 'operator'
      });

      if (status === 200) {
        window.location.href = '/onboarding';
      } else {
        errorEl.innerHTML = data.error === 'Email already registered'
          ? 'This email already has an account. <a class="font-bold underline" href="/login">Sign in instead</a>.'
          : (data.error || 'Signup failed. Please check the form and try again.');
        errorEl.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Account';
      }
    });
  });
})();
