(() => {
  const AUTH_BASE = 'https://ep-wandering-hill-ay3garr2.neonauth.c-5.us-east-2.aws.neon.tech/neondb/auth';
  const SDK_URL = 'https://esm.sh/@neondatabase/auth@0.5.0-beta?bundle';
  const CANONICAL_ORIGIN = 'https://oraclerpg2-0.vercel.app';

  let clientPromise;

  async function getClient() {
    if (!clientPromise) {
      clientPromise = import(SDK_URL).then(({ createAuthClient }) => createAuthClient(AUTH_BASE));
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

  async function signUpEmail({ name, email, password }) {
    const auth = await getClient();
    const result = await auth.signUp.email({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      callbackURL: `${CANONICAL_ORIGIN}/`,
    });
    return unwrap(result);
  }

  async function signInEmail({ email, password, rememberMe = true }) {
    const auth = await getClient();
    const result = await auth.signIn.email({
      email: email.trim().toLowerCase(),
      password,
      rememberMe,
      callbackURL: `${CANONICAL_ORIGIN}/`,
    });
    return unwrap(result);
  }

  async function signInGoogle() {
    const auth = await getClient();
    const result = await auth.signIn.social({
      provider: 'google',
      callbackURL: `${CANONICAL_ORIGIN}/`,
      errorCallbackURL: `${CANONICAL_ORIGIN}/account.html?authError=google`,
    });
    return unwrap(result);
  }

  async function signOut() {
    const auth = await getClient();
    const result = await auth.signOut();
    return unwrap(result);
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
