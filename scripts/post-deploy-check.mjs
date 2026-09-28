import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const address=(process.env.INTENT_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_INTENT_CONTRACT_ADDRESS || '').trim();
if(!/^0x[0-9a-fA-F]{40}$/.test(address)){
  throw new Error('Set INTENT_CONTRACT_ADDRESS to the deployed Studionet contract address.');
}

const rpc='https://studio.genlayer.com/api';
const response=await fetch(rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]})});
if(!response.ok) throw new Error(`Studionet RPC returned HTTP ${response.status}`);
const body=await response.json();
const chain=Number.parseInt(body.result,16);
if(chain!==61999) throw new Error(`Expected Studionet 61999, got ${chain}`);

const client=createClient({chain:studionet});
const network=await client.readContract({address,functionName:'get_network',args:[],stateStatus:'finalized'});
if(!network || typeof network!=='object') throw new Error('get_network returned an invalid value.');
const info=network;
if(Number(info.chain_id)!==61999) throw new Error(`Contract reports unexpected chain ${String(info.chain_id)}`);
if(String(info.name)!=='GenLayer Studionet') throw new Error(`Contract reports unexpected network ${String(info.name)}`);
console.log(JSON.stringify({rpc,chainId:chain,address,contractVersion:String(info.contract_version),network:String(info.name)},null,2));
