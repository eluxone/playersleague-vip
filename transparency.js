(() => {
  'use strict';

  const panel = document.querySelector('[data-live-panel]');
  const message = document.querySelector('[data-status-message]');
  const refreshButton = document.querySelector('[data-refresh-status]');
  const checkedAt = document.querySelector('[data-checked-at]');
  const contractState = document.querySelector('[data-contract-state]');
  const contractDetail = document.querySelector('[data-contract-detail]');
  const tokenSymbol = document.querySelector('[data-token-symbol]');
  const tokenName = document.querySelector('[data-token-name]');
  const totalSupply = document.querySelector('[data-total-supply]');
  const decimals = document.querySelector('[data-decimals]');
  const chainId = document.querySelector('[data-chain-id]');
  const latestBlock = document.querySelector('[data-latest-block]');

  const formatIntegerString = (value) => {
    const [whole, fraction] = String(value || '0').split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return fraction ? `${grouped}.${fraction}` : grouped;
  };

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return 'Unavailable';
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }).format(date);
  };

  const setMessage = (text, state) => {
    if (!message) return;
    const indicator = document.createElement('i');
    indicator.setAttribute('aria-hidden', 'true');
    message.replaceChildren(indicator, document.createTextNode(text));
    if (state) message.dataset.state = state;
    else message.removeAttribute('data-state');
  };

  const setLoading = (loading) => {
    panel?.setAttribute('aria-busy', String(loading));
    if (refreshButton) {
      refreshButton.disabled = loading;
      refreshButton.textContent = loading ? 'Checking Base…' : 'Refresh live verification';
    }
  };

  const renderSuccess = (payload) => {
    const contract = payload.contract || {};
    const network = payload.network || {};

    if (contractState) {
      contractState.textContent = contract.exists ? 'Contract found' : 'Code not found';
      contractState.dataset.state = contract.exists ? 'success' : 'error';
    }
    if (contractDetail) contractDetail.textContent = contract.exists ? 'Bytecode present on Base' : 'Verify with the explorer';
    if (tokenSymbol) tokenSymbol.textContent = contract.symbol || 'PLVIP';
    if (tokenName) tokenName.textContent = contract.name || 'Players League VIP';
    if (totalSupply) totalSupply.textContent = formatIntegerString(contract.totalSupply || '0');
    if (decimals) decimals.textContent = `${contract.decimals ?? 18} decimals`;
    if (chainId) chainId.textContent = `Chain ${network.chainId || 8453}`;
    if (latestBlock) latestBlock.textContent = network.latestBlock
      ? `Latest checked block ${formatIntegerString(network.latestBlock)}`
      : 'Latest block unavailable';
    if (checkedAt) checkedAt.textContent = formatDate(payload.checkedAt);

    setMessage(
      contract.exists
        ? 'Live Base verification complete. Contract code and token data were found.'
        : 'Base responded, but contract code was not found. Use BaseScan before trusting any claim.',
      contract.exists ? 'success' : 'error'
    );
  };

  const renderError = (payload) => {
    if (contractState) {
      contractState.textContent = 'Check unavailable';
      contractState.dataset.state = 'error';
    }
    if (contractDetail) contractDetail.textContent = 'Use BaseScan to verify directly';
    if (totalSupply) totalSupply.textContent = '1,000,000,000';
    if (latestBlock) latestBlock.textContent = 'Live block unavailable';
    if (checkedAt) checkedAt.textContent = formatDate(payload?.checkedAt || new Date().toISOString());
    setMessage(payload?.message || 'Live Base verification is temporarily unavailable.', 'error');
  };

  const loadStatus = async () => {
    setLoading(true);
    setMessage('Checking the official contract on Base…');

    try {
      const response = await fetch('/api/token-status', {
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok !== true) throw Object.assign(new Error(payload.message), { payload });
      renderSuccess(payload);
    } catch (error) {
      console.error('PLVIP live verification failed', error);
      renderError(error.payload);
    } finally {
      setLoading(false);
    }
  };

  refreshButton?.addEventListener('click', loadStatus);
  loadStatus();
})();
