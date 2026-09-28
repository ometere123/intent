# Prompt to give Codex or Claude Code

GOAL: Finish and live-validate INTENT on GenLayer Studionet 61999.

Continue INTENT from this unzipped repository **in place**.

Do not redesign it, restart it, scaffold a replacement, create a parallel implementation, downgrade it into a transaction simulator, or move it to any other GenLayer network.

The architecture is substantially frozen. Treat the current repository as a near-final implementation and modify it only to fix genuine implementation, compatibility, security, test, deployment or reviewer-readiness issues.

INTENT is a semantic wallet authorisation layer. A protected dapp or autonomous agent calls a wrapped EIP-1193 provider. Deterministic policy checks block obvious violations locally. Ambiguous authority is adjudicated by the INTENT Intelligent Contract. Only a finalized, successfully executed `MATCHES_INTENT` decision bound to the exact action hash and latest intent revision may release the original target-chain request.

HARD NETWORK CONSTRAINT:

- GenLayer Studionet only.
- Chain ID: 61999.
- RPC: https://studio.genlayer.com/api
- Never use 61997, Studio Dev, Studio Next preview, or another network as a substitute.
- The repository must install and use local `genlayer@0.39.1` exactly. The machine may have global `genlayer 0.40.0-rc2`; do not uninstall it and do not invoke it for INTENT. Use the repo-local wrapper/npm scripts only.

PRESERVE THESE SECURITY INVARIANTS:

1. fail closed on `DOES_NOT_MATCH`, `UNCLEAR`, consensus failure or malformed decision;
2. immutable intent revisions;
3. only the latest non-revoked, non-expired revision can authorise a new action;
4. SHA-256 action IDs are recomputed by the contract from canonical action JSON;
5. action IDs are case-normalised on-chain;
6. complete EIP-1193 request binding includes gas, fee, nonce and extension fields supplied by the caller;
7. malformed addresses/hex, conflicting `data`/`input`, or declared-chain mismatch fail before consensus;
8. wallet account, target chain and canonical request are rechecked after adjudication;
9. guarded sends are serialised per provider so concurrent calls cannot race network switching;
10. read-only Studionet contract reads must not switch the user's wallet network;
11. optional execution-receipt anchoring must never resubmit the already-sent target transaction;
12. raw provider bypass remains explicitly outside the cryptographic boundary, and protected code must receive only the guarded provider;
13. no private keys, seed phrases or custodial backend signer;
14. the contract constructor and every write stay hard-pinned to chain 61999.

DO THIS IN ORDER:

1. Read `AGENTS.md`, `ARCHITECTURE.md`, `SECURITY.md`, `REVIEW_EVIDENCE.md`, `BUILD_STATUS.md` and `LIVE_EVIDENCE.md`.
2. Install dependencies with `npm install` and `python -m pip install -r requirements.txt`. Confirm `npm run check:cli-pin` and `npm run cli:version` report the repository-local GenLayer CLI exactly `0.39.1`. Do not use the global CLI.
3. Run `npm test` and preserve every wallet-guard + cross-language hash-parity invariant.
4. Run `genvm-lint check contracts/intent_guard.py` using the currently supported stable GenVM/Studionet toolchain. Fix genuine linter/runtime issues without weakening architecture.
5. Run `pytest tests/direct -v`. Fix any Direct Mode API drift against the pinned current GenLayer testing suite.
6. Run the real frontend `npm run typecheck` and `npm run build`. Fix all actual Next.js/React/genlayer-js typing/build problems. Do not replace real contract calls with fixtures.
7. Run `npm run cli:network:studionet`, then verify Studionet with `npm run cli:network:info` and `node scripts/assert-studionet.mjs`. Stop unless the local CLI remains exactly 0.39.1 and the network reports RPC `https://studio.genlayer.com/api`, chain ID 61999.
8. Estimate deployment fees, then deploy `contracts/intent_guard.py` to 61999.
9. Run `INTENT_CONTRACT_ADDRESS=<address> npm run postdeploy:check` and confirm the contract reports Studionet 61999 and the expected contract version.
10. Configure `frontend/.env.local` with the deployed contract address.
11. Exercise live intent lifecycle: create, duplicate rejection, revise, historical revision read, stale-revision rejection, revoke, revoked evaluation rejection, revocation audit record, owner counts and pagination.
12. Exercise real consensus with at least three bounded cases: clearly matching, clearly contradictory, intentionally ambiguous. Confirm `UNCLEAR` fails closed.
13. Confirm decision records bind owner, intent ID, exact latest revision, lowercase action ID, canonical action, consensus outcome and consensus reason code.
14. Exercise duplicate action rejection including uppercase/lowercase action-ID replay.
15. Exercise positive execution-receipt anchoring and wrong-chain receipt rejection.
16. Exercise the guarded provider against an inexpensive target-chain test transaction. Prove the original target chain is restored after adjudication and after receipt anchoring.
17. Re-run adversarial SDK scenarios: account mutation, chain mutation, calldata/value mutation, gas/fee mutation, malformed address, conflicting data/input, wrong declared chain, concurrent sends and adjudication outage.
18. Measure fee estimates for representative and worst-bounded `evaluate` inputs. Record the exact input sizes, fee preset/distribution and resulting costs.
19. Put the deployed address, deploy tx, consensus tx IDs, target tx hash, receipt-anchor tx IDs, fee measurements, tool versions and final command outputs into `LIVE_EVIDENCE.md`.
20. Perform a final hostile review as if you were a GenLayer project reviewer. Fix all genuine P0/P1 findings and any straightforward P2 that materially improves correctness.

Do not claim a test is green unless you actually ran it. Do not fabricate transaction IDs, fees or deployment evidence. Leave only steps that truly require a human wallet/account decision.

When finished, return one complete updated INTENT repository/ZIP plus a short report of: tests, deployed 61999 address, transaction IDs, fees, remaining manual steps (if any), and any reviewer-risk that could not honestly be eliminated.
