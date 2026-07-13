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
    const emailInput = form.querySelector('#signup-email');
    const passwordInput = form.querySelector('#password-input');
    const nameInput = form.querySelector('#signup-name');
    const roleInput = form.querySelector('select');
    const termsInput = form.querySelector('#terms');
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorEl = document.createElement('p');
    errorEl.className = 'text-error text-sm mt-2 hidden';
    errorEl.setAttribute('role', 'alert');
    errorEl.setAttribute('aria-live', 'polite');
    form.appendChild(errorEl);

    const defaultButtonContent = submitBtn.innerHTML;

    function showError(message) {
      errorEl.innerHTML = message;
      errorEl.classList.remove('hidden');
    }

    function resetSubmitButton() {
      submitBtn.disabled = false;
      submitBtn.classList.remove('signup-success');
      submitBtn.innerHTML = defaultButtonContent;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (termsInput && !termsInput.checked) {
        showError('Please accept the Terms and Privacy Policy to continue.');
        termsInput.focus();
        return;
      }
      if (!nameInput.value.trim() || !emailInput.validity.valid || passwordInput.value.length < 8) {
        showError('Enter your full name, a valid work email, and a password of at least 8 characters.');
        (!nameInput.value.trim() ? nameInput : !emailInput.validity.valid ? emailInput : passwordInput).focus();
        return;
      }
      submitBtn.disabled = true;
      errorEl.classList.add('hidden');
      submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin" aria-hidden="true">sync</span> Creating account...';

      try {
        const { status, data } = await post('/api/auth/signup', {
          email: emailInput.value.trim(),
          password: passwordInput.value,
          name: nameInput.value.trim(),
          role: roleInput ? roleInput.value : 'operator'
        });

        if (status === 200) {
          submitBtn.classList.add('signup-success');
          submitBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">check_circle</span> Account created';
          window.setTimeout(() => { window.location.href = '/onboarding'; }, 450);
          return;
        }
        showError(data.error === 'Email already registered'
          ? 'This email already has an account. <a class="font-bold underline" href="/login">Sign in instead</a>.'
          : (data.error || 'Signup failed. Please check the form and try again.'));
      } catch {
        showError('Unable to create your account right now. Please try again.');
      } finally {
        if (!submitBtn.classList.contains('signup-success')) resetSubmitButton();
      }
    });
  });
})();
