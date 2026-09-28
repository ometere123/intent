import assert from 'node:assert/strict';
import test from 'node:test';
import { safeTransactionHash, verifyFinalizedDecision, requireFinalizedSuccessfulReceipt } from './attestor.mjs';

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
  const policyOwner = '0x0000000000000000000000000000000000000007';
  const candidate = { ...base, genLayerChainId: 61999n, genLayerIntent: '0x0000000000000000000000000000000000000004', policyOwner, actionHash: safeTransactionHash(base), intentIdHash: '0x' + '11'.repeat(32), intentRevision: 1n, validUntil: BigInt(Math.floor(Date.now() / 1000) + 60) };
  const decision = { outcome: 'MATCHES_INTENT', owner: policyOwner, intent_id: 'demo', intent_revision: 1, action: { ...base, execution_kind: 'SAFE', valueWei: '0' } };
  assert.throws(() => verifyFinalizedDecision({ candidate, decision, canonicalIntent: candidate.genLayerIntent, finalizedReceipt: { statusName: 'ACCEPTED', txExecutionResultName: 'FINISHED_WITH_RETURN' } }), /FINALIZED/);
  assert.throws(() => verifyFinalizedDecision({ candidate, decision: { ...decision, outcome: 'UNCLEAR' }, canonicalIntent: candidate.genLayerIntent, finalizedReceipt: { statusName: 'FINALIZED', txExecutionResultName: 'FINISHED_WITH_RETURN' } }), /MATCHES/);
});

test('finality rejects missing or contradictory validator execution evidence', () => {
  assert.throws(() => requireFinalizedSuccessfulReceipt({ statusName: 'FINALIZED', consensus_data: { validators: [{ execution_result: 'FINISHED_WITH_ERROR' }] } }), /contradicts/);
  assert.throws(() => requireFinalizedSuccessfulReceipt({ statusName: 'FINALIZED', consensus_data: { validators: [] } }), /insufficient/);
  assert.doesNotThrow(() => requireFinalizedSuccessfulReceipt({ statusName: 'FINALIZED', consensus_data: { leader_receipt: [{ execution_result: 'FINISHED_WITH_RETURN' }], validators: [{ execution_result: 'FINISHED_WITH_RETURN' }] } }));
  assert.doesNotThrow(() => requireFinalizedSuccessfulReceipt({
    statusName: 'FINALIZED',
    consensus_data: {
      leader_receipt: [{ execution_result: 'FINISHED_WITH_RETURN' }],
      validators: [{ execution_result: 'ERROR', genvm_result: { stderr: 'Validator execution cancelled after quorum' } }],
    },
  }));
  assert.throws(() => requireFinalizedSuccessfulReceipt({
    statusName: 'FINALIZED',
    consensus_data: {
      leader_receipt: [{ execution_result: 'FINISHED_WITH_RETURN' }],
      validators: [{ execution_result: 'FINISHED_WITH_ERROR', genvm_result: { stderr: 'real execution error' } }],
    },
  }), /contradicts/);
});
