import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyGenLayerReceipt, requireFinalizedExecutionSuccess } from './genlayer-finality.ts';

test('frontend finality accepts finalized top-level success', () => {
  assert.equal(
    classifyGenLayerReceipt({ statusName: 'FINALIZED', txExecutionResultName: 'FINISHED_WITH_RETURN' }),
    'FINALIZED_EXECUTION_SUCCESS',
  );
  assert.doesNotThrow(() => requireFinalizedExecutionSuccess({
    statusName: 'FINALIZED',
    txExecutionResultName: 'FINISHED_WITH_RETURN',
  }));
});

test('frontend finality ignores validator cancellation after quorum', () => {
  assert.equal(
    classifyGenLayerReceipt({
      statusName: 'FINALIZED',
      consensus_data: {
        leader_receipt: [{ execution_result: 'FINISHED_WITH_RETURN' }],
        validators: [{
          execution_result: 'FINISHED_WITH_ERROR',
          genvm_result: { stderr: 'Validator execution cancelled after quorum' },
        }],
      },
    }),
    'FINALIZED_EXECUTION_SUCCESS',
  );
});

test('frontend finality fails closed on real error, missing evidence, and contradiction', () => {
  assert.equal(
    classifyGenLayerReceipt({ statusName: 'FINALIZED', txExecutionResultName: 'FINISHED_WITH_ERROR' }),
    'FINALIZED_EXECUTION_ERROR',
  );
  assert.equal(
    classifyGenLayerReceipt({ statusName: 'FINALIZED', consensus_data: { validators: [] } }),
    'UNKNOWN_EXECUTION_STATE',
  );
  assert.equal(
    classifyGenLayerReceipt({
      statusName: 'FINALIZED',
      consensus_data: {
        leader_receipt: [{ execution_result: 'FINISHED_WITH_RETURN' }],
        validators: [{ execution_result: 'FINISHED_WITH_ERROR', genvm_result: { stderr: 'real execution error' } }],
      },
    }),
    'UNKNOWN_EXECUTION_STATE',
  );
  assert.throws(() => requireFinalizedExecutionSuccess({
    statusName: 'FINALIZED',
    consensus_data: { validators: [] },
  }), /UNKNOWN_EXECUTION_STATE/);
});

test('frontend finality preserves non-final and timeout states', () => {
  assert.equal(classifyGenLayerReceipt({ statusName: 'ACCEPTED', txExecutionResultName: 'FINISHED_WITH_RETURN' }), 'ACCEPTED');
  assert.equal(classifyGenLayerReceipt({ statusName: 'UNDETERMINED' }), 'UNDETERMINED');
  assert.equal(classifyGenLayerReceipt({ statusName: 'VALIDATORS_TIMEOUT' }), 'TIMEOUT');
  assert.equal(classifyGenLayerReceipt({ statusName: 'CANCELED' }), 'DISAGREED_REJECTED');
});
