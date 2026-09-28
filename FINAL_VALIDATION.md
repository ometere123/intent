# Final local validation record

Date: 2026-09-28

This file records what was actually executed in the preparation container. It deliberately separates green local evidence from checks that require dependencies, GenLayer tooling, network access or a funded wallet.

## Green here

- `npm test` — PASS
  - wallet-guard: **34/34** executable security/integration-boundary tests;
  - JS/Python canonical action SHA-256 parity: **3/3 representative requests**;
  - Studionet-only executable/config scan: PASS.
- `npm --workspace packages/wallet-guard run typecheck` — PASS.
- repository CLI manifest pin check — PASS: exact local dependency `genlayer@0.39.1`; wrapper refuses global/future CLI fallback. Actual binary execution awaits dependency installation.
- `python -m py_compile contracts/intent_guard.py tests/direct/*.py` — PASS.
- `pytest tests/direct --collect-only -q` — PASS: **22 Direct Mode tests collected**; actual fixture execution remains blocked until `genlayer-test` is installed.
- TypeScript/TSX syntax parse using installed TypeScript 5.8.3 — PASS for **22 source files** across `frontend/src` and `packages/wallet-guard/src`.
- Local GenVM AST safety precheck — PASS for the current documented safety categories checked here: dependency header present, no forbidden import set, no forbidden time/uuid calls, no float literals, no bare built-in exception raises.
- Contract uses integer-only UTC epoch conversion; no `datetime.timestamp()` float round-trip in executable code.

## Historical preparation notes

The original preparation-container blockers below are historical and were cleared in the online continuation environment.

### Frontend dependency typecheck/build

`npm run typecheck` reaches the frontend after the wallet SDK typecheck passes, then fails because frontend dependencies are not installed (`next`, `react`, `genlayer-js`, React JSX types, workspace resolution).

`npm run build` builds the wallet SDK and then stops at the frontend with `next: not found`.

Registry reachability was checked with `npm ping --fetch-timeout=5000 --fetch-retries=0` and failed with `EAI_AGAIN` resolving `registry.npmjs.org`.

### GenLayer runtime tooling

`genvm-lint`, the local `genlayer` package, and `gltest` are not installed in this container. The Direct Mode suite now collects to the expected GenLayer fixture boundary, but cannot execute because the `genlayer-test` pytest plugin is unavailable. Therefore the repository does **not** claim:

- official `genvm-lint` green;
- actual Direct Mode runtime green;
- CLI deployment or fee estimation green.

### Live Studionet

These statements describe the 2026-09-27 preparation container only. The live deployment and finalized validator evidence are recorded in `LIVE_EVIDENCE.md`.

## Handoff command order

The continuation was completed with dependency installation, stable Studionet verification, deployment, Direct Mode, frontend build, and finalized live consensus evidence. See `DEPLOYMENT.md` and `LIVE_EVIDENCE.md`.
