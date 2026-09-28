# INTENT

**Semantic transaction authorisation for wallets and autonomous agents, adjudicated on GenLayer Studionet (chain ID 61999).**

INTENT turns a human-written mandate into a fail-closed wallet guard. A dapp or agent proposes a transaction, deterministic checks reject obvious violations locally, and only ambiguous cases are sent to GenLayer validators. Compatibility Mode forwards only an isolated transaction snapshot after a finalized, successfully executed GenLayer decision is `MATCHES_INTENT`.

> Network rule: every GenLayer deployment and write in this repository targets **Studionet 61999** (`https://studio.genlayer.com/api`). Studio Dev / 61997 is intentionally unsupported.

## What ships

- `contracts/intent_guard.py` — GenLayer Intelligent Contract with immutable intent revisions, revocation, consensus decisions, replay resistance and execution receipts.
- `packages/wallet-guard/` — reusable EIP-1193 guard SDK. It intercepts `eth_sendTransaction`, performs deterministic hard-rule checks, temporarily switches the wallet to GenLayer Studionet for adjudication, restores the target chain, re-validates the request and then forwards it.
- `frontend/` — Next.js App Router control plane for creating mandates, inspecting decisions, testing transactions and generating integration snippets.
- `tests/` — GenLayer Direct Mode contract tests, cross-language action-hash parity checks, an integration checklist and executable SDK security tests.
- `scripts/` — Studionet-only deployment/network guards.
- `protected-account/` — Sepolia target-chain registry and Safe Guard for exact one-time, threshold-attested protected-account authorizations.
- threat model, demo script and reviewer evidence documents.

## Core trust boundary

Compatibility Mode is application-level fail-closed enforcement, not cryptographic wallet-level enforcement. The guard synchronously snapshots and recursively isolates the complete EIP-1193 transaction request, including caller-supplied gas/fee/nonce and extension fields, before any asynchronous callback. It adjudicates and forwards only that isolated snapshot. The browser wallet remains a trusted signer boundary and may populate omitted transport fields. Integrators must ensure the guarded provider is the only provider exposed to the protected action path.

GenLayer decides only the semantic question:

> Does this exact proposed wallet action fit this exact human intent revision?

The wallet evaluator waits for **finalized** GenLayer state and verifies the GenVM execution result before reading a decision. The result is one of:

- `MATCHES_INTENT`
- `DOES_NOT_MATCH`
- `UNCLEAR`

Only `MATCHES_INTENT` can pass the guard. There is no fail-open option.

## Architecture

```text
Dapp / Agent
    |
    | eth_sendTransaction
    v
INTENT Wallet Guard
    |-- canonicalises the exact target transaction
    |-- rejects deterministic hard-rule violations locally
    |-- hashes the canonical action
    |
    | ambiguous
    v
GenLayer Studionet 61999
    |
    | IntentGuard.evaluate(...)
    | independent validator judgement
    v
MATCHES_INTENT / DOES_NOT_MATCH / UNCLEAR
    |
    | only MATCHES_INTENT
    v
restore original target chain
re-read chain + account
rebuild and compare canonical action
    |
    v
base EIP-1193 provider -> target transaction
    |
    v
optional execution receipt anchored back to INTENT
```

## Protected Account Mode

For stronger enforcement, assets are held by a Safe on Ethereum Sepolia rather
than an ordinary EOA. A finalized successful `MATCHES_INTENT` decision is converted
by a threshold of attestors into an EIP-712 certificate admitted to
`IntentAuthorizationRegistry`. `IntentSafeGuard` uses the official Safe v1.4.1
transaction hash, binding the exact Safe, Sepolia chain, nonce, recipient, value,
calldata, operation and gas/refund fields, and rejects any
mutation or replay. Successful execution consumes the one-time authorization.

This is threshold-attested finalized GenLayer authorization, not a trustless
cross-chain proof. The registry/attestor configuration is an explicit trust
assumption, and Safe modules must remain disabled or receive equivalent protection.
The repository contains the target-chain contracts and focused Solidity tests. A
real Ethereum Sepolia Registry, Guard, official Safe v1.4.1 proxy and demo target
are deployed and exercised; addresses and transaction evidence are recorded in
`LIVE_EVIDENCE.md`. The five attestors are test-controlled keys, not independent
operators.

## Example mandate

> Purchase one annual Pro subscription from ExampleCloud for no more than 200 USDC. Do not create a recurring token approval, grant an unlimited approval, or authorise any unrelated transfer.

The target transaction can include a payment plus arbitrary calldata. Deterministic code can reject an unlimited ERC-20 approval immediately. The SDK also deterministically describes native transfers and standard ERC-20 transfer/approve calldata without trusting a dapp-supplied ABI label. Unknown calls remain explicitly unknown unless an integration supplies a supporting decoder, and the canonical request always outranks that prose.

## Quick start

### 1. Tooling

Requirements:

- Node.js 20+
- Python 3.12+
- a browser EIP-1193 wallet
- no global GenLayer CLI is required; this repository pins local `genlayer@0.39.1`

Install project dependencies when online:

```bash
npm install
# installs repository-local genlayer@0.39.1; does not alter your global CLI
python -m pip install -r requirements.txt
```

### 2. Verify the network

```bash
npm run check:cli-pin
npm run cli:version
npm run cli:network:studionet
npm run cli:network:info
node scripts/assert-studionet.mjs
```

Expected chain ID: `61999`.

> **CLI isolation:** If your PC already has `genlayer 0.40.0-rc2` installed globally, leave it alone. INTENT never calls it. The repo-local wrapper only executes `./node_modules/.bin/genlayer` after verifying that package is exactly `0.39.1`.

### 3. Lint and test the contract

```bash
genvm-lint check contracts/intent_guard.py
pytest tests/direct -v
```

### 4. Deploy to Studionet

```bash
npm run deploy:studionet
```

Copy the deployed address into:

```bash
cp frontend/.env.example frontend/.env.local
# NEXT_PUBLIC_INTENT_CONTRACT_ADDRESS=0x...
```

### 5. Start the control plane

```bash
npm run dev
```

## Wallet-guard integration

```ts
import { createIntentProtectedProvider } from './src/lib/guarded-provider';

const guarded = createIntentProtectedProvider({
  provider: window.ethereum,
  contractAddress: '0x...',
  intentId: 'cloud-pro-2026',
  hardRules: {
    forbidUnlimitedApprovals: true,
    allowedTargetChainIds: [8453],
  },
});

// Give guarded — not window.ethereum — to the protected transaction path.
await guarded.request({
  method: 'eth_sendTransaction',
  params: [transaction],
});
```

## Important production notes

1. Studionet is a hosted development environment. INTENT is production-shaped, but 61999 itself is not presented here as a production settlement network.
2. The semantic decision is only as good as the evidence given to validators. The canonical transaction payload is authoritative; descriptive summaries are explicitly treated as untrusted supporting material.
3. The guard serialises protected sends, restores and verifies the original target chain after GenLayer adjudication, and forwards only the isolated request snapshot whose action ID was adjudicated.
4. Never expose a raw provider alongside the guarded provider for an action path you claim is protected.
5. Do not put wallet private keys, seed phrases or server signers in frontend code.

See `ARCHITECTURE.md`, `SECURITY.md`, `DEMO.md`, `REVIEW_EVIDENCE.md`, `FINAL_REVIEW.md`, `FINAL_VALIDATION.md`, and `CODEX_HANDOFF.md` for the full design, evidence boundary and continuation instructions.
