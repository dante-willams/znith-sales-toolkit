(function () {
  const STORAGE_KEY = 'znith_auth';
  const MODAL_ID = 'znith-auth-modal';

  function getStoredPassword() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  function setStoredPassword(pw) {
    localStorage.setItem(STORAGE_KEY, pw);
  }

  function clearStoredPassword() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function injectStyles() {
    if (document.getElementById('znith-auth-styles')) return;
    const style = document.createElement('style');
    style.id = 'znith-auth-styles';
    style.textContent = `
      #znith-auth-modal {
        position: fixed; inset: 0; z-index: 99999;
        display: flex; align-items: center; justify-content: center;
        background: rgba(10, 10, 20, 0.85);
        backdrop-filter: blur(6px);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      #znith-auth-modal .auth-card {
        background: #fff;
        border-radius: 16px;
        padding: 40px 36px 32px;
        width: 360px;
        max-width: calc(100vw - 32px);
        box-shadow: 0 24px 64px rgba(0,0,0,0.3);
        text-align: center;
      }
      #znith-auth-modal .auth-logo {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: #0f172a;
        margin-bottom: 6px;
      }
      #znith-auth-modal .auth-subtitle {
        font-size: 13px;
        color: #64748b;
        margin-bottom: 28px;
      }
      #znith-auth-modal input[type=password] {
        width: 100%;
        box-sizing: border-box;
        padding: 11px 14px;
        border: 1.5px solid #e2e8f0;
        border-radius: 10px;
        font-size: 15px;
        outline: none;
        color: #0f172a;
        transition: border-color 0.15s;
        margin-bottom: 12px;
      }
      #znith-auth-modal input[type=password]:focus {
        border-color: #6366f1;
      }
      #znith-auth-modal .auth-error {
        font-size: 12px;
        color: #ef4444;
        margin: -6px 0 10px;
        min-height: 16px;
      }
      #znith-auth-modal button {
        width: 100%;
        padding: 12px;
        background: #6366f1;
        color: #fff;
        border: none;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
      }
      #znith-auth-modal button:hover { background: #4f46e5; }
      #znith-auth-modal button:disabled { background: #a5b4fc; cursor: default; }
    `;
    document.head.appendChild(style);
  }

  function showModal(onSuccess, errorMsg) {
    injectStyles();
    let modal = document.getElementById(MODAL_ID);
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="auth-card">
        <div class="auth-logo">Znith Sales Toolkit</div>
        <div class="auth-subtitle">Enter your team password to continue</div>
        <input type="password" id="znith-pw-input" placeholder="Password" autocomplete="current-password" />
        <div class="auth-error" id="znith-pw-error">${errorMsg || ''}</div>
        <button id="znith-pw-btn">Unlock</button>
      </div>
    `;
    document.body.appendChild(modal);

    const input = modal.querySelector('#znith-pw-input');
    const btn = modal.querySelector('#znith-pw-btn');
    const errEl = modal.querySelector('#znith-pw-error');

    input.focus();

    async function attempt() {
      const pw = input.value.trim();
      if (!pw) return;
      btn.disabled = true;
      btn.textContent = 'Checking…';
      errEl.textContent = '';

      try {
        const res = await _nativeFetch('/api/claude', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-toolkit-password': pw,
          },
          body: JSON.stringify({
            _auth_check: true,
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });

        if (res.status === 401) {
          errEl.textContent = 'Incorrect password. Try again.';
          input.value = '';
          input.focus();
          btn.disabled = false;
          btn.textContent = 'Unlock';
          return;
        }

        setStoredPassword(pw);
        modal.remove();
        document.body.style.overflow = '';
        onSuccess();
      } catch (e) {
        errEl.textContent = 'Network error. Check your connection.';
        btn.disabled = false;
        btn.textContent = 'Unlock';
      }
    }

    btn.addEventListener('click', attempt);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') attempt();
    });
  }

  // Keep a reference to native fetch before patching
  const _nativeFetch = window.fetch.bind(window);

  // Single fetch wrapper: injects password header + handles 401 re-prompt
  window.fetch = function (url, options) {
    if (typeof url !== 'string' || !url.includes('/api/claude')) {
      return _nativeFetch(url, options);
    }

    options = options ? Object.assign({}, options) : {};
    options.headers = Object.assign({}, options.headers, {
      'x-toolkit-password': getStoredPassword(),
    });

    return _nativeFetch(url, options).then(function (res) {
      if (res.status !== 401) return res;

      // Password rejected — clear it and re-prompt, then retry
      clearStoredPassword();
      return new Promise(function (resolve) {
        document.body.style.overflow = 'hidden';
        showModal(function () {
          options.headers['x-toolkit-password'] = getStoredPassword();
          resolve(_nativeFetch(url, options));
        }, 'Session expired. Please re-enter the password.');
      });
    });
  };

  function init() {
    if (getStoredPassword()) return; // already authenticated

    injectStyles();
    document.body.style.overflow = 'hidden';
    showModal(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
