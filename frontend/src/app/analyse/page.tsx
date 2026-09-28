"use client";
import { useState } from 'react';
import { actionId, canonicaliseAction, deterministicChecks } from '@intent/wallet-guard';

const UINT256_MAX_HEX='f'.repeat(64);
const DEMO_SPENDER='0'.repeat(24)+'2222222222222222222222222222222222222222';
const DEFAULT_DATA=`0x095ea7b3${DEMO_SPENDER}${UINT256_MAX_HEX}`;

export default function Analyse(){
  const[chain,setChain]=useState('8453'); const[to,setTo]=useState('0x1111111111111111111111111111111111111111'); const[value,setValue]=useState('0x0'); const[data,setData]=useState(DEFAULT_DATA); const[result,setResult]=useState(''); const[id,setId]=useState('');
  async function analyse(){
    try{
      const action=canonicaliseAction({from:'0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',to:to as `0x${string}`,value:value as `0x${string}`,data:data as `0x${string}`},Number(chain));
      const local=deterministicChecks({id:'demo',revision:1,statement:'Demo mandate',hardRules:{forbidUnlimitedApprovals:true}},action);
      setId(await actionId(action));
      setResult(`${local.status} · ${local.summary}`);
    }catch(error){setResult(error instanceof Error?error.message:String(error));}
  }
  const selector=data.slice(0,10).toLowerCase();
  return <><div className="topbar"><div><div className="eyebrow">transaction analyser</div><h1 className="h1">See exactly where deterministic policy ends.</h1><p className="lead">This route executes the same canonicalisation and hard-rule code exported by the wallet-guard package. It is not a separate UI reimplementation.</p></div></div><div className="split"><div className="card form"><div className="field"><label>Target chain ID</label><input value={chain} onChange={e=>setChain(e.target.value)}/></div><div className="field"><label>To</label><input className="mono" value={to} onChange={e=>setTo(e.target.value)}/></div><div className="field"><label>Value (hex wei)</label><input className="mono" value={value} onChange={e=>setValue(e.target.value)}/></div><div className="field"><label>Calldata</label><textarea className="mono" value={data} onChange={e=>setData(e.target.value)}/></div><button className="btn" onClick={analyse}>Run SDK precheck</button>{result&&<div className="callout" style={{borderLeftColor:result.startsWith('BLOCK')?'var(--danger)':'var(--amber)'}}>{result}{id&&<div className="mono" style={{marginTop:8,overflowWrap:'anywhere'}}>actionId {id}</div>}</div>}</div><div className="grid"><div className="card"><div className="kicker">Canonical surface</div><h2>{selector==='0x095ea7b3'?'ERC-20 approve':'Unknown / custom call'}</h2><table className="table"><tbody><tr><td>Selector</td><td className="mono">{selector}</td></tr><tr><td>Authority</td><td>complete EIP-1193 request</td></tr><tr><td>Action ID</td><td>SHA-256 canonical JSON</td></tr></tbody></table></div><div className="card"><div className="kicker">Fail-closed rule</div><p className="muted">If the SDK cannot deterministically block a request, it requires consensus. `UNCLEAR`, failed adjudication or any binding mismatch never releases the transaction.</p></div></div></div></>;
}
