import { encodeAbiParameters, hashTypedData, keccak256, concatHex } from 'viem';

export const GENLAYER_CHAIN_ID = 61999n;
export const SEPOLIA_CHAIN_ID = 11155111n;
export const REGISTRY_NAME = 'INTENT Authorization Registry';
export const REGISTRY_VERSION = '1';
const SAFE_DOMAIN_TYPEHASH = '0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218';
const SAFE_TX_TYPEHASH = '0xbb8310d486368db6bd6f849402fdd73ad53d316b5a4b2644ad6efe0f941286d8';

/** Reproduces Safe v1.4.1 getTransactionHash without trusting a caller-supplied hash. */
export function safeTransactionHash(tx) {
  const safeTxHash = keccak256(encodeAbiParameters(
    [
      { type: 'bytes32' }, { type: 'address' }, { type: 'uint256' }, { type: 'bytes32' },
      { type: 'uint8' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' },
      { type: 'address' }, { type: 'address' }, { type: 'uint256' },
    ],
    [SAFE_TX_TYPEHASH, tx.to, tx.value, keccak256(tx.data), tx.operation, tx.safeTxGas,
      tx.baseGas, tx.gasPrice, tx.gasToken, tx.refundReceiver, tx.safeNonce],
  ));
  const domain = keccak256(encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
    [SAFE_DOMAIN_TYPEHASH, tx.targetChainId, tx.safe],
  ));
  return keccak256(concatHex(['0x1901', domain, safeTxHash]));
}

/**
 * A reference attestor must call this only after reading the final GenLayer
 * transaction and canonical decision state itself. It rejects accepted,
 * pending, failed, wrong-contract, wrong-action and non-MATCHES decisions.
 */
export function verifyFinalizedDecision({ candidate, finalizedReceipt, decision, canonicalIntent }) {
  if (candidate.genLayerChainId !== GENLAYER_CHAIN_ID) throw new Error('wrong GenLayer chain');
  if (candidate.targetChainId !== SEPOLIA_CHAIN_ID) throw new Error('wrong target chain');
  if (candidate.genLayerIntent.toLowerCase() !== canonicalIntent.toLowerCase()) throw new Error('wrong GenLayer contract');
  if (String(finalizedReceipt?.statusName ?? finalizedReceipt?.status ?? '').toUpperCase() !== 'FINALIZED') throw new Error('decision is not FINALIZED');
  const execution = String(finalizedReceipt?.txExecutionResultName ?? finalizedReceipt?.tx_execution_result_name ?? '').toUpperCase();
  if (execution !== 'FINISHED_WITH_RETURN') throw new Error('decision execution was not successful');
  if (String(decision?.outcome ?? '').toUpperCase() !== 'MATCHES_INTENT') throw new Error('decision outcome is not MATCHES_INTENT');
  const recomputed = safeTransactionHash(candidate);
  if (recomputed.toLowerCase() !== candidate.actionHash.toLowerCase()) throw new Error('action hash mismatch');
  for (const [key, expected] of [['safe', candidate.safe], ['intentIdHash', candidate.intentIdHash], ['intentRevision', candidate.intentRevision]]) {
    if (String(decision?.[key]).toLowerCase() !== String(expected).toLowerCase()) throw new Error(`decision ${key} mismatch`);
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
    ] },
    primaryType: 'Certificate',
    message: certificate,
  };
}

export function certificateDigest(certificate, registry) {
  return hashTypedData(certificateTypedData(certificate, registry));
}
