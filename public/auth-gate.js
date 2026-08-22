(async () => {
  const html = document.documentElement;
  const current = `${location.pathname}${location.search}${location.hash}`;

  try {
    const session = await window.OracleAuth.getSession();
    if (!session?.user) {
      const next = encodeURIComponent(current === '/' ? '/' : current);
      location.replace(`/account.html?next=${next}`);
      return;
    }
    window.OracleSession = session;
    try {
      await window.OracleAccountData?.bootstrap?.(session);
    } catch (syncError) {
      console.error('OracleRPG account data bootstrap:', syncError);
    }
    window.dispatchEvent(new CustomEvent('oracle:auth-ready', { detail: session }));
  } catch (error) {
    console.error('OracleRPG auth gate:', error);
    const next = encodeURIComponent(current === '/' ? '/' : current);
    location.replace(`/account.html?next=${next}&authError=unavailable`);
    return;
  } finally {
    html.classList.remove('auth-pending');
  }
})();
