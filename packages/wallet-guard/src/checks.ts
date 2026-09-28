import type { CanonicalAction, IntentDefinition, LocalCheckResult } from './types.js';

const ERC20_APPROVE = '0x095ea7b3';
const UINT256_MAX = (1n << 256n) - 1n;

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const SELECTOR_RE = /^0x[0-9a-fA-F]{8}$/;

function invalidHardRules(rules: IntentDefinition['hardRules']): string | null {
  if (!rules) return null;
  const chainLists = [rules.allowedTargetChainIds, rules.forbiddenTargetChainIds];
  for (const list of chainLists) {
    if (list !== undefined && (!Array.isArray(list) || list.some((id) => !Number.isSafeInteger(id) || id <= 0))) {
      return 'Integration supplied an invalid target-chain rule.';
    }
  }
  const addressLists = [rules.allowedTargets, rules.forbiddenTargets];
  for (const list of addressLists) {
    if (list !== undefined && (!Array.isArray(list) || list.some((address) => typeof address !== 'string' || !ADDRESS_RE.test(address)))) {
      return 'Integration supplied an invalid target-address rule.';
    }
  }
  if (rules.forbiddenSelectors !== undefined && (
    !Array.isArray(rules.forbiddenSelectors)
    || rules.forbiddenSelectors.some((selector) => typeof selector !== 'string' || !SELECTOR_RE.test(selector))
  )) {
    return 'Integration supplied an invalid function-selector rule.';
  }
  if (rules.maxCalldataBytes !== undefined && (!Number.isSafeInteger(rules.maxCalldataBytes) || rules.maxCalldataBytes < 0)) {
    return 'Integration supplied an invalid maximum calldata length.';
  }
  if (rules.maxNativeValueWei !== undefined) {
    if (typeof rules.maxNativeValueWei !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(rules.maxNativeValueWei)) {
      return 'Integration supplied an invalid native-value limit.';
    }
  }
  return null;
}

function decodeApproveAmount(data: string): bigint | null {
  if (!data.startsWith(ERC20_APPROVE) || data.length < 10 + 64 + 64) return null;
  const amountWord = data.slice(10 + 64, 10 + 64 + 64);
  try { return BigInt(`0x${amountWord}`); } catch { return null; }
}

function calldataBytes(data: string): number {
  return data === '0x' ? 0 : (data.length - 2) / 2;
}

export function deterministicChecks(intent: IntentDefinition, action: CanonicalAction): LocalCheckResult {
  const rules = intent.hardRules ?? {};
  const invalidRules = invalidHardRules(intent.hardRules);
  if (invalidRules) return { status: 'BLOCK', checks: { invalidHardRules: true }, summary: invalidRules };
  const checks: Record<string, unknown> = {
    targetChainId: action.targetChainId,
    selector: action.selector,
    to: action.to,
    valueWei: action.valueWei,
    calldataBytes: calldataBytes(action.data),
  };

  if (rules.allowedTargetChainIds?.length) {
    const passed = rules.allowedTargetChainIds.includes(action.targetChainId);
    checks.allowedTargetChainIds = { passed, allowed: rules.allowedTargetChainIds };
    if (!passed) return { status: 'BLOCK', checks, summary: 'Target chain is outside the deterministic chain allowlist.' };
  }

  if (rules.forbiddenTargetChainIds?.length) {
    const blocked = rules.forbiddenTargetChainIds.includes(action.targetChainId);
    checks.forbiddenTargetChainIds = { blocked, forbidden: rules.forbiddenTargetChainIds };
    if (blocked) return { status: 'BLOCK', checks, summary: 'Target chain is deterministically forbidden.' };
  }

  if (rules.forbidContractCreation) {
    const blocked = action.to === null;
    checks.contractCreation = { blocked };
    if (blocked) return { status: 'BLOCK', checks, summary: 'Contract creation is forbidden by the deterministic mandate rules.' };
  }

  if (rules.maxCalldataBytes !== undefined) {
    const actual = calldataBytes(action.data);
    const passed = actual <= rules.maxCalldataBytes;
    checks.maxCalldataBytes = { max: rules.maxCalldataBytes, actual, passed };
    if (!passed) return { status: 'BLOCK', checks, summary: 'Calldata exceeds the deterministic mandate limit.' };
  }

  if (rules.requireZeroNativeValue) {
    const passed = BigInt(action.valueWei) === 0n;
    checks.requireZeroNativeValue = { passed, actual: action.valueWei };
    if (!passed) return { status: 'BLOCK', checks, summary: 'Native value is forbidden by this mandate.' };
  }

  if (rules.maxNativeValueWei !== undefined) {
    let max: bigint;
    try { max = BigInt(rules.maxNativeValueWei); } catch {
      return { status: 'BLOCK', checks, summary: 'Integration supplied an invalid native-value limit.' };
    }
    if (max < 0n) return { status: 'BLOCK', checks, summary: 'Integration supplied an invalid native-value limit.' };
    const actual = BigInt(action.valueWei);
    checks.maxNativeValueWei = { max: max.toString(), actual: actual.toString(), passed: actual <= max };
    if (actual > max) return { status: 'BLOCK', checks, summary: 'Native value exceeds the deterministic mandate limit.' };
  }

  const lowerTo = action.to?.toLowerCase() ?? null;
  if (rules.allowedTargets?.length) {
    const allowed = rules.allowedTargets.map((x) => x.toLowerCase());
    const passed = lowerTo !== null && allowed.includes(lowerTo);
    checks.allowedTargets = { passed, allowed };
    if (!passed) return { status: 'BLOCK', checks, summary: 'Target address is outside the deterministic allowlist.' };
  }

  if (rules.forbiddenTargets?.length && lowerTo) {
    const forbidden = rules.forbiddenTargets.map((x) => x.toLowerCase());
    const blocked = forbidden.includes(lowerTo);
    checks.forbiddenTargets = { blocked, forbidden };
    if (blocked) return { status: 'BLOCK', checks, summary: 'Target address is deterministically forbidden.' };
  }

  if (rules.forbiddenSelectors?.length) {
    const forbidden = rules.forbiddenSelectors.map((x) => x.toLowerCase());
    const blocked = forbidden.includes(action.selector.toLowerCase());
    checks.forbiddenSelectors = { blocked, forbidden };
    if (blocked) return { status: 'BLOCK', checks, summary: 'Function selector is deterministically forbidden.' };
  }

  if (rules.forbidUnlimitedApprovals && action.selector === ERC20_APPROVE) {
    const amount = decodeApproveAmount(action.data);
    const unlimited = amount === UINT256_MAX;
    checks.unlimitedApproval = { decoded: amount?.toString() ?? null, unlimited };
    if (unlimited) return { status: 'BLOCK', checks, summary: 'ERC-20 unlimited approval is forbidden by the mandate.' };
  }

  checks.semanticJudgement = 'required';
  return {
    status: 'REQUIRES_CONSENSUS',
    checks,
    summary: `Transaction to ${action.to ?? 'contract creation'} with selector ${action.selector} requires semantic comparison against intent revision ${intent.revision}.`,
  };
}

export { ERC20_APPROVE, UINT256_MAX };
