# Build status

## Validated in this preparation environment

- root `package.json` pins repository-local `genlayer@0.39.1` exactly for stable Studionet 61999; `scripts/genlayer-local.mjs` refuses global/future CLI fallback.

- GenLayer runner dependency pin matches the current official project boilerplate checked on 2026-09-27.
- Python dev dependencies are aligned with current official boilerplate pins (`genlayer-py` v0.18, `genlayer-test` v0.29, current `genvm-linter`).
- wallet-guard TypeScript compiles with TypeScript 5.8.3.
- **34 executable wallet-guard security tests pass**.
- cross-language canonical-action SHA-256 parity passes for representative JS/Python requests.
- contract and Direct Mode test files pass Python syntax compilation.
- frontend TS/TSX source passes parser-level checking; actual framework typecheck/build remains dependency-blocked here.
- executable/config source passes the Studionet-only chain scan.
- no fail-open option exists in the wallet guard.
- no 61997 preview-chain literal exists in executable/config source.

## Security work already closed

- complete EIP-1193 request binding, including caller-supplied nonce/gas/fee/extension fields;
- contract-side SHA-256 recomputation of canonical action JSON;
- strict address/data/quantity validation before consensus;
- `data`/`input` conflict rejection;
- declared transaction chain vs provider-chain mismatch rejection;
- account and target-chain recheck after adjudication;
- request mutation recheck immediately before forwarding;
- per-provider serialisation of guarded sends to prevent chain-switch races;
- latest-revision-only authorisation;
- family revocation + revocation audit record;
- action-ID case normalisation to prevent case-variant replay;
- paginated public owner history/count views;
- read-only frontend queries that do not switch the wallet network;
- finalized + successful GenVM execution requirement before a decision is consumed;
- consensus-backed `outcome` and coarse `reason_code`; free-form rationale is explicitly non-authoritative;
- optional receipt anchoring is post-send audit metadata and cannot resubmit a target transaction.

## Environment blockers reached here

This container has no package-registry/DNS access. `npm install` timed out and GenLayer Python tooling is not preinstalled. It also has no funded wallet. Therefore these are deliberately **not** claimed as completed:

- dependency installation and the real Next.js production build against installed Next/React/genlayer-js packages;
- `genvm-lint check contracts/intent_guard.py`;
- GenLayer Direct Mode runtime execution via `genlayer-test`;
- deployment to Studionet 61999;
- real-validator matching/contradictory/unclear consensus runs;
- live fee measurement;
- browser-wallet end-to-end target transaction and receipt anchoring.

`CODEX_HANDOFF.md` is the exact continuation prompt. `LIVE_EVIDENCE.md` is reserved for real addresses, transaction IDs, tool versions and measured fees.
