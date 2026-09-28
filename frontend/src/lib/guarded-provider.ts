import { IntentGuardProvider, type EIP1193Provider, type GuardEvent, type HardRules, type WalletTransaction } from '@intent/wallet-guard';
import { createGenLayerIntentEvaluator } from '@/lib/genlayer-evaluator';
import { resolveLatestIntent } from '@/lib/intent-contract';

export function createIntentProtectedProvider(options:{
  provider:EIP1193Provider;
  contractAddress:`0x${string}`;
  intentId:string;
  hardRules?:HardRules;
  describeAction?:(action: Parameters<NonNullable<ConstructorParameters<typeof IntentGuardProvider>[1]['describeAction']>>[0], tx:WalletTransaction)=>Promise<string>|string;
  onEvent?:(event:GuardEvent)=>void;
}){
  const {provider,contractAddress,intentId,hardRules,describeAction,onEvent}=options;
  const readIntent=async()=>{
    const accounts=await provider.request({method:'eth_accounts'}) as string[];
    const owner=accounts?.[0];
    if(!owner) throw new Error('No selected wallet account.');
    return resolveLatestIntent(owner,intentId,hardRules);
  };
  return new IntentGuardProvider(provider,{
    evaluator:createGenLayerIntentEvaluator({contractAddress,genLayerProvider:provider}),
    resolveIntent:readIntent,
    recheckIntent:readIntent,
    describeAction,
    onEvent,
  });
}
