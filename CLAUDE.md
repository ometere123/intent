# INTENT agent instructions

Continue this repository **in place**. Do not restart, rescope, scaffold a replacement, or convert INTENT into a generic dapp.

## Non-negotiable architecture

- GenLayer network is **Studionet chain 61999 only**.
- Stable RPC is `https://studio.genlayer.com/api`.
- Do not use Studio Dev / preview chain 61997 anywhere.
- `contracts/intent_guard.py` is the semantic authority layer.
- `packages/wallet-guard` is the EIP-1193 enforcement boundary.
- The target wallet remains the signer. Never introduce seed phrases, a custodial signer, or backend private keys.
- `UNCLEAR`, validator failure, stale revisions, binding mismatch, changed chain/account/request, and malformed input must fail closed.
- The protected dapp/agent path must receive the guarded provider, not raw `window.ethereum`.
- Immutable intent revisions, family revocation, content-addressed action IDs and finalized GenLayer decisions are architectural invariants.
- Read-only Studionet state must not switch the browser wallet chain.
- Guarded `eth_sendTransaction` authorisations are serialised to prevent network-switch races.

## Current toolchain reference

The runner pin at the top of `contracts/intent_guard.py` matches the current GenLayer project boilerplate as checked on 2026-09-27.

Python dev dependencies are aligned with the current boilerplate:

- `genlayer-py` v0.18
- `genlayer-test` v0.29
- `genvm-linter` main

INTENT pins the repository-local GenLayer CLI to **`genlayer@0.39.1`**, the stable CLI documented for Studionet 61999. Do not use or modify the machine-global CLI. In particular, a global `0.40.0-rc2` belongs to the release-candidate toolchain and must not be allowed to move INTENT to Studio Dev / 61997.

`npm install` installs `genlayer@0.39.1` into this repository. All CLI commands must go through `npm run ...` or `node scripts/genlayer-local.mjs ...`; the wrapper verifies the installed local package is exactly 0.39.1 and refuses to fall back to a global binary.

## Required command loop

```bash
npm install
python -m pip install -r requirements.txt
npm run check:cli-pin
npm run cli:version
npm test
genvm-lint check contracts/intent_guard.py
pytest tests/direct -v
npm run typecheck
npm run build
node scripts/assert-studionet.mjs
```

Do not weaken a test to make it pass. Fix the implementation or update a test only when current GenLayer tooling proves the old test API is obsolete.

## Before live deployment

1. `npm run check:cli-pin`
2. `npm run cli:version` and require exactly `0.39.1`.
3. `npm run cli:network:studionet`
4. `npm run cli:network:info`
5. `node scripts/assert-studionet.mjs`
6. Confirm chain ID exactly `61999` and RPC `https://studio.genlayer.com/api`.
7. Estimate deployment/evaluate fees with the stable 0.39.1 Studionet CLI/SDK.
8. Deploy only after the independent version/network checks agree.

After deployment set both where appropriate:

```bash
export INTENT_CONTRACT_ADDRESS=0x...
# frontend/.env.local
NEXT_PUBLIC_INTENT_CONTRACT_ADDRESS=0x...
```

Then run:

```bash
npm run postdeploy:check
```

## Finish criteria

A handoff is complete only when:

- GenVM lint is green;
- all Direct Mode tests are green;
- wallet SDK tests and hash-parity tests are green;
- real Next.js typecheck and production build are green;
- the contract is deployed on 61999;
- live matching, contradictory and intentionally ambiguous decisions have been exercised with real consensus;
- only finalized + successful `MATCHES_INTENT` is consumed;
- revision, revoke, duplicate-action, receipt-chain and pagination paths are exercised;
- a real target-chain test transaction goes through the guarded provider;
- target chain restoration is demonstrated on match, deny, unclear and error paths;
- fee measurements and all deployment/test transaction IDs are written to `LIVE_EVIDENCE.md`;
- no unresolved P0/P1 issue remains after a hostile review of `SECURITY.md`.

Return the entire updated repository, not snippets.
