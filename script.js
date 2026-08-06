(async () => {
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
      width: 46% !important;
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

    .token-card > div:last-child { z-index: 3 !important; }
    .form-status[data-state="success"] { color: #62e6a7 !important; }
    .form-status[data-state="error"] { color: #ff9a9a !important; }
    .form button[disabled] { cursor: wait; opacity: .78; transform: none !important; }
    .registration-honeypot {
      position: absolute !important;
      left: -10000px !important;
      top: auto !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    @media (max-width: 580px) {
      .token-card::before { width: 72% !important; }
      .token-card > img { width: 46% !important; }
    }
  `;
  document.head.appendChild(layoutStyle);

  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  let logoUrl = 'assets/plvip-logo.png?v=20260805-9';
  try {
    window.__PLVIP_LOGO_B64 = '';
    for (let part = 1; part <= 4; part += 1) {
      await loadScript(`assets/plvip-logo-data-20260805-${part}.js?v=4`);
    }
    if (window.__PLVIP_LOGO_B64.length > 19000) {
      logoUrl = `data:image/webp;base64,${window.__PLVIP_LOGO_B64}`;
    }
  } catch (error) {
    console.error('PLVIP logo data could not be assembled', error);
  }

  document.querySelectorAll('img[src*="plvip-logo"], [data-plvip-logo]').forEach((image) => {
    image.src = logoUrl;
  });

  const CONTRACT_ADDRESS = '0xD06Db34A4BD78f2F059646FDc45530297bE50449';
  const BASE_CHAIN_ID = '0x2105';
  const toast = document.querySelector('[data-toast]');

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3000);
  };

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  document.querySelectorAll('a[href="#story"]').forEach((link) => {
    link.href = 'story.html';
  });

  const homeStoryCopy = document.querySelector('#story .copy');
  if (homeStoryCopy && !homeStoryCopy.querySelector('[data-full-story-link]')) {
    const storyLink = document.createElement('a');
    storyLink.href = 'story.html';
    storyLink.className = 'btn ghost';
    storyLink.dataset.fullStoryLink = '';
    storyLink.textContent = "Read Yamil and Mill's full story";
    storyLink.style.marginTop = '24px';
    homeStoryCopy.appendChild(storyLink);
  }

  const primaryNav = document.querySelector('#links, #primary-nav');
  if (primaryNav && !primaryNav.querySelector('a[href="whitepaper.html"]')) {
    const whitePaperLink = document.createElement('a');
    whitePaperLink.href = 'whitepaper.html';
    whitePaperLink.textContent = 'White Paper';
    const tokenButton = primaryNav.querySelector('[data-add-token]');
    primaryNav.insertBefore(whitePaperLink, tokenButton || null);
  }

  const isWhitePaperPage = /(^|\/)whitepaper\.html$/.test(window.location.pathname);
  primaryNav?.querySelectorAll('a[href="whitepaper.html"]').forEach((link) => {
    if (isWhitePaperPage) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  document.querySelectorAll('footer nav').forEach((footerNav) => {
    if (footerNav.querySelector('a[href="whitepaper.html"]')) return;
    const whitePaperLink = document.createElement('a');
    whitePaperLink.href = 'whitepaper.html';
    whitePaperLink.textContent = 'White Paper';
    const privacyLink = footerNav.querySelector('a[href="privacy.html"]');
    footerNav.insertBefore(whitePaperLink, privacyLink || footerNav.firstChild);
  });

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
      await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BASE_CHAIN_ID }] });
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
            image: logoUrl
          }
        }
      });
      showToast(added ? 'PLVIP added to your wallet' : 'Token request cancelled');
    } catch (error) {
      console.error(error);
      showToast('Wallet request was not completed');
    }
  };

  document.querySelectorAll('[data-add-token]').forEach((button) => button.addEventListener('click', addToken));

  const form = document.querySelector('[data-join-form]');
  const status = document.querySelector('[data-form-status]');
  const submitButton = form?.querySelector('button[type="submit"]');
  const note = form?.querySelector('.note');

  if (form) {
    const honeypot = document.createElement('label');
    honeypot.className = 'registration-honeypot';
    honeypot.setAttribute('aria-hidden', 'true');
    honeypot.innerHTML = 'Website<input name="website" type="text" tabindex="-1" autocomplete="off">';
    form.appendChild(honeypot);

    const startedAt = document.createElement('input');
    startedAt.type = 'hidden';
    startedAt.name = 'startedAt';
    startedAt.value = String(Date.now());
    form.appendChild(startedAt);

    if (submitButton) submitButton.textContent = 'Join the founding player list';
    if (note) {
      note.innerHTML = 'Your registration is submitted securely. No wallet or token purchase is required. See our <a href="privacy.html">Privacy Policy</a>.';
    }
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (status) {
      status.textContent = '';
      status.removeAttribute('data-state');
    }

    if (!form.checkValidity()) {
      if (status) {
        status.textContent = 'Please complete all required fields.';
        status.dataset.state = 'error';
      }
      form.reportValidity();
      return;
    }

    const originalButtonText = submitButton?.textContent || 'Join the founding player list';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting securely…';
    }

    const data = new FormData(form);
    const payload = {
      gamerName: data.get('gamerName'),
      email: data.get('email'),
      mainGame: data.get('mainGame'),
      platform: data.get('platform'),
      country: data.get('country'),
      social: data.get('social'),
      priority: data.get('priority'),
      consent: data.get('consent') === 'on',
      website: data.get('website'),
      startedAt: Number(data.get('startedAt'))
    };

    try {
      const result = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseBody = await result.json().catch(() => ({}));
      if (!result.ok || responseBody.ok !== true) {
        throw new Error(responseBody.message || 'Registration could not be completed.');
      }

      form.reset();
      const startField = form.elements.namedItem('startedAt');
      if (startField) startField.value = String(Date.now());

      if (status) {
        status.textContent = responseBody.message || 'Welcome to the founding player list.';
        status.dataset.state = 'success';
      }
      if (submitButton) {
        submitButton.textContent = 'Registration received ✓';
        submitButton.disabled = true;
      }
      showToast('Founding Player registration received');
    } catch (error) {
      console.error(error);
      if (status) {
        status.textContent = error.message || 'Registration could not be completed. Please try again.';
        status.dataset.state = 'error';
      }
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
})();
