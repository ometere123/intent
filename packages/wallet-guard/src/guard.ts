import { actionId, canonicaliseAction, chainHex, sameAction } from './canonical.js';
import { deterministicChecks } from './checks.js';
import { describeKnownAction } from './describe.js';
import type {
  EIP1193Provider,
  EIP1193RequestArguments,
  GuardOptions,
  WalletTransaction,
  EIP1193Listener,
} from './types.js';

export class IntentGuardError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'IntentGuardError';
  }
}

function asTx(args: EIP1193RequestArguments): WalletTransaction {
  if (!Array.isArray(args.params) || args.params.length !== 1 || typeof args.params[0] !== 'object' || args.params[0] === null) {
    throw new IntentGuardError('INTENT_BAD_TRANSACTION', 'eth_sendTransaction requires exactly one transaction object.');
  }
  return args.params[0] as WalletTransaction;
}

function parseChainId(value: unknown): number {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]+$/.test(value)) {
    throw new IntentGuardError('INTENT_BAD_CHAIN', 'Provider returned an invalid chain ID.');
  }
  const parsed = Number.parseInt(value, 16);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new IntentGuardError('INTENT_BAD_CHAIN', 'Provider returned an unsupported chain ID.');
  }
  return parsed;
}

async function selectedAccount(provider: EIP1193Provider): Promise<string> {
  const accounts = await provider.request({ method: 'eth_accounts' });
  if (!Array.isArray(accounts) || typeof accounts[0] !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(accounts[0])) {
    throw new IntentGuardError('INTENT_NO_ACCOUNT', 'No valid selected wallet account is available.');
  }
  return accounts[0].toLowerCase();
}

const providerAuthorisationTails = new WeakMap<EIP1193Provider, Promise<void>>();

export class IntentGuardProvider implements EIP1193Provider {
  constructor(private readonly base: EIP1193Provider, private readonly options: GuardOptions) {}

  private emit(event: Parameters<NonNullable<GuardOptions['onEvent']>>[0]): void {
    try { this.options.onEvent?.(event); } catch {}
  }

  private async serialise<T>(work: () => Promise<T>): Promise<T> {
    const previous = providerAuthorisationTails.get(this.base) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => gate);
    providerAuthorisationTails.set(this.base, tail);
    this.emit({ type: 'queued' });
    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  }

  async request(args: EIP1193RequestArguments): Promise<unknown> {
    if (args.method !== 'eth_sendTransaction') return this.base.request(args);
    return this.serialise(() => this.authoriseAndSend(args));
  }

  on(event: string, listener: EIP1193Listener): this {
    if (!this.base.on) throw new IntentGuardError('INTENT_EVENTS_UNSUPPORTED', 'Base wallet provider does not expose EIP-1193 event listeners.');
    this.base.on(event, listener);
    return this;
  }

  removeListener(event: string, listener: EIP1193Listener): this {
    if (!this.base.removeListener) throw new IntentGuardError('INTENT_EVENTS_UNSUPPORTED', 'Base wallet provider does not expose EIP-1193 event removal.');
    this.base.removeListener(event, listener);
    return this;
  }

  private async authoriseAndSend(args: EIP1193RequestArguments): Promise<unknown> {
    const tx = asTx(args);
    const targetChainHex = await this.base.request({ method: 'eth_chainId' });
    const targetChainId = parseChainId(targetChainHex);
    const accountBefore = await selectedAccount(this.base);

    if (typeof tx.from === 'string' && tx.from.toLowerCase() !== accountBefore) {
      throw new IntentGuardError('INTENT_FROM_MISMATCH', 'Transaction from address does not match the selected wallet account.');
    }

    let action;
    try {
      action = canonicaliseAction(tx, targetChainId, accountBefore);
    } catch (error) {
      throw new IntentGuardError('INTENT_BAD_TRANSACTION', error instanceof Error ? error.message : String(error));
    }

    const canonicalActionJson = JSON.stringify(action);
    if (canonicalActionJson.length > 14000) {
      throw new IntentGuardError('INTENT_ACTION_TOO_LARGE', 'Canonical action exceeds the 14,000-character contract evidence bound.');
    }

    const id = await actionId(action);
    const intent = await this.options.resolveIntent(tx);
    if (!intent || !intent.id || !Number.isSafeInteger(intent.revision) || intent.revision < 1 || !intent.statement) {
      throw new IntentGuardError('INTENT_BAD_INTENT', 'Intent resolver returned an invalid intent definition.');
    }

    const local = deterministicChecks(intent, action);
    this.emit({ type: 'captured', detail: { actionId: id, action, intent, local } });

    if (local.status === 'BLOCK') {
      this.emit({ type: 'local-block', detail: local });
      throw new IntentGuardError('INTENT_LOCAL_BLOCK', local.summary);
    }
    if (JSON.stringify(local.checks).length > 6000) {
      throw new IntentGuardError('INTENT_CHECKS_TOO_LARGE', 'Deterministic check evidence exceeds the 6,000-character contract bound.');
    }

    const decodedSummary = this.options.describeAction
      ? await this.options.describeAction(action, tx)
      : describeKnownAction(action);
    if (!decodedSummary || decodedSummary.length > 8000) {
      throw new IntentGuardError('INTENT_BAD_DESCRIPTION', 'Decoded action summary must contain 1 to 8000 characters.');
    }

    this.emit({ type: 'adjudicating', detail: { actionId: id } });
    let decision;
    let adjudicationError: unknown;
    try {
      decision = await this.options.evaluator.evaluate({ intent, actionId: id, action, localChecks: local, decodedSummary });
    } catch (error) {
      adjudicationError = error;
    }

    this.emit({ type: 'restoring-chain', detail: { targetChainId } });
    const currentChain = parseChainId(await this.base.request({ method: 'eth_chainId' }));
    if (currentChain !== targetChainId) {
      await this.base.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainHex(targetChainId) }] });
    }
    const chainAfter = parseChainId(await this.base.request({ method: 'eth_chainId' }));
    if (chainAfter !== targetChainId) throw new IntentGuardError('INTENT_CHAIN_CHANGED', 'Wallet did not return to the original target chain.');
    const accountAfter = await selectedAccount(this.base);
    if (accountAfter !== accountBefore) throw new IntentGuardError('INTENT_ACCOUNT_CHANGED', 'Selected account changed during adjudication.');

    if (adjudicationError) {
      throw new IntentGuardError('INTENT_ADJUDICATION_FAILED', adjudicationError instanceof Error ? adjudicationError.message : String(adjudicationError));
    }
    if (!decision) throw new IntentGuardError('INTENT_ADJUDICATION_FAILED', 'GenLayer evaluator returned no decision.');
    this.emit({ type: 'decision', detail: decision });
    if (decision.actionId !== id || decision.intentId !== intent.id || decision.intentRevision !== intent.revision) {
      throw new IntentGuardError('INTENT_DECISION_BINDING', 'GenLayer decision does not bind to this exact action and intent revision.');
    }
    if (decision.outcome !== 'MATCHES_INTENT') {
      throw new IntentGuardError(
        decision.outcome === 'UNCLEAR' ? 'INTENT_UNCLEAR' : 'INTENT_DENIED',
        decision.rationale || `GenLayer returned ${decision.outcome}.`,
      );
    }

    let rechecked;
    try {
      rechecked = canonicaliseAction(tx, chainAfter, accountAfter);
    } catch (error) {
      throw new IntentGuardError('INTENT_ACTION_CHANGED', error instanceof Error ? error.message : String(error));
    }
    if (!sameAction(action, rechecked) || (await actionId(rechecked)) !== id) {
      throw new IntentGuardError('INTENT_ACTION_CHANGED', 'Target transaction changed after GenLayer adjudication.');
    }

    this.emit({ type: 'forwarding', detail: { actionId: id } });
    const targetTxHash = await this.base.request(args);

    if (typeof targetTxHash === 'string' && this.options.evaluator.recordExecutionReceipt) {
      try {
        await this.options.evaluator.recordExecutionReceipt({ decision, targetChainId, targetTxHash });
        this.emit({ type: 'receipt-recorded', detail: { targetTxHash } });
      } catch (error) {
        this.emit({ type: 'receipt-failed', detail: error instanceof Error ? error.message : String(error) });
      } finally {
        try {
          const afterReceipt = parseChainId(await this.base.request({ method: 'eth_chainId' }));
          if (afterReceipt !== targetChainId) {
            await this.base.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainHex(targetChainId) }] });
          }
        } catch (error) {
          this.emit({ type: 'receipt-failed', detail: `Target-chain restoration after receipt anchoring failed: ${error instanceof Error ? error.message : String(error)}` });
        }
      }
    }
    return targetTxHash;
  }
}
