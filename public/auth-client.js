(() => {
  const SDK_URL = 'https://esm.sh/@neondatabase/auth@0.5.0-beta?bundle';
  const LEGACY_SECRET_STORAGE = 'oraclerpg.ai.providers.v1';

  try { localStorage.removeItem(LEGACY_SECRET_STORAGE); } catch (_) {}

  let clientPromise;
  let configPromise;

  async function getConfig() {
    if (!configPromise) {
      configPromise = fetch('/api/public-config', { cache: 'no-store', credentials: 'same-origin' })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.authBaseUrl) throw new Error(data.error || 'Configuração de autenticação indisponível.');
          return data;
        });
    }
    return configPromise;
  }

  async function getClient() {
    if (!clientPromise) {
      clientPromise = Promise.all([import(SDK_URL), getConfig()])
        .then(([{ createAuthClient }, config]) => createAuthClient(config.authBaseUrl));
    }
    return clientPromise;
  }

  function unwrap(result) {
    if (!result) return result;
    if (result.error) {
      const message = result.error.message || result.error.statusText || 'Erro de autenticação.';
      const error = new Error(message);
      error.status = result.error.status;
      error.data = result.error;
      throw error;
    }
    return Object.prototype.hasOwnProperty.call(result, 'data') ? result.data : result;
  }

  async function getSession() {
    const auth = await getClient();
    const result = await auth.getSession();
    return unwrap(result);
  }

  async function getApiAuthHeaders() {
    const data = await getSession();
    const token = data?.session?.token;
    if (!token) throw new Error('Sessão autenticada necessária.');
    return { Authorization: `Bearer ${token}` };
  }

  async function signUpEmail({ name, email, password }) {
    const auth = await getClient();
    const result = await auth.signUp.email({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      callbackURL: `${location.origin}/`,
    });
    return unwrap(result);
  }

  async function signInEmail({ email, password, rememberMe = true }) {
    const auth = await getClient();
    const result = await auth.signIn.email({
      email: email.trim().toLowerCase(),
      password,
      rememberMe,
      callbackURL: `${location.origin}/`,
    });
    return unwrap(result);
  }

  async function signInGoogle() {
    const auth = await getClient();
    const result = await auth.signIn.social({
      provider: 'google',
      callbackURL: `${location.origin}/`,
      errorCallbackURL: `${location.origin}/account.html?authError=google`,
    });
    return unwrap(result);
  }

  async function signOut() {
    const auth = await getClient();
    const result = await auth.signOut();
    return unwrap(result);
  }

  window.OracleAuth = {
    getSession,
    getApiAuthHeaders,
    signUpEmail,
    signInEmail,
    signInGoogle,
    signOut,
  };
})();
