import type { CanonicalAction, Hex, WalletTransaction } from './types.js';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HEX_DATA_RE = /^0x(?:[0-9a-fA-F]{2})*$/;
const HEX_QUANTITY_RE = /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/;
const SAFE_KEY_RE = /^[A-Za-z0-9_.$:-]{1,80}$/;

function normalAddress(value: unknown, name: string, allowMissing = false): string {
  if (value === undefined || value === null || value === '') {
    if (allowMissing) return '0x';
    throw new TypeError(`${name} must be a 20-byte 0x-prefixed address.`);
  }
  if (typeof value !== 'string' || !ADDRESS_RE.test(value)) {
    throw new TypeError(`${name} must be a 20-byte 0x-prefixed address.`);
  }
  return value.toLowerCase();
}

function normalData(value: unknown, name: string): string {
  if (value === undefined || value === null || value === '') return '0x';
  if (typeof value !== 'string' || !HEX_DATA_RE.test(value)) {
    throw new TypeError(`${name} must be 0x-prefixed whole-byte hexadecimal data.`);
  }
  return value.toLowerCase();
}

function bigintFromQuantity(value: unknown, name: string): bigint {
  if (value === undefined || value === null || value === '') return 0n;
  if (typeof value !== 'string' || !HEX_QUANTITY_RE.test(value)) {
    throw new TypeError(`${name} must be an EIP-1193 hexadecimal quantity.`);
  }
  return BigInt(value);
}

function assertSafeObjectKey(key: string): void {
  if (!SAFE_KEY_RE.test(key)) {
    throw new TypeError(`Unsupported transaction object key: ${JSON.stringify(key)}.`);
  }
}

function canonicalRpcValue(value: unknown): unknown {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new TypeError('Numeric transaction extension values must be safe integers.');
    return value;
  }
  if (typeof value === 'bigint') return value.toString(10);
  if (typeof value === 'string') return value.startsWith('0x') ? value.toLowerCase() : value;
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map(canonicalRpcValue);
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      assertSafeObjectKey(key);
      const normalized = canonicalRpcValue((value as Record<string, unknown>)[key]);
      if (normalized !== undefined) output[key] = normalized;
    }
    return output;
  }
  throw new TypeError(`Unsupported EIP-1193 transaction value type: ${typeof value}`);
}

export function canonicaliseAction(
  transaction: WalletTransaction,
  targetChainId: number,
  fallbackFrom?: string,
): CanonicalAction {
  if (!Number.isSafeInteger(targetChainId) || targetChainId <= 0) {
    throw new TypeError('Target chain ID must be a positive safe integer.');
  }

  if (transaction.data !== undefined && transaction.input !== undefined) {
    const data = normalData(transaction.data, 'transaction.data');
    const input = normalData(transaction.input, 'transaction.input');
    if (data !== input) throw new TypeError('transaction.data and transaction.input disagree.');
  }

  if (transaction.chainId !== undefined) {
    const declared = Number(bigintFromQuantity(transaction.chainId, 'transaction.chainId'));
    if (declared !== targetChainId) {
      throw new TypeError(`Transaction chainId ${declared} does not match provider chain ${targetChainId}.`);
    }
  }

  const data = normalData(transaction.data ?? transaction.input, 'transaction.data');
  const from = normalAddress(transaction.from ?? fallbackFrom, 'transaction.from');
  const to = transaction.to === null || transaction.to === undefined
    ? null
    : normalAddress(transaction.to, 'transaction.to');
  const valueWei = bigintFromQuantity(transaction.value, 'transaction.value').toString(10);
  const request = canonicalRpcValue(transaction) as Record<string, unknown>;

  if (!('from' in request)) request.from = from;

  return {
    targetChainId,
    from,
    to,
    valueWei,
    data,
    selector: data.length >= 10 ? data.slice(0, 10) : '0x',
    request,
  };
}

export function stableStringify(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`;
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function actionId(action: CanonicalAction): Promise<string> {
  return sha256Hex(stableStringify(action));
}

export function sameAction(a: CanonicalAction, b: CanonicalAction): boolean {
  return stableStringify(a) === stableStringify(b);
}

export function chainHex(chainId: number): Hex {
  if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new TypeError('Chain ID must be a positive safe integer.');
  return `0x${chainId.toString(16)}` as Hex;
}
