import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import type { EIP1193Provider, HardRules, IntentDefinition } from '@intent/wallet-guard';
import { requireFinalizedExecutionSuccess } from './genlayer-finality';

const CONTRACT = process.env.NEXT_PUBLIC_INTENT_CONTRACT_ADDRESS as `0x${string}` | undefined;
const STUDIONET_HEX = '0xf22f';
const EXPECTED_CHAIN = 61999;
const PAGE_SIZE = 100;
const FINALITY_WAIT = { interval: 5000, retries: 180, fullTransaction: true };

function contractAddress(): `0x${string}` {
  if (!CONTRACT || !/^0x[0-9a-fA-F]{40}$/.test(CONTRACT)) {
    throw new Error('NEXT_PUBLIC_INTENT_CONTRACT_ADDRESS is not configured with a valid deployed address.');
  }
  return CONTRACT;
}

function readonlyClient() {
  return createClient({ chain: studionet });
}

async function read(functionName: string, args: unknown[]) {
  return readonlyClient().readContract({
    address: contractAddress(),
    functionName,
    args,
    stateStatus: 'finalized',
  } as never);
}

async function connectedWrite(provider: EIP1193Provider) {
  const contract = contractAddress();
  await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: STUDIONET_HEX }] });
  const chainRaw = await provider.request({ method: 'eth_chainId' });
  if (typeof chainRaw !== 'string' || Number.parseInt(chainRaw, 16) !== EXPECTED_CHAIN) {
    throw new Error('INTENT requires GenLayer Studionet 61999.');
  }
  const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
  if (!accounts?.[0] || !/^0x[0-9a-fA-F]{40}$/.test(accounts[0])) throw new Error('No valid wallet account connected.');
  const account = accounts[0] as `0x${string}`;
  const client = createClient({ chain: studionet, account, provider: provider as never });
  return { client, account, contract };
}

async function write(provider: EIP1193Provider, functionName: string, args: unknown[]) {
  const originalChainRaw = await provider.request({ method: 'eth_chainId' }).catch(() => null);
  const originalChain = typeof originalChainRaw === 'string' && /^0x[0-9a-fA-F]+$/.test(originalChainRaw)
    ? Number.parseInt(originalChainRaw, 16)
    : 0;
  try {
    const { client, contract } = await connectedWrite(provider);
    const request = { address: contract, functionName, args };
    const hash = await client.writeContract({
      ...request,
      value: BigInt(0),
    } as never);
    const receipt = await client.waitForTransactionReceipt({ hash, status: 'FINALIZED', ...FINALITY_WAIT } as never);
    requireFinalizedExecutionSuccess(receipt);
    return hash;
  } finally {
    if (Number.isSafeInteger(originalChain) && originalChain > 0 && originalChain !== EXPECTED_CHAIN) {
      try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${originalChain.toString(16)}` }] });
      } catch {
        // The Studionet write may already be finalized. Restoration is a control-plane UX best effort,
        // unlike the runtime guard where restoration is mandatory before target execution.
      }
    }
  }
}

export async function createIntent(provider: EIP1193Provider, input: { id: string; statement: string; scope: Record<string, unknown>; hardRules?: HardRules; expiresAtUnix: number }) {
  return write(provider, 'create_intent', [input.id, input.statement, JSON.stringify(input.scope), JSON.stringify(input.hardRules ?? {}), input.expiresAtUnix]);
}

export async function reviseIntent(provider: EIP1193Provider, input: { id: string; statement: string; scope: Record<string, unknown>; hardRules?: HardRules; expiresAtUnix: number }) {
  return write(provider, 'revise_intent', [input.id, input.statement, JSON.stringify(input.scope), JSON.stringify(input.hardRules ?? {}), input.expiresAtUnix]);
}

export async function revokeIntent(provider: EIP1193Provider, id: string) {
  return write(provider, 'revoke_intent', [id]);
}

export async function getNetwork() {
  return read('get_network', []);
}

export async function getOwnerCounts(owner: string) {
  return read('get_owner_counts', [owner]);
}

export async function getLatestRevision(owner: string, id: string) {
  return read('get_latest_revision', [owner, id]);
}

export async function getIntent(owner: string, id: string, revision: number) {
  return read('get_intent', [owner, id, revision]);
}

export async function getDecision(owner: string, actionId: string) {
  return read('get_decision', [owner, actionId]);
}

export async function isRevoked(owner: string, id: string) {
  return read('is_revoked', [owner, id]);
}

export async function getRevocation(owner: string, id: string) {
  return read('get_revocation', [owner, id]);
}

export async function getExecutionReceipt(owner: string, actionId: string) {
  return read('get_execution_receipt', [owner, actionId]);
}

async function readIdsPage(functionName: 'list_intent_ids_page' | 'list_action_ids_page', owner: string, offset: number, limit: number): Promise<string[]> {
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Page offset must be a non-negative integer.');
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > PAGE_SIZE) throw new Error(`Page limit must be between 1 and ${PAGE_SIZE}.`);
  const raw = await read(functionName, [owner, offset, limit]);
  return Array.isArray(raw) ? raw.map(String) : [];
}

export function listIntentIdsPage(owner: string, offset: number, limit: number) {
  return readIdsPage('list_intent_ids_page', owner, offset, limit);
}

export function listActionIdsPage(owner: string, offset: number, limit: number) {
  return readIdsPage('list_action_ids_page', owner, offset, limit);
}

async function readAllIds(functionName: 'list_intent_ids_page' | 'list_action_ids_page', owner: string): Promise<string[]> {
  const output: string[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await readIdsPage(functionName, owner, offset, PAGE_SIZE);
    output.push(...page);
    if (page.length < PAGE_SIZE) return output;
    if (output.length >= 10_000) throw new Error('Owner history exceeds the client safety cap of 10,000 entries.');
  }
}

export function listIntentIds(owner: string) {
  return readAllIds('list_intent_ids_page', owner);
}

export function listActionIds(owner: string) {
  return readAllIds('list_action_ids_page', owner);
}

export async function listRecentActionIds(owner: string, totalCount: number, maximum = 250): Promise<string[]> {
  const count = Math.max(0, Math.min(Number.isSafeInteger(totalCount) ? totalCount : 0, 10_000_000));
  const take = Math.min(Math.max(0, maximum), count);
  if (!take) return [];
  const output: string[] = [];
  let offset = count - take;
  while (output.length < take) {
    const limit = Math.min(PAGE_SIZE, take - output.length);
    const page = await listActionIdsPage(owner, offset, limit);
    output.push(...page);
    if (page.length < limit) break;
    offset += page.length;
  }
  return output;
}

function tightenRules(onChain: HardRules, extra?: HardRules): HardRules {
  if (!extra) return onChain;
  const intersection = <T>(a?: T[], b?: T[]) => a && b ? a.filter((value) => b.includes(value)) : (a ?? b);
  const union = <T>(a?: T[], b?: T[]) => Array.from(new Set([...(a ?? []), ...(b ?? [])]));
  const output: HardRules = {
    allowedTargetChainIds: intersection(onChain.allowedTargetChainIds, extra.allowedTargetChainIds),
    forbiddenTargetChainIds: union(onChain.forbiddenTargetChainIds, extra.forbiddenTargetChainIds),
    allowedTargets: intersection(onChain.allowedTargets, extra.allowedTargets),
    forbiddenTargets: union(onChain.forbiddenTargets, extra.forbiddenTargets),
    forbiddenSelectors: union(onChain.forbiddenSelectors, extra.forbiddenSelectors),
    forbidContractCreation: Boolean(onChain.forbidContractCreation || extra.forbidContractCreation),
    requireZeroNativeValue: Boolean(onChain.requireZeroNativeValue || extra.requireZeroNativeValue),
    forbidUnlimitedApprovals: Boolean(onChain.forbidUnlimitedApprovals || extra.forbidUnlimitedApprovals),
  };
  const limits = [onChain.maxCalldataBytes, extra.maxCalldataBytes].filter((value): value is number => value !== undefined);
  if (limits.length) output.maxCalldataBytes = Math.min(...limits);
  const native = [onChain.maxNativeValueWei, extra.maxNativeValueWei].filter((value): value is string => value !== undefined);
  if (native.length) output.maxNativeValueWei = native.reduce((a, b) => BigInt(a) < BigInt(b) ? a : b);
  return Object.fromEntries(Object.entries(output).filter(([, value]) => value !== undefined && (!Array.isArray(value) || value.length > 0))) as HardRules;
}

export async function resolveLatestIntent(owner: string, id: string, hardRules?: HardRules): Promise<IntentDefinition> {
  const latest = Number(await getLatestRevision(owner, id));
  if (!Number.isSafeInteger(latest) || latest < 1) throw new Error(`Intent ${id} was not found for ${owner}.`);
  if (Boolean(await isRevoked(owner, id))) throw new Error(`Intent ${id} is revoked.`);
  const raw = await getIntent(owner, id, latest);
  if (typeof raw !== 'string' || !raw) throw new Error(`Intent ${id} revision ${latest} could not be read.`);
  const record = JSON.parse(raw) as { statement?: unknown; expires_at_unix?: unknown; hard_rules?: unknown };
  if (typeof record.statement !== 'string' || !record.statement) throw new Error('On-chain intent statement is invalid.');
  const expiry = Number(record.expires_at_unix ?? 0);
  if (expiry && Date.now() >= expiry * 1000) throw new Error(`Intent ${id} is expired.`);
  const onChainRules = (record.hard_rules && typeof record.hard_rules === 'object' ? record.hard_rules : {}) as HardRules;
  return { id, revision: latest, statement: record.statement, hardRules: tightenRules(onChainRules, hardRules) };
}

export function configuredContractAddress() {
  return CONTRACT;
}
