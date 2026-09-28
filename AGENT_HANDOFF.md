# INTENT completion handoff

Read these completely before changing source:

1. `README.md`
2. `SUBMISSION.md`
3. `ARCHITECTURE.md`
4. `SECURITY.md`
5. `TOOLCHAIN.md`
6. `DEPLOYMENT.md`
7. `LIVE_DEMO.md`
8. `REVIEW_EVIDENCE.md`
9. `LIVE_EVIDENCE.md`
10. `CODEX_HANDOFF.md`

Then read:

- `contracts/intent_guard.py`;
- all `packages/wallet-guard/src/*`;
- `frontend/src/lib/genlayer-evaluator.ts`;
- `frontend/src/lib/guarded-provider.ts`;
- `frontend/src/lib/intent-contract.ts`;
- all wallet-guard and Direct Mode tests.

Treat the architecture as substantially frozen. Fix genuine defects, toolchain drift, missing regression coverage and live integration issues. Do not restart the product.

## Absolute network/toolchain requirements

- Studionet only.
- Chain ID 61999.
- RPC `https://studio.genlayer.com/api`.
- Repository-local GenLayer CLI exactly `0.39.1`.
- Do not use the machine-global `0.40.0rc2`.
- Do not use Studio Dev or 61997.

## Completion threshold

Stop only when all locally applicable tests/lints/builds are genuinely green and the full live 61999 matrix in `LIVE_DEMO.md` is backed by real evidence, or when a remaining step truly requires a human/account-specific action that cannot be automated safely.

Do not fabricate live evidence. Do not weaken fail-closed behaviour merely to get a transaction through.
