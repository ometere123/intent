'use client';

import { useState } from 'react';
import { createIntentProtectedProvider } from '@/lib/guarded-provider';

const INTENT = process.env.NEXT_PUBLIC_INTENT_CONTRACT_ADDRESS as `0x${string}` | undefined;
const DEMO_INTENT = 'browser-demo-2026-09-28';
const TARGET = '0xa74a3a9db4747856b196d41e29d52e996079c458' as `0x${string}`;

type BrowserProvider = Parameters<typeof createIntentProtectedProvider>[0]['provider'];

export default function CompatibilityPage() {
  const [status, setStatus] = useState('Ready');
  const [targetHash, setTargetHash] = useState('');
  const [error, setError] = useState('');

  async function sendGuarded() {
    setError('');
    setTargetHash('');
    const provider = (window as Window & { ethereum?: BrowserProvider }).ethereum;
    if (!provider) {
      setError('No injected wallet provider is available.');
      return;
    }
    if (!INTENT) {
      setError('The canonical INTENT contract is not configured.');
      return;
    }
    const guarded = createIntentProtectedProvider({
      provider,
      contractAddress: INTENT,
      intentId: DEMO_INTENT,
      describeAction: () => 'Harmless zero-value call to the configured INTENT demonstration target.',
      onEvent: (event) => setStatus(event.type),
    });
    try {
      const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
      const from = accounts?.[0];
      if (!from) throw new Error('Connect a wallet before starting the guarded send.');
      const hash = await guarded.request({
        method: 'eth_sendTransaction',
        params: [{ from, to: TARGET, value: '0x0', data: '0x' }],
      });
      setTargetHash(String(hash));
      setStatus('target-submitted');
    } catch (cause) {
      setStatus('failed-closed');
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return <>
    <div className="topbar"><div><div className="eyebrow">compatibility mode</div><h1 className="h1">Guard an exact injected-wallet request.</h1><p className="lead">This demo uses the existing IntentGuardProvider. It snapshots the exact EIP-1193 request, adjudicates it on Studionet 61999, restores the target chain, rechecks authority and forwards only the same request.</p></div></div>
    <div className="grid two">
      <section className="card">
        <div className="kicker">real browser flow</div>
        <h2>Harmless target call</h2>
        <p className="muted">Intent <span className="mono">{DEMO_INTENT}</span> → zero-value call to <span className="mono">{TARGET}</span>.</p>
        <button className="btn" onClick={sendGuarded}>Run guarded send</button>
        <div className="callout" style={{marginTop:16}}>Status: <strong>{status}</strong></div>
        {targetHash && <p className="mono" style={{overflowWrap:'anywhere'}}>Target tx: {targetHash}</p>}
        {error && <p className="callout" style={{borderLeftColor:'var(--danger)',overflowWrap:'anywhere'}}>{error}</p>}
      </section>
      <section className="card">
        <div className="kicker">security boundary</div>
        <h2>What this proves</h2>
        <div className="steps">
          <div className="step"><strong>Capture</strong><span className="muted">Immutable request snapshot and action ID.</span></div>
          <div className="step"><strong>Adjudicate</strong><span className="muted">Only finalized successful MATCHES_INTENT can continue.</span></div>
          <div className="step"><strong>Rebind</strong><span className="muted">Account, target chain, authority and action are checked again.</span></div>
          <div className="step"><strong>Forward</strong><span className="muted">The wallet receives the isolated request exactly once.</span></div>
        </div>
      </section>
    </div>
  </>;
}
