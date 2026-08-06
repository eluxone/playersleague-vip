(() => {
  'use strict';
  const url = new URL(window.location.href);
  const returnTo = url.searchParams.get('returnTo');
  if (!returnTo) return;
  const safe = returnTo.startsWith('/')
    && !returnTo.startsWith('//')
    && !returnTo.includes('\\')
    && !/[\u0000-\u001f]/.test(returnTo);
  if (!safe) {
    url.searchParams.set('returnTo','/dashboard');
    window.history.replaceState(null,'',`${url.pathname}?${url.searchParams.toString()}${url.hash}`);
  }
})();
