import type { CanonicalAction } from './types.js';

const ERC20_TRANSFER = '0xa9059cbb';
const ERC20_APPROVE = '0x095ea7b3';

function word(data:string,index:number):string|null{
  const start=10+(index*64); const value=data.slice(start,start+64);
  return value.length===64?value:null;
}
function addressWord(value:string|null):string|null{
  if(!value) return null; return `0x${value.slice(24)}`.toLowerCase();
}
function uintWord(value:string|null):string|null{
  if(!value) return null; try{return BigInt(`0x${value}`).toString(10);}catch{return null;}
}

export function describeKnownAction(action:CanonicalAction):string{
  if(action.data==='0x'){
    return `Native-value transaction on target chain ${action.targetChainId} from ${action.from} to ${action.to ?? 'contract creation'} with value ${action.valueWei} wei and no calldata.`;
  }
  if(action.selector===ERC20_TRANSFER){
    const recipient=addressWord(word(action.data,0)); const amount=uintWord(word(action.data,1));
    if(recipient&&amount) return `Standard ERC-20 transfer(address,uint256) call to token contract ${action.to}; recipient ${recipient}; raw token amount ${amount}; target chain ${action.targetChainId}; native value ${action.valueWei} wei.`;
  }
  if(action.selector===ERC20_APPROVE){
    const spender=addressWord(word(action.data,0)); const amount=uintWord(word(action.data,1));
    if(spender&&amount) return `Standard ERC-20 approve(address,uint256) call to token contract ${action.to}; spender ${spender}; raw allowance amount ${amount}; target chain ${action.targetChainId}; native value ${action.valueWei} wei.`;
  }
  return `Unknown or custom EVM call on target chain ${action.targetChainId} from ${action.from} to ${action.to ?? 'contract creation'} with selector ${action.selector}, native value ${action.valueWei} wei, and calldata preserved in the canonical action. No ABI meaning is asserted.`;
}

export { ERC20_TRANSFER };
