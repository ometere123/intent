const code=`import { createIntentProtectedProvider } from '@/lib/guarded-provider';

const guarded = createIntentProtectedProvider({
  provider: window.ethereum,
  contractAddress: process.env.NEXT_PUBLIC_INTENT_CONTRACT_ADDRESS,
  intentId: 'cloud-pro-2026',
  hardRules: {
    forbidUnlimitedApprovals: true,
    allowedTargetChainIds: [8453],
    maxCalldataBytes: 4096,
  },
  describeAction: async (action) =>
    abiDecoder.describe(action), // supporting evidence only
  onEvent: (event) => auditUi.consume(event),
});

// Protected code receives guarded, never raw window.ethereum.
await guarded.request({
  method: 'eth_sendTransaction',
  params: [tx],
});`;
export default function Integrate(){return <><div className="topbar"><div><div className="eyebrow">integration</div><h1 className="h1">Wrap the provider your app already uses.</h1><p className="lead">INTENT is designed to live inside an existing dapp or agent runtime. Read-only mandate lookup does not switch the wallet network; only consensus writes move the wallet to Studionet.</p></div></div><div className="grid two"><div className="card"><div className="kicker">minimal integration</div><pre className="code">{code}</pre><a className="btn secondary" href="/compatibility">Run the browser demo</a></div><div className="grid"><div className="card"><div className="kicker">critical rule</div><h2>Do not leak the bypass.</h2><p className="muted">If protected application code can still call the raw wallet provider, it can skip INTENT entirely. Treat the guarded provider as a capability boundary.</p><div className="callout">The SDK never handles seed phrases or private keys. Signing remains inside the user&apos;s wallet.</div></div><div className="card"><div className="kicker">concurrency boundary</div><p className="muted">Guarded sends are serialised per provider so simultaneous transactions cannot race the wallet between a target chain and Studionet 61999.</p></div><div className="card"><div className="kicker">decoder boundary</div><p className="muted">`describeAction` can ABI-decode the exact request for validator readability. Its prose never overrides the canonical request, and the contract labels it untrusted supporting evidence.</p></div></div></div></>}
