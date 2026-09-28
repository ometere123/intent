import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import type { IntentEvaluator, IntentEvaluatorInput, IntentDecision, EIP1193Provider } from '@intent/wallet-guard';
import { requireFinalizedExecutionSuccess } from './genlayer-finality';

const EXPECTED_CHAIN = 61999;
const STUDIONET_HEX = '0xf22f';
const OUTCOMES = new Set(['MATCHES_INTENT','DOES_NOT_MATCH','UNCLEAR']);
// Studionet consensus commonly spends longer than the SDK's short default
// polling window. A timeout here must not turn a still-live transaction into a
// false adjudication failure before the guarded provider can restore the target
// chain and forward the exact captured request.
const FINALITY_WAIT = { interval: 5000, retries: 180, fullTransaction: true };

function parseChainId(raw: unknown): number {
  if (typeof raw !== 'string' || !/^0x[0-9a-fA-F]+$/.test(raw)) return 0;
  return Number.parseInt(raw, 16);
}

function parseDecision(raw: unknown): IntentDecision {
  if (typeof raw !== 'string' || !raw) throw new Error('Decision was not found after adjudication.');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const outcome = String(parsed.outcome ?? '');
  const actionId = String(parsed.action_id ?? '');
  const intentId = String(parsed.intent_id ?? '');
  const intentRevision = Number(parsed.intent_revision ?? 0);
  const reasonCode = String(parsed.reason_code ?? '');
  const rationale = String(parsed.rationale ?? '');

  if (!OUTCOMES.has(outcome)) throw new Error('Stored decision has an invalid outcome.');
  if (!/^[0-9a-fA-F]{64}$/.test(actionId)) throw new Error('Stored decision has an invalid action binding.');
  if (!intentId || !Number.isSafeInteger(intentRevision) || intentRevision < 1) throw new Error('Stored decision has an invalid intent binding.');
  if (!reasonCode || !rationale) throw new Error('Stored decision is missing required audit metadata.');

  return { outcome: outcome as IntentDecision['outcome'], reasonCode, rationale, actionId, intentId, intentRevision };
}

export function createGenLayerIntentEvaluator(options:{contractAddress:`0x${string}`;genLayerProvider:EIP1193Provider}):IntentEvaluator{
  const {contractAddress,genLayerProvider}=options;
  if(!/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) throw new Error('Invalid INTENT contract address.');

  async function switchToStudionet(){
    await genLayerProvider.request({method:'wallet_switchEthereumChain',params:[{chainId:STUDIONET_HEX}]});
    const chain=parseChainId(await genLayerProvider.request({method:'eth_chainId'}));
    if(chain!==EXPECTED_CHAIN) throw new Error(`GenLayer evaluator requires chain ${EXPECTED_CHAIN}.`);
  }

  async function account(){
    const accounts=await genLayerProvider.request({method:'eth_accounts'}) as string[];
    if(!accounts?.[0] || !/^0x[0-9a-fA-F]{40}$/.test(accounts[0])) throw new Error('No valid wallet account available for GenLayer adjudication.');
    return accounts[0] as `0x${string}`;
  }

  return {
    async evaluate(input:IntentEvaluatorInput){
      const actionJson=JSON.stringify(input.action);
      const checksJson=JSON.stringify(input.localChecks.checks);
      if(actionJson.length>14000) throw new Error('Canonical action exceeds the INTENT contract evidence bound.');
      if(checksJson.length>6000) throw new Error('Deterministic check evidence exceeds the INTENT contract evidence bound.');
      if(!input.decodedSummary || input.decodedSummary.length>8000) throw new Error('Decoded summary is outside the INTENT contract evidence bound.');
      await switchToStudionet();
      const owner=await account();
      const client=createClient({chain:studionet,account:owner,provider:genLayerProvider as never});
      const write={address:contractAddress,functionName:'evaluate',args:[input.intent.id,input.intent.revision,input.actionId,actionJson,input.decodedSummary,checksJson]};
      const txHash=await client.writeContract({...write,value:BigInt(0)} as never);
      const receipt=await client.waitForTransactionReceipt({hash:txHash,status:'FINALIZED',...FINALITY_WAIT} as never);
      requireFinalizedExecutionSuccess(receipt);
      const raw=await client.readContract({address:contractAddress,functionName:'get_decision',args:[owner,input.actionId],stateStatus:'finalized'} as never);
      const decision=parseDecision(raw);
      return {...decision,genLayerTxHash:txHash};
    },

    async recordExecutionReceipt({decision,targetChainId,targetTxHash}){
      if(!/^0x[0-9a-fA-F]{64}$/.test(targetTxHash)) throw new Error('Target provider did not return a valid transaction hash.');
      const before=parseChainId(await genLayerProvider.request({method:'eth_chainId'}));
      try {
        await switchToStudionet();
        const owner=await account();
        const client=createClient({chain:studionet,account:owner,provider:genLayerProvider as never});
        const write={address:contractAddress,functionName:'record_execution_receipt',args:[decision.actionId,targetChainId,targetTxHash]};
        const receiptTx=await client.writeContract({...write,value:BigInt(0)} as never);
        const receipt=await client.waitForTransactionReceipt({hash:receiptTx,status:'FINALIZED',...FINALITY_WAIT} as never);
        requireFinalizedExecutionSuccess(receipt);
      } finally {
        if(before && before!==EXPECTED_CHAIN){
          await genLayerProvider.request({method:'wallet_switchEthereumChain',params:[{chainId:`0x${before.toString(16)}`}]});
        }
      }
    },
  };
}
