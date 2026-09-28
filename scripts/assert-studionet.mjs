const RPC = process.env.GENLAYER_RPC_URL || 'https://studio.genlayer.com/api';
const EXPECTED = 61999;

if (RPC !== 'https://studio.genlayer.com/api') {
  throw new Error(`INTENT refuses non-Studionet RPC: ${RPC}`);
}

const payload = { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] };

try {
  const response = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const body = await response.json();
  const chainId = Number.parseInt(body.result, 16);
  if (chainId !== EXPECTED) throw new Error(`Wrong chain: expected ${EXPECTED}, received ${chainId}`);
  console.log(`INTENT network check passed: Studionet ${chainId} @ ${RPC}`);
} catch (error) {
  console.error('Could not verify Studionet RPC. No deployment was attempted.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
