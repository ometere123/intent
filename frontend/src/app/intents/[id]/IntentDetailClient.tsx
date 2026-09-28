"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getIntent, getLatestRevision, isRevoked, reviseIntent, revokeIntent } from '@/lib/intent-contract';

type IntentRecord = {
  owner:string; intent_id:string; revision:number; statement:string;
  scope:Record<string,unknown>; expires_at_unix:number; created_at:string;
  hard_rules?:Record<string,unknown>;
};

function parseRecord(raw:unknown):IntentRecord|null{
  if(typeof raw!=='string'||!raw) return null;
  try{return JSON.parse(raw) as IntentRecord;}catch{return null;}
}

export default function IntentDetailClient({id}:{id:string}){
  const [owner,setOwner]=useState('');
  const [records,setRecords]=useState<IntentRecord[]>([]);
  const [revoked,setRevoked]=useState(false);
  const [status,setStatus]=useState('Connect your wallet to load this intent from Studionet 61999.');
  const [busy,setBusy]=useState(false);
  const [statement,setStatement]=useState('');
  const [scope,setScope]=useState('{}');
  const [hardRules,setHardRules]=useState('{}');
  const [expiry,setExpiry]=useState('');

  async function load(){
    if(!window.ethereum){setStatus('No EIP-1193 wallet detected.');return;}
    setBusy(true);
    try{
      const accounts=await window.ethereum.request({method:'eth_requestAccounts'}) as string[];
      const current=accounts?.[0]; if(!current) throw new Error('No wallet account connected.');
      const latestRaw=await getLatestRevision(current,id);
      const latest=Number(latestRaw);
      if(!latest){setOwner(current);setRecords([]);setStatus('No intent with this ID belongs to the connected wallet.');return;}
      const loaded:IntentRecord[]=[];
      const firstRevision=Math.max(1,latest-99);
      for(let revision=firstRevision;revision<=latest;revision++){
        const raw=await getIntent(current,id,revision);
        const parsed=parseRecord(raw); if(parsed) loaded.push(parsed);
      }
      const isOff=Boolean(await isRevoked(current,id));
      setOwner(current);setRecords(loaded);setRevoked(isOff);
      const latestRecord=loaded.at(-1);
      if(latestRecord){
        setStatement(latestRecord.statement);
        setScope(JSON.stringify(latestRecord.scope,null,2));
        setHardRules(JSON.stringify(latestRecord.hard_rules ?? {},null,2));
      }
      setStatus(`Loaded ${loaded.length} immutable revision${loaded.length===1?'':'s'} from Studionet 61999${latest>100?` (latest 100 of ${latest})`:''}.`);
    }catch(error){setStatus(error instanceof Error?error.message:String(error));}
    finally{setBusy(false);}
  }

  useEffect(()=>{ void load(); },[id]);

  async function revise(){
    if(!window.ethereum) return;
    setBusy(true);
    try{
      const parsed=JSON.parse(scope) as Record<string,unknown>;
      const parsedRules=JSON.parse(hardRules) as Record<string,unknown>;
      const expiresAtUnix=expiry?Math.floor(new Date(expiry).getTime()/1000):0;
      const hash=await reviseIntent(window.ethereum,{id,statement,scope:parsed,hardRules:parsedRules,expiresAtUnix});
      setStatus(`Revision submitted. GenLayer tx: ${hash}`); await load();
    }catch(error){setStatus(error instanceof Error?error.message:String(error));setBusy(false);}
  }

  async function revoke(){
    if(!window.ethereum) return;
    if(!window.confirm(`Revoke the entire ${id} intent family? This cannot be undone.`)) return;
    setBusy(true);
    try{const hash=await revokeIntent(window.ethereum,id);setStatus(`Intent family revoked. GenLayer tx: ${hash}`);await load();}
    catch(error){setStatus(error instanceof Error?error.message:String(error));setBusy(false);}
  }

  const latest=records.at(-1);
  return <>
    <div className="topbar"><div><div className="eyebrow">intent family</div><h1 className="h1">{id}</h1><p className="lead">Immutable mandate history, current state and revision controls, read directly from the configured INTENT contract.</p></div><button className="btn danger" disabled={busy||revoked||!latest} onClick={revoke}>{revoked?'Revoked':'Revoke family'}</button></div>
    <div className="callout" style={{marginBottom:18,overflowWrap:'anywhere'}}>{status}</div>
    <div className="grid two">
      <div className="card">
        <div className="row"><div><span className={`status ${revoked?'bad':''}`}>{revoked?'REVOKED':latest?'ACTIVE':'NOT LOADED'}</span><h2>{latest?`Revision ${latest.revision}`:'No revision'}</h2></div>{owner&&<span className="mono">{owner.slice(0,8)}…{owner.slice(-6)}</span>}</div>
        {latest&&<><div className="callout">{latest.statement}</div><div className="list"><div className="item"><div className="kicker">scope</div><pre className="mono" style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(latest.scope,null,2)}</pre></div><div className="item"><div className="kicker">expiry</div><strong>{latest.expires_at_unix?new Date(latest.expires_at_unix*1000).toLocaleString():'No expiry'}</strong></div></div></>}
        <div className="row" style={{marginTop:16}}><button className="btn secondary" onClick={load} disabled={busy}>{busy?'Working…':'Refresh'}</button><Link className="btn" href="/analyse">Test transaction</Link></div>
      </div>
      <div className="grid">
        <div className="card"><div className="kicker">Revision history</div><div className="list">{[...records].reverse().map(r=><div className="item" key={r.revision}><div className="row"><strong>Revision {r.revision}</strong><span className="mono">immutable</span></div><div className="muted">{r.created_at}</div></div>)}{!records.length&&<div className="muted">No revisions loaded.</div>}</div></div>
        <div className="card form"><div className="kicker">Create next revision</div><div className="field"><label>Mandate</label><textarea value={statement} onChange={e=>setStatement(e.target.value)}/></div><div className="field"><label>Scope JSON</label><textarea className="mono" value={scope} onChange={e=>setScope(e.target.value)}/></div><div className="field"><label>Immutable hard rules JSON</label><textarea className="mono" value={hardRules} onChange={e=>setHardRules(e.target.value)}/></div><div className="field"><label>New expiry</label><input type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)}/></div><button className="btn" onClick={revise} disabled={busy||revoked||!latest}>Create immutable revision {latest?latest.revision+1:'?'}</button></div>
      </div>
    </div>
  </>;
}
