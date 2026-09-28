import assert from 'node:assert/strict';
import test from 'node:test';
import { safeTransactionHash, verifyFinalizedDecision } from './attestor.mjs';

const base = {
  targetChainId: 11155111n,
  safe: '0x0000000000000000000000000000000000000001',
  safeNonce: 0n,
  to: '0x0000000000000000000000000000000000000002',
  value: 0n,
  data: '0x1234',
  operation: 0,
  safeTxGas: 0n,
  baseGas: 0n,
  gasPrice: 0n,
  gasToken: '0x0000000000000000000000000000000000000000',
  refundReceiver: '0x0000000000000000000000000000000000000000',
};

test('Safe v1.4.1 hash binds every transaction field', () => {
  const hash = safeTransactionHash(base);
  for (const key of ['to', 'value', 'data', 'safeTxGas', 'baseGas', 'gasPrice', 'gasToken', 'refundReceiver', 'safeNonce']) {
    const alteredValue = ['to', 'gasToken', 'refundReceiver'].includes(key)
      ? '0x0000000000000000000000000000000000000003'
      : key === 'data' ? '0x1235' : 1n;
    const altered = { ...base, [key]: alteredValue };
    assert.notEqual(safeTransactionHash(altered), hash, key);
  }
});

test('attestor refuses accepted, non-final and non-MATCHES decisions', () => {
  const candidate = { ...base, genLayerChainId: 61999n, genLayerIntent: '0x0000000000000000000000000000000000000004', actionHash: safeTransactionHash(base), intentIdHash: '0x' + '11'.repeat(32), intentRevision: 1n, validUntil: BigInt(Math.floor(Date.now() / 1000) + 60) };
  const decision = { outcome: 'MATCHES_INTENT', safe: candidate.safe, intentIdHash: candidate.intentIdHash, intentRevision: 1n };
  assert.throws(() => verifyFinalizedDecision({ candidate, decision, canonicalIntent: candidate.genLayerIntent, finalizedReceipt: { statusName: 'ACCEPTED', txExecutionResultName: 'FINISHED_WITH_RETURN' } }), /FINALIZED/);
  assert.throws(() => verifyFinalizedDecision({ candidate, decision: { ...decision, outcome: 'UNCLEAR' }, canonicalIntent: candidate.genLayerIntent, finalizedReceipt: { statusName: 'FINALIZED', txExecutionResultName: 'FINISHED_WITH_RETURN' } }), /MATCHES/);
});
