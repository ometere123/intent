# Build status

## Validated in this preparation environment

- root `package.json` pins repository-local `genlayer@0.39.1` exactly for stable Studionet 61999; `scripts/genlayer-local.mjs` refuses global/future CLI fallback.

- GenLayer runner dependency pin matches the current official project boilerplate checked on 2026-09-27.
- Python dev dependencies are aligned with current official boilerplate pins (`genlayer-py` v0.18, `genlayer-test` v0.29, current `genvm-linter`).
- wallet-guard TypeScript compiles with TypeScript 5.8.3.
- **36 executable wallet-guard security tests pass**.
- **8 official Safe v1.4.1 protected-account tests pass**, including real Safe proxy
  installation, full Safe transaction-hash parity, nonce binding, expiry, mutation,
  failed-inner-call consumption, delegatecall blocking and delayed guard removal.
- Two reference-attestor hash/finality rejection tests pass.
- cross-language canonical-action SHA-256 parity passes for representative JS/Python requests.
- contract and Direct Mode test files pass Python syntax compilation.
- frontend TypeScript typecheck and production build pass with installed dependencies.
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
- the finality helper requires FINALIZED plus non-contradictory authoritative execution
  evidence, including Studio consensus leader/validator receipt structures when present.

## Explicit limitations

- The native Windows Direct Mode harness has a temporary-file locking issue; the stable `v0.2.12` Direct Mode suite passes under WSL.
- Static lint passes. Full `genvm-lint check` validation is not claimed because `genvm-linter 0.11.1rc2` cannot resolve the old `v0.2.12` runner archive format.
- No external target-chain transaction was executed in the live run, so no execution-receipt anchor is claimed. See `LIVE_EVIDENCE.md`.
- Sepolia Registry, Guard, Safe and attestor live deployment were not performed in this
  environment because no Sepolia signer/RPC credentials are available. The target-chain
  package is locally tested against the official Safe v1.4.1 implementation; no live
  target-chain address or execution is claimed.
