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

    const googleErrors = {
      google_cancelled: 'Google sign-in was cancelled. Please try again or use email login.',
      google_error: 'Google sign-in encountered an error. Please try again.',
      google_auth_failed: 'Google authentication failed. Please try again.',
      missing_code: 'Authentication failed. Missing authorization code.',
      missing_id_token: 'Authentication failed. Invalid response from Google.',
    };

    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam && googleErrors[errorParam]) {
      errorEl.textContent = googleErrors[errorParam];
      errorEl.classList.remove('hidden');
    }

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
        if (data.googleAccount) {
          errorEl.innerHTML = 'This account uses Google sign-in. <a class="font-bold underline" href="/api/auth/google">Continue with Google</a>.';
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Initialize Session</span><span class="material-symbols-outlined">arrow_forward</span>';
      }
    });

    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
      googleBtn.addEventListener('click', () => {
        window.location.href = '/api/auth/google';
      });
    }
  });
})();
