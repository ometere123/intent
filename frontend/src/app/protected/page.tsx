"use client";

import Link from 'next/link';
import { useState } from 'react';
import { protectedActionHash } from '@/lib/protected-action';

const registry = process.env.NEXT_PUBLIC_INTENT_AUTH_REGISTRY || '';
const guard = process.env.NEXT_PUBLIC_INTENT_SAFE_GUARD || '';

export default function ProtectedAccountPage() {
  const [hash, setHash] = useState('');
  function preview() {
    try {
      setHash(protectedActionHash({
        targetChainId: BigInt(11155111),
        safe: '0x0000000000000000000000000000000000000001',
        to: '0x0000000000000000000000000000000000000002',
        value: BigInt(0),
        data: '0x',
        operation: 0,
        safeTxGas: BigInt(0),
        baseGas: BigInt(0),
        gasPrice: BigInt(0),
        gasToken: '0x0000000000000000000000000000000000000000',
        refundReceiver: '0x0000000000000000000000000000000000000000',
        safeNonce: BigInt(0),
      }));
    } catch (error) {
      setHash(error instanceof Error ? error.message : String(error));
    }
  }

  return <>
    <div className="topbar"><div><div className="eyebrow">protected account mode</div><h1 className="h1">The Safe enforces the decision.</h1><p className="lead">Compatibility Mode protects ordinary injected wallets at the application boundary. Protected Account Mode moves the final check into a Sepolia Safe Guard: no exact, admitted, one-time authorization means no governed Safe execution.</p></div></div>
    <section className="grid two">
      <div className="card"><div className="kicker">Target chain</div><h2>Ethereum Sepolia</h2><p className="muted">Chain ID 11155111. The GenLayer decision remains on Studionet 61999; these are separate networks.</p><div className="list"><div className="item"><div className="kicker">Registry</div><div className="mono">{registry || 'Not deployed/configured'}</div></div><div className="item"><div className="kicker">Safe Guard</div><div className="mono">{guard || 'Not deployed/configured'}</div></div></div></div>
      <div className="card"><div className="kicker">Exact action binding</div><h2>One certificate, one Safe transaction</h2><p className="muted">The Safe v1.4.1 transaction hash binds chain, Safe, nonce, recipient, value, calldata and every gas/refund field. Mutation or replay must fail at the target-chain enforcement layer.</p><button className="btn" onClick={preview}>Preview canonical hash vector</button>{hash&&<div className="code" style={{marginTop:14,overflowWrap:'anywhere'}}>{hash}</div>}</div>
    </section>
    <section className="card" style={{marginTop:18}}><div className="kicker">Lifecycle</div><div className="steps"><div className="step"><div><strong>GenLayer</strong><div className="muted">An immutable mandate is evaluated on Studionet and must reach FINALIZED with successful execution and MATCHES_INTENT.</div></div></div><div className="step"><div><strong>Attestation</strong><div className="muted">A configured threshold of observers signs the same EIP-712 certificate. This is threshold-attested state, not a trustless light client.</div></div></div><div className="step"><div><strong>Safe</strong><div className="muted">The Guard checks the exact action and one-time authorization before execution, then consumes it after success.</div></div></div></div><Link className="btn secondary" href="/integrate" style={{display:'inline-block',marginTop:18}}>Read Compatibility Mode integration</Link></section>
  </>;
}
