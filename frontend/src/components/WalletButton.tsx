"use client";
import { useEffect, useState } from 'react';

export function WalletButton(){
  const [label,setLabel]=useState('Connect wallet');

  function format(account:string){ return `${account.slice(0,6)}…${account.slice(-4)}`; }

  useEffect(()=>{
    if(!window.ethereum) return;
    void window.ethereum.request({method:'eth_accounts'}).then((accounts)=>{
      const first=Array.isArray(accounts)&&typeof accounts[0]==='string'?accounts[0]:'';
      if(first) setLabel(format(first));
    }).catch(()=>undefined);
  },[]);

  async function connect(){
    if(!window.ethereum){ setLabel('Wallet not found'); return; }
    try{
      const accounts=await window.ethereum.request({method:'eth_requestAccounts'}) as string[];
      setLabel(accounts?.[0]?format(accounts[0]):'Connected');
    }catch(e){ setLabel(e instanceof Error?e.message.slice(0,24):'Connection failed'); }
  }
  return <button className="btn secondary" onClick={connect}>{label}</button>;
}
