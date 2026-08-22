(() => {
  const AUTH_BASE = 'https://ep-wandering-hill-ay3garr2.neonauth.c-5.us-east-2.aws.neon.tech/neondb/auth';
  const PRODUCTION_ORIGIN = 'https://oraclerpg2-0.vercel.app';

  function appOrigin() {
    const host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return location.origin;
    return PRODUCTION_ORIGIN;
  }

  async function request(path, options = {}) {
    const response = await fetch(`${AUTH_BASE}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    const text = await response.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = { message: text }; }
    }

    if (!response.ok) {
      const message = data?.message || data?.error?.message || data?.error || `Erro de autenticação (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  async function getSession() {
    try {
      return await request('/get-session', { method: 'GET', headers: {} });
    } catch (error) {
      if (error.status === 401) return null;
      throw error;
    }
  }

  async function signUpEmail({ name, email, password }) {
    return request('/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        callbackURL: `${appOrigin()}/`,
      }),
    });
  }

  async function signInEmail({ email, password, rememberMe = true }) {
    return request('/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        rememberMe,
        callbackURL: `${appOrigin()}/`,
      }),
    });
  }

  async function signInGoogle() {
    const origin = appOrigin();
    const data = await request('/sign-in/social', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'google',
        callbackURL: `${origin}/`,
        errorCallbackURL: `${origin}/account.html?authError=google`,
      }),
    });

    if (data?.url) {
      location.assign(data.url);
      return;
    }

    throw new Error('O Google não retornou uma URL de autenticação.');
  }

  async function signOut() {
    return request('/sign-out', { method: 'POST', body: '{}' });
  }

  window.OracleAuth = {
    baseURL: AUTH_BASE,
    getSession,
    signUpEmail,
    signInEmail,
    signInGoogle,
    signOut,
  };
})();
