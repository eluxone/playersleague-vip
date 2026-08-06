const CONTRACT_ADDRESS = '0xD06Db34A4BD78f2F059646FDc45530297bE50449';
const EXPECTED_CHAIN_ID = 8453;
const FALLBACK_RPC_URL = 'https://mainnet.base.org';
const RPC_TIMEOUT_MS = 8000;

const SELECTORS = {
  name: '0x06fdde03',
  symbol: '0x95d89b41',
  decimals: '0x313ce567',
  totalSupply: '0x18160ddd'
};

function send(response, status, payload) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', status === 200
    ? 'public, s-maxage=300, stale-while-revalidate=600'
    : 'no-store, max-age=0');
  return response.status(status).json(payload);
}

function decodeUint(hexValue) {
  if (typeof hexValue !== 'string' || !/^0x[0-9a-f]*$/i.test(hexValue)) {
    throw new Error('Invalid hexadecimal integer returned by RPC');
  }
  return BigInt(hexValue || '0x0');
}

function decodeAbiString(hexValue) {
  if (typeof hexValue !== 'string' || !hexValue.startsWith('0x')) return '';
  const data = hexValue.slice(2);
  if (!data) return '';

  try {
    if (data.length >= 128) {
      const offsetBytes = Number(BigInt(`0x${data.slice(0, 64)}`));
      const lengthPosition = offsetBytes * 2;
      const stringLength = Number(BigInt(`0x${data.slice(lengthPosition, lengthPosition + 64)}`));
      const stringHex = data.slice(lengthPosition + 64, lengthPosition + 64 + (stringLength * 2));
      return Buffer.from(stringHex, 'hex').toString('utf8').replace(/\0+$/g, '').trim();
    }

    return Buffer.from(data.slice(0, 64), 'hex').toString('utf8').replace(/\0+$/g, '').trim();
  } catch {
    return '';
  }
}

function formatUnits(value, decimals) {
  const safeDecimals = Number.isInteger(decimals) && decimals >= 0 && decimals <= 255 ? decimals : 18;
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const raw = absolute.toString().padStart(safeDecimals + 1, '0');
  const whole = safeDecimals ? raw.slice(0, -safeDecimals) : raw;
  const fraction = safeDecimals ? raw.slice(-safeDecimals).replace(/0+$/g, '') : '';
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

async function rpcCall(rpcUrl, method, params) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const result = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal
    });

    if (!result.ok) throw new Error(`Base RPC returned HTTP ${result.status}`);
    const payload = await result.json();
    if (payload.error) throw new Error(payload.error.message || 'Base RPC request failed');
    return payload.result;
  } finally {
    clearTimeout(timeout);
  }
}

async function contractCall(rpcUrl, selector) {
  return rpcCall(rpcUrl, 'eth_call', [{ to: CONTRACT_ADDRESS, data: selector }, 'latest']);
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return send(response, 405, { ok: false, message: 'Method not allowed' });
  }

  const rpcUrl = String(process.env.BASE_RPC_URL || FALLBACK_RPC_URL).trim();

  try {
    const [chainHex, blockHex, code, nameHex, symbolHex, decimalsHex, supplyHex] = await Promise.all([
      rpcCall(rpcUrl, 'eth_chainId', []),
      rpcCall(rpcUrl, 'eth_blockNumber', []),
      rpcCall(rpcUrl, 'eth_getCode', [CONTRACT_ADDRESS, 'latest']),
      contractCall(rpcUrl, SELECTORS.name),
      contractCall(rpcUrl, SELECTORS.symbol),
      contractCall(rpcUrl, SELECTORS.decimals),
      contractCall(rpcUrl, SELECTORS.totalSupply)
    ]);

    const chainId = Number(decodeUint(chainHex));
    const blockNumber = decodeUint(blockHex).toString();
    const decimals = Number(decodeUint(decimalsHex));
    const totalSupplyRaw = decodeUint(supplyHex);
    const contractExists = typeof code === 'string' && code !== '0x' && code !== '0x0';

    if (chainId !== EXPECTED_CHAIN_ID) {
      throw new Error(`Unexpected chain ID ${chainId}`);
    }

    return send(response, 200, {
      ok: true,
      checkedAt: new Date().toISOString(),
      network: {
        name: 'Base Mainnet',
        chainId,
        latestBlock: blockNumber
      },
      contract: {
        address: CONTRACT_ADDRESS,
        exists: contractExists,
        name: decodeAbiString(nameHex) || 'Players League VIP',
        symbol: decodeAbiString(symbolHex) || 'PLVIP',
        decimals,
        totalSupplyRaw: totalSupplyRaw.toString(),
        totalSupply: formatUnits(totalSupplyRaw, decimals)
      },
      market: {
        officialTradingAnnounced: false,
        officialLiquidityAnnounced: false,
        note: 'No official public trading or liquidity launch is announced on this website.'
      }
    });
  } catch (error) {
    console.error('PLVIP token status check failed', error);
    return send(response, 502, {
      ok: false,
      checkedAt: new Date().toISOString(),
      contract: { address: CONTRACT_ADDRESS },
      message: 'Live Base verification is temporarily unavailable. Use the official explorer link to verify the contract directly.'
    });
  }
}
