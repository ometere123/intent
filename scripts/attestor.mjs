import { encodeAbiParameters, hashTypedData, keccak256, concatHex, stringToHex } from 'viem';

export const GENLAYER_CHAIN_ID = 61999n;
export const SEPOLIA_CHAIN_ID = 11155111n;
export const REGISTRY_NAME = 'INTENT Authorization Registry';
export const REGISTRY_VERSION = '1';
const SAFE_DOMAIN_TYPEHASH = '0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218';
const SAFE_TX_TYPEHASH = '0xbb8310d486368db6bd6f849402fdd73ad53d316b5a4b2644ad6efe0f941286d8';

export function safeTransactionHash(tx) {
  const safeTxHash = keccak256(encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'address' }, { type: 'uint256' }, { type: 'bytes32' },
      { type: 'uint8' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' },
      { type: 'address' }, { type: 'address' }, { type: 'uint256' }],
    [SAFE_TX_TYPEHASH, tx.to, tx.value, keccak256(tx.data), tx.operation, tx.safeTxGas,
      tx.baseGas, tx.gasPrice, tx.gasToken, tx.refundReceiver, tx.safeNonce],
  ));
  const domain = keccak256(encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
    [SAFE_DOMAIN_TYPEHASH, tx.targetChainId, tx.safe],
  ));
  return keccak256(concatHex(['0x1901', domain, safeTxHash]));
}

function receiptStatus(receipt) {
  const value = receipt?.statusName ?? receipt?.status_name ?? receipt?.status;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value) === '7' ? 'FINALIZED' : String(value);
  return String(value ?? '').toUpperCase();
}

function executionEvidence(receipt) {
  const values = [];
  const add = (value) => {
    if (value === undefined || value === null) return;
    const text = typeof value === 'number' || typeof value === 'bigint'
      ? ({ 1: 'FINISHED_WITH_RETURN', 2: 'FINISHED_WITH_ERROR' }[String(value)] ?? String(value))
      : String(value).toUpperCase();
    if (text) values.push(text);
  };
  add(receipt?.txExecutionResultName ?? receipt?.tx_execution_result_name ?? receipt?.txExecutionResult);
  const consensus = receipt?.consensus_data ?? receipt?.consensusData;
  if (consensus && typeof consensus === 'object') {
    for (const key of ['leader_receipt', 'leaderReceipt', 'validator_receipt', 'validatorReceipt', 'validators', 'receipts']) {
      const entries = consensus[key];
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (entry && typeof entry === 'object') {
          const stderr = String(entry.genvm_result?.stderr ?? entry.genvmResult?.stderr ?? '').toLowerCase();
          // Studio cancels idle validators after quorum. That bookkeeping ERROR
          // is not contradictory execution evidence when the leader/active
          // validators already established the finalized result.
          if (stderr.includes('cancelled after quorum') || stderr.includes('quorum reached')) continue;
          add(entry.execution_result ?? entry.executionResult ?? entry.tx_execution_result ?? entry.txExecutionResult);
        }
      }
    }
  }
  return values;
}

export function requireFinalizedSuccessfulReceipt(receipt, decisionRef, canonicalIntent) {
  if (receiptStatus(receipt) !== 'FINALIZED') throw new Error('decision is not FINALIZED');
  const evidence = executionEvidence(receipt);
  const success = evidence.some((value) => value === 'FINISHED_WITH_RETURN' || value === 'SUCCESS');
  const error = evidence.some((value) => value === 'FINISHED_WITH_ERROR' || value === 'ERROR' || value === 'FAILED');
  if (!success || error) throw new Error(error ? 'decision execution evidence contradicts success' : 'decision execution has insufficient success evidence');
  const txHash = receipt?.transactionHash ?? receipt?.transaction_hash ?? receipt?.hash ?? receipt?.txHash ?? receipt?.tx_id;
  if (decisionRef && txHash && String(txHash).toLowerCase() !== String(decisionRef).toLowerCase()) throw new Error('decisionRef does not identify this receipt');
  const to = receipt?.to ?? receipt?.to_address ?? receipt?.transaction?.to ?? receipt?.tx?.to;
  if (canonicalIntent && to && String(to).toLowerCase() !== String(canonicalIntent).toLowerCase()) throw new Error('decision transaction target is not canonical INTENT');
  return true;
}

function actionFromDecision(decision) {
  if (!decision || typeof decision.action !== 'object' || !decision.action) throw new Error('decision has no canonical action');
  const action = decision.action;
  const kind = action.execution_kind ?? action.executionKind;
  if (kind !== 'SAFE') throw new Error('decision action is not a protected SAFE action');
  for (const key of ['targetChainId', 'safe', 'safeNonce', 'to', 'valueWei', 'data', 'operation', 'safeTxGas', 'baseGas', 'gasPrice', 'gasToken', 'refundReceiver']) {
    if (!(key in action)) throw new Error(`decision action is missing ${key}`);
  }
  return {
    targetChainId: BigInt(action.targetChainId), safe: action.safe, safeNonce: BigInt(action.safeNonce),
    to: action.to, value: BigInt(action.valueWei), data: action.data, operation: Number(action.operation),
    safeTxGas: BigInt(action.safeTxGas), baseGas: BigInt(action.baseGas), gasPrice: BigInt(action.gasPrice),
    gasToken: action.gasToken, refundReceiver: action.refundReceiver,
  };
}

export function candidateFromDecision({ decision, decisionRef, authorizationNonce, validAfter, validUntil }) {
  const action = actionFromDecision(decision);
  const actionHash = safeTransactionHash(action);
  return {
    ...action,
    genLayerChainId: GENLAYER_CHAIN_ID,
    genLayerIntent: decisionRef.genLayerIntent,
    decisionRef: decisionRef.txHash ?? decisionRef,
    actionHash,
    intentIdHash: decision.intent_id_hash ?? keccak256(stringToHex(String(decision.intent_id))),
    intentRevision: BigInt(decision.intent_revision),
    authorizationNonce: BigInt(authorizationNonce),
    validAfter: BigInt(validAfter),
    validUntil: BigInt(validUntil),
  };
}

export function verifyFinalizedDecision({ candidate, finalizedReceipt, decision, canonicalIntent, canonicalIntentState, decisionRef }) {
  if (candidate.genLayerChainId !== GENLAYER_CHAIN_ID) throw new Error('wrong GenLayer chain');
  if (candidate.targetChainId !== SEPOLIA_CHAIN_ID) throw new Error('wrong target chain');
  if (candidate.genLayerIntent.toLowerCase() !== canonicalIntent.toLowerCase()) throw new Error('wrong GenLayer contract');
  requireFinalizedSuccessfulReceipt(finalizedReceipt, decisionRef, canonicalIntent);
  if (String(decision?.outcome ?? '').toUpperCase() !== 'MATCHES_INTENT') throw new Error('decision outcome is not MATCHES_INTENT');
  const action = actionFromDecision(decision);
  const recomputed = safeTransactionHash(action);
  if (recomputed.toLowerCase() !== candidate.actionHash.toLowerCase()) throw new Error('action hash mismatch');
  if (String(action.safe).toLowerCase() !== String(candidate.safe).toLowerCase()) throw new Error('decision Safe mismatch');
  if (BigInt(action.safeNonce) !== BigInt(candidate.safeNonce)) throw new Error('decision Safe nonce mismatch');
  if (BigInt(decision.intent_revision) !== BigInt(candidate.intentRevision)) throw new Error('decision revision mismatch');
  if (canonicalIntentState) {
    if (canonicalIntentState.revoked) throw new Error('intent is revoked');
    if (BigInt(canonicalIntentState.latestRevision) !== BigInt(candidate.intentRevision)) throw new Error('decision revision is no longer latest');
    if (String(canonicalIntentState.intentId).toLowerCase() !== String(decision.intent_id).toLowerCase()) throw new Error('decision intent mismatch');
    if (canonicalIntentState.expiresAt && BigInt(canonicalIntentState.expiresAt) <= BigInt(Math.floor(Date.now() / 1000))) throw new Error('intent revision expired');
  }
  if (candidate.validUntil <= BigInt(Math.floor(Date.now() / 1000))) throw new Error('certificate expired');
  return { ...candidate, actionHash: recomputed };
}

export function certificateTypedData(certificate, registry) {
  return {
    domain: { name: REGISTRY_NAME, version: REGISTRY_VERSION, chainId: SEPOLIA_CHAIN_ID, verifyingContract: registry },
    types: { Certificate: [
      { name: 'protocolVersion', type: 'string' }, { name: 'genLayerChainId', type: 'uint256' },
      { name: 'genLayerIntent', type: 'address' }, { name: 'decisionRef', type: 'bytes32' },
      { name: 'targetChainId', type: 'uint256' }, { name: 'safe', type: 'address' },
      { name: 'actionHash', type: 'bytes32' }, { name: 'intentIdHash', type: 'bytes32' },
      { name: 'intentRevision', type: 'uint256' }, { name: 'safeNonce', type: 'uint256' },
      { name: 'authorizationNonce', type: 'uint256' }, { name: 'validAfter', type: 'uint256' },
      { name: 'validUntil', type: 'uint256' }, { name: 'outcome', type: 'bytes32' },
    ] }, primaryType: 'Certificate', message: certificate,
  };
}

export function certificateDigest(certificate, registry) {
  return hashTypedData(certificateTypedData(certificate, registry));
}
