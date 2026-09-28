export type Hex = `0x${string}`;

export interface EIP1193RequestArguments {
  method: string;
  params?: readonly unknown[] | object;
}

export type EIP1193Listener = (...args: unknown[]) => void;

export interface EIP1193Provider {
  request(args: EIP1193RequestArguments): Promise<unknown>;
  /** Optional EIP-1193 event hooks forwarded by the guard when the base provider exposes them. */
  on?(event: string, listener: EIP1193Listener): unknown;
  removeListener?(event: string, listener: EIP1193Listener): unknown;
}

export interface WalletTransaction {
  from?: Hex;
  to?: Hex | null;
  value?: Hex;
  data?: Hex;
  input?: Hex;
  gas?: Hex;
  gasPrice?: Hex;
  maxFeePerGas?: Hex;
  maxPriorityFeePerGas?: Hex;
  nonce?: Hex;
  chainId?: Hex;
  [key: string]: unknown;
}

export interface HardRules {
  maxNativeValueWei?: string;
  allowedTargets?: Hex[];
  forbiddenTargets?: Hex[];
  forbiddenSelectors?: Hex[];
  allowedTargetChainIds?: number[];
  forbiddenTargetChainIds?: number[];
  maxCalldataBytes?: number;
  forbidContractCreation?: boolean;
  requireZeroNativeValue?: boolean;
  forbidUnlimitedApprovals?: boolean;
}

export interface IntentDefinition {
  id: string;
  revision: number;
  statement: string;
  hardRules?: HardRules;
}

export interface CanonicalAction {
  targetChainId: number;
  from: string;
  to: string | null;
  valueWei: string;
  data: string;
  selector: string;
  /** Canonical copy of the complete EIP-1193 transaction request. This binds gas, nonce, fee and extension fields too. */
  request: Record<string, unknown>;
}

export type LocalCheckStatus = 'PASS' | 'BLOCK' | 'REQUIRES_CONSENSUS';

export interface LocalCheckResult {
  status: LocalCheckStatus;
  checks: Record<string, unknown>;
  summary: string;
}

export type IntentOutcome = 'MATCHES_INTENT' | 'DOES_NOT_MATCH' | 'UNCLEAR';

export interface IntentDecision {
  outcome: IntentOutcome;
  reasonCode: string;
  rationale: string;
  actionId: string;
  intentId: string;
  intentRevision: number;
  genLayerTxHash?: string;
}

export interface IntentEvaluatorInput {
  intent: IntentDefinition;
  actionId: string;
  action: CanonicalAction;
  localChecks: LocalCheckResult;
  decodedSummary: string;
}

export interface IntentEvaluator {
  evaluate(input: IntentEvaluatorInput): Promise<IntentDecision>;
  recordExecutionReceipt?(input: {
    decision: IntentDecision;
    targetChainId: number;
    targetTxHash: string;
  }): Promise<void>;
}

export interface GuardOptions {
  evaluator: IntentEvaluator;
  resolveIntent(transaction: WalletTransaction): Promise<IntentDefinition>;
  /** Optional deterministic ABI/order decoder. Its output is supporting evidence only; the canonical request stays authoritative. */
  describeAction?: (action: CanonicalAction, transaction: WalletTransaction) => Promise<string> | string;
  onEvent?: (event: GuardEvent) => void;
}

export interface GuardEvent {
  type:
    | 'queued'
    | 'captured'
    | 'local-block'
    | 'adjudicating'
    | 'decision'
    | 'restoring-chain'
    | 'forwarding'
    | 'receipt-recorded'
    | 'receipt-failed';
  detail?: unknown;
}
