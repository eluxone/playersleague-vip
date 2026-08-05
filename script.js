(() => {
  'use strict';

  const layoutStyle = document.createElement('style');
  layoutStyle.textContent = `
    .token-card::before {
      content: "" !important;
      position: absolute !important;
      left: 50% !important;
      top: 50% !important;
      right: auto !important;
      bottom: auto !important;
      width: 72% !important;
      height: auto !important;
      aspect-ratio: 1 / 1 !important;
      border-radius: 50% !important;
      transform: translate(-50%, -50%) !important;
      background: radial-gradient(circle at 43% 36%, rgba(75,58,34,.42) 0%, rgba(22,22,27,.98) 48%, rgba(6,7,10,.99) 100%) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 24px 60px rgba(0,0,0,.48) !important;
      filter: none !important;
      z-index: 1 !important;
    }

    .token-card > img {
      position: absolute !important;
      left: 50% !important;
      top: 50% !important;
      width: 54% !important;
      height: auto !important;
      aspect-ratio: 1 / 1 !important;
      object-fit: contain !important;
      object-position: 50% 50% !important;
      transform: translate(-50%, -50%) !important;
      margin: 0 !important;
      padding: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      image-rendering: auto !important;
      z-index: 2 !important;
    }

    .token-card > div:last-child {
      z-index: 3 !important;
    }

    @media (max-width: 580px) {
      .token-card::before { width: 72% !important; }
      .token-card > img { width: 54% !important; }
    }
  `;
  document.head.appendChild(layoutStyle);

  const LOGO_PATH = 'assets/plvip-logo.png?v=20260805-8';
  const CONTRACT_ADDRESS = '0xD06Db34A4BD78f2F059646FDc45530297bE50449';
  const BASE_CHAIN_ID = '0x2105';
  const REGISTRATION_EMAIL = 'join@playersleague.vip';
  const toast = document.querySelector('[data-toast]');

  document.querySelectorAll('img[src*="plvip-logo"], [data-plvip-logo]').forEach((image) => {
    image.src = LOGO_PATH;
  });

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3000);
  };

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  const header = document.querySelector('.header, .site-header');
  const setHeader = () => header?.classList.toggle('scrolled', window.scrollY > 12);
  setHeader();
  window.addEventListener('scroll', setHeader, { passive: true });

  const navToggle = document.querySelector('.menu, .nav-toggle');
  const nav = document.querySelector('#links, #primary-nav');
  navToggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(Boolean(open)));
  });
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    nav.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  }));

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach((node) => observer.observe(node));
  } else {
    document.querySelectorAll('.reveal').forEach((node) => node.classList.add('visible'));
  }

  document.querySelectorAll('[data-copy-address]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(CONTRACT_ADDRESS);
        showToast('Official PLVIP contract copied');
      } catch {
        showToast(CONTRACT_ADDRESS);
      }
    });
  });

  const switchToBase = async (ethereum) => {
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID }]
      });
    } catch (error) {
      if (error?.code !== 4902) throw error;
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: BASE_CHAIN_ID,
          chainName: 'Base Mainnet',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://mainnet.base.org'],
          blockExplorerUrls: ['https://basescan.org']
        }]
      });
    }
  };

  const addToken = async () => {
    const ethereum = window.ethereum;
    if (!ethereum) {
      showToast('Open this page in a wallet-enabled browser to add PLVIP');
      return;
    }
    try {
      await ethereum.request({ method: 'eth_requestAccounts' });
      await switchToBase(ethereum);
      const added = await ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: CONTRACT_ADDRESS,
            symbol: 'PLVIP',
            decimals: 18,
            image: `${window.location.origin}/assets/plvip-logo.png?v=20260805-8`
          }
        }
      });
      showToast(added ? 'PLVIP added to your wallet' : 'Token request cancelled');
    } catch (error) {
      console.error(error);
      showToast('Wallet request was not completed');
    }
  };

  document.querySelectorAll('[data-add-token]').forEach((button) => {
    button.addEventListener('click', addToken);
  });

  const form = document.querySelector('[data-join-form]');
  const status = document.querySelector('[data-form-status]');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      if (status) status.textContent = 'Please complete the required fields.';
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const subject = `Players League VIP founding registration — ${data.get('gamerName')}`;
    const body = [
      'Players League VIP — Founding Player Registration',
      '',
      `Gamer name: ${data.get('gamerName')}`,
      `Email: ${data.get('email')}`,
      `Main game: ${data.get('mainGame')}`,
      `Platform: ${data.get('platform')}`,
      `Country: ${data.get('country')}`,
      `Discord/X: ${data.get('social') || 'Not provided'}`,
      '',
      'Build priority:',
      data.get('priority') || 'Not provided',
      '',
      'Consent: Early-access contact only; no rewards or access guaranteed.'
    ].join('\n');

    try {
      await navigator.clipboard.writeText(body);
    } catch {}

    if (status) status.textContent = 'Your registration is ready. Your email app should open now.';
    window.location.href = `mailto:${REGISTRATION_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();
