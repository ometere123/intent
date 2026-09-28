"use client";
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { WalletButton } from '@/components/WalletButton';
import { configuredContractAddress, getDecision, getIntent, getLatestRevision, getOwnerCounts, isRevoked, listIntentIdsPage, listRecentActionIds } from '@/lib/intent-contract';

type IntentCard={id:string;revision:number;statement:string;revoked:boolean};
type DecisionStats={matches:number;denied:number;unclear:number;receipts:number};

type IntentRecord={revision?:unknown;statement?:unknown};

export default function OverviewClient(){
  const[owner,setOwner]=useState('');
  const[intents,setIntents]=useState<IntentCard[]>([]);
  const[counts,setCounts]=useState({intent_count:0,action_count:0});
  const[stats,setStats]=useState<DecisionStats>({matches:0,denied:0,unclear:0,receipts:0});
  const[status,setStatus]=useState(configuredContractAddress()?'Connect a wallet to read its INTENT ledger.':'Deploy INTENT on Studionet 61999, then configure NEXT_PUBLIC_INTENT_CONTRACT_ADDRESS.');
  const[busy,setBusy]=useState(false);

  const shortOwner=useMemo(()=>owner?`${owner.slice(0,8)}…${owner.slice(-6)}`:'', [owner]);

  async function load(){
    if(!configuredContractAddress()){setStatus('Contract address is not configured yet.');return;}
    if(!window.ethereum){setStatus('No EIP-1193 wallet detected.');return;}
    setBusy(true);
    try{
      const accounts=await window.ethereum.request({method:'eth_requestAccounts'}) as string[];
      const current=accounts?.[0];
      if(!current) throw new Error('No wallet account connected.');
      setOwner(current);
      const rawCounts=await getOwnerCounts(current) as Record<string,unknown>;
      setCounts({intent_count:Number(rawCounts?.intent_count??0),action_count:Number(rawCounts?.action_count??0)});

      const intentCount=Number(rawCounts?.intent_count??0);
      const ids=intentCount>0?await listIntentIdsPage(current,Math.max(0,intentCount-8),Math.min(8,intentCount)):[];
      const cards:IntentCard[]=[];
      for(const id of [...ids].reverse()){
        const latest=Number(await getLatestRevision(current,id));
        if(!latest) continue;
        const raw=await getIntent(current,id,latest);
        if(typeof raw!=='string'||!raw) continue;
        const rec=JSON.parse(raw) as IntentRecord;
        cards.push({id,revision:Number(rec.revision??latest),statement:String(rec.statement??''),revoked:Boolean(await isRevoked(current,id))});
      }
      setIntents(cards);

      const actionCount=Number(rawCounts?.action_count??0);
      const actionIds=await listRecentActionIds(current,actionCount,250);
      const next:DecisionStats={matches:0,denied:0,unclear:0,receipts:0};
      for(const actionId of actionIds){
        const raw=await getDecision(current,actionId);
        if(typeof raw!=='string'||!raw) continue;
        const decision=JSON.parse(raw) as Record<string,unknown>;
        if(decision.outcome==='MATCHES_INTENT')next.matches+=1;
        else if(decision.outcome==='DOES_NOT_MATCH')next.denied+=1;
        else if(decision.outcome==='UNCLEAR')next.unclear+=1;
      }
      setStats(next);
      setStatus(`Loaded public finalized state for ${shortOwner||current} without switching the wallet network.`);
    }catch(error){setStatus(error instanceof Error?error.message:String(error));}
    finally{setBusy(false);}
  }

  useEffect(()=>{
    if(!window.ethereum||!configuredContractAddress())return;
    void window.ethereum.request({method:'eth_accounts'}).then((accounts)=>{
      if(Array.isArray(accounts)&&accounts[0]) void load();
    }).catch(()=>undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  return <>
    <div className="topbar"><div><div className="eyebrow">semantic wallet authorisation</div><h1 className="h1">Sign what you meant.<br/>Not merely what the calldata says.</h1><p className="lead">INTENT binds an exact wallet request to an exact human mandate. Deterministic violations stop locally. Ambiguous authority goes to GenLayer validators on Studionet 61999.</p></div><WalletButton/></div>
    <section className="hero"><div className="card"><div className="kicker">Current protection model</div><div className="metric">Fail closed</div><p className="muted">Only <strong style={{color:'var(--mint)'}}>MATCHES_INTENT</strong> can release a guarded transaction. `UNCLEAR`, stale bindings, account changes and validator failures deny release.</p><div className="row" style={{marginTop:22}}><Link className="btn" href="/intents/new">Create an intent</Link><Link className="btn secondary" href="/integrate">Wrap a provider</Link></div></div><div className="card orb"><div className="kicker">Consensus boundary</div></div></section>
    <div className="callout" style={{marginTop:18,overflowWrap:'anywhere'}}>{status}<div style={{marginTop:10}}><button className="btn secondary" onClick={load} disabled={busy||!configuredContractAddress()}>{busy?'Loading…':'Load on-chain state'}</button></div></div>
    <section className="grid three" style={{marginTop:18}}><div className="card"><div className="kicker">Intent families</div><div className="metric">{counts.intent_count}</div><div className="muted">Connected owner</div></div><div className="card"><div className="kicker">Decisions</div><div className="metric">{counts.action_count}</div><div className="muted">Immutable action bindings</div></div><div className="card"><div className="kicker">Recent outcomes</div><div className="metric">{stats.matches}/{stats.denied}/{stats.unclear}</div><div className="muted">match / deny / unclear, last 250</div></div></section>
    <section className="grid two" style={{marginTop:18}}><div className="card"><div className="row"><div><div className="kicker">Latest intent families</div><h2>Mandates</h2></div><Link className="btn secondary" href="/intents/new">New</Link></div><div className="list">{intents.map(x=><Link className="item" href={`/intents/${encodeURIComponent(x.id)}`} key={x.id}><div className="row"><strong>{x.id}</strong><span className={`status ${x.revoked?'bad':''}`}>{x.revoked?'REVOKED':'ACTIVE'}</span></div><p className="muted">{x.statement}</p><span className="mono">revision {x.revision}</span></Link>)}{!intents.length&&<div className="muted">No intent families loaded.</div>}</div></div><div className="card"><div className="kicker">Runtime</div><h2>One transaction, two layers</h2><div className="steps"><div className="step"><div><strong>Capture</strong><div className="muted">Guard normalises the exact EIP-1193 request.</div></div></div><div className="step"><div><strong>Precheck</strong><div className="muted">Obvious hard-rule violations stop locally.</div></div></div><div className="step"><div><strong>Adjudicate</strong><div className="muted">Wallet switches to GenLayer Studionet only for a consensus write.</div></div></div><div className="step"><div><strong>Rebind</strong><div className="muted">Target chain, account and request hash are checked again before forwarding.</div></div></div></div></div></section>
    {owner&&<div className="footerNote">Owner: <span className="mono">{owner}</span>. Read-only state is fetched from Studionet RPC without changing the wallet&apos;s selected target chain.</div>}
  </>;
}
