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

    const campaignPage = location.pathname.endsWith('/campaign.html');
    if (campaignPage && document.querySelector('.runtime-error')) {
      const id = new URLSearchParams(location.search).get('id') || localStorage.getItem('oraclerpg.activeCampaignId') || '';
      const restored = id && localStorage.getItem(`oraclerpg.campaign.${id}.v1`);
      const reloadKey = `oraclerpg.cloud-reload.${id}`;
      if (restored && sessionStorage.getItem(reloadKey) !== '1') {
        sessionStorage.setItem(reloadKey, '1');
        location.reload();
        return;
      }
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
