export type GenLayerLifecycleState =
  | 'SUBMITTED'
  | 'PENDING'
  | 'ACCEPTED'
  | 'UNDETERMINED'
  | 'DISAGREED_REJECTED'
  | 'TIMEOUT'
  | 'FINALIZED'
  | 'FINALIZED_EXECUTION_SUCCESS'
  | 'FINALIZED_EXECUTION_ERROR'
  | 'UNKNOWN_EXECUTION_STATE';

const STATUS_BY_NUMBER: Record<string, string> = {
  '0': 'UNINITIALIZED', '1': 'PENDING', '2': 'PROPOSING', '3': 'COMMITTING',
  '4': 'REVEALING', '5': 'ACCEPTED', '6': 'UNDETERMINED', '7': 'FINALIZED',
  '8': 'CANCELED', '9': 'APPEAL_REVEALING', '10': 'APPEAL_COMMITTING',
  '11': 'READY_TO_FINALIZE', '12': 'VALIDATORS_TIMEOUT', '13': 'LEADER_TIMEOUT',
};

const EXECUTION_BY_NUMBER: Record<string, string> = {
  '0': 'NOT_VOTED', '1': 'FINISHED_WITH_RETURN', '2': 'FINISHED_WITH_ERROR',
};

function name(value: unknown, numeric: Record<string, string>): string {
  if (typeof value === 'string') return value.toUpperCase();
  if (typeof value === 'number' || typeof value === 'bigint') return numeric[String(value)] ?? '';
  return '';
}

function executionEvidence(receipt: Record<string, unknown>): string[] {
  const evidence: string[] = [];
  const add = (value: unknown) => {
    const parsed = name(value, EXECUTION_BY_NUMBER);
    if (parsed) evidence.push(parsed);
  };
  add(receipt.txExecutionResultName);
  add(receipt.tx_execution_result_name);
  add(receipt.txExecutionResult);
  const consensus = receipt.consensus_data ?? receipt.consensusData;
  if (!consensus || typeof consensus !== 'object') return evidence;
  const consensusRecord = consensus as Record<string, unknown>;
  for (const key of ['leader_receipt', 'leaderReceipt', 'validator_receipt', 'validatorReceipt', 'validators', 'receipts']) {
    const entries = consensusRecord[key];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry as Record<string, unknown>;
      const genvmResult = item.genvm_result ?? item.genvmResult;
      const stderr = genvmResult && typeof genvmResult === 'object'
        ? String((genvmResult as Record<string, unknown>).stderr ?? '').toLowerCase()
        : '';
      if (stderr.includes('cancelled after quorum') || stderr.includes('quorum reached')) continue;
      add(item.execution_result ?? item.executionResult ?? item.tx_execution_result ?? item.txExecutionResult);
    }
  }
  return evidence;
}

export function classifyGenLayerReceipt(receipt: unknown): GenLayerLifecycleState {
  if (!receipt || typeof receipt !== 'object') return 'UNKNOWN_EXECUTION_STATE';
  const raw = receipt as Record<string, unknown>;
  const status = name(raw.statusName ?? raw.status_name ?? raw.status, STATUS_BY_NUMBER);
  const result = name(raw.resultName ?? raw.result_name ?? raw.result, {});

  if (status === 'FINALIZED') {
    const evidence = executionEvidence(raw);
    const hasSuccess = evidence.includes('FINISHED_WITH_RETURN') || evidence.includes('SUCCESS');
    const hasError = evidence.includes('FINISHED_WITH_ERROR') || evidence.includes('ERROR') || evidence.includes('FAILED');
    if (hasSuccess && !hasError) return 'FINALIZED_EXECUTION_SUCCESS';
    if (hasError && !hasSuccess) return 'FINALIZED_EXECUTION_ERROR';
    return 'UNKNOWN_EXECUTION_STATE';
  }
  if (status === 'ACCEPTED') return 'ACCEPTED';
  if (status === 'UNDETERMINED') return 'UNDETERMINED';
  if (status === 'CANCELED' || result.includes('DISAGREE') || result === 'FAILURE') return 'DISAGREED_REJECTED';
  if (status === 'VALIDATORS_TIMEOUT' || status === 'LEADER_TIMEOUT' || result === 'TIMEOUT') return 'TIMEOUT';
  if (status === 'PENDING' || status === 'PROPOSING' || status === 'COMMITTING' || status === 'REVEALING') return 'PENDING';
  return 'UNKNOWN_EXECUTION_STATE';
}

export function requireFinalizedExecutionSuccess(receipt: unknown): void {
  const state = classifyGenLayerReceipt(receipt);
  if (state !== 'FINALIZED_EXECUTION_SUCCESS') {
    throw new Error(`GenLayer transaction is not finalized with successful execution: ${state}`);
  }
}
