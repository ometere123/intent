# Final source-level hostile review

Review date: 2026-09-28

## Outcome

No known source-level P0/P1 issue remains after the final hardening pass. Live
GenLayer and Sepolia evidence is recorded in `LIVE_EVIDENCE.md`; this is not a
claim of trustless cross-chain verification.

## Closed in the final pass

- complete EIP-1193 request is content-addressed, including caller-supplied gas, fee, nonce and extension fields;
- signer identity is mandatory and bound even when the dapp omits `from`;
- malformed transaction encodings and malformed deterministic hard-rule configuration fail closed;
- canonical action/check/summary evidence is bounded in the SDK to the same limits enforced by the contract;
- contract independently recomputes the SHA-256 action ID;
- action IDs are lowercase-normalised on-chain to close case-variant replay;
- only the latest non-revoked, non-expired intent revision can authorise a new action;
- exact-expiry semantics reject at the declared second, not one second later;
- GenVM UTC time is converted to Unix seconds with integer-only `datetime` delta arithmetic, avoiding `datetime.timestamp()` float round-trips;
- concurrent sends are serialised per provider to avoid injected-wallet chain-switch races;
- EIP-1193 account/chain event hooks are proxied so protected dapps keep normal wallet reactivity;
- serialisation is keyed by the underlying wallet provider across separate INTENT wrapper instances, and observer callbacks are isolated from lock/release semantics;
- denial, unclear and adjudication-error paths restore/recheck the target chain before returning;
- target action/account/chain are re-bound immediately before forwarding;
- receipt anchoring is post-send only, cannot resubmit the target transaction, and the guard independently attempts target-chain restoration afterward;
- GenLayer decision consumption requires finality plus successful GenVM execution;
- consensus fields are `outcome` + coarse `reason_code`; free-form rationale is explicitly non-authoritative;
- malformed/non-object semantic model output collapses to `UNCLEAR / insufficient_evidence`;
- read-only control-plane queries use a wallet-free client, and owner history routes use bounded/tail pagination rather than unbounded reads;
- legacy full-history contract views were removed pre-deployment so owner history is exposed only through bounded pagination;
- contract constructor and every write remain hard-pinned to GenLayer Studionet 61999.

## Explicit residual boundaries

These are architectural or verification boundaries, not hidden claims:

1. **Raw provider bypass:** code that still receives raw `window.ethereum` can bypass INTENT. The protected integration must expose only the guarded provider.
2. **Wallet signer trust:** the wallet ultimately signs the target request. INTENT rechecks the dapp-provided request, but it is not a substitute for wallet-level transaction simulation or a smart-account module that cryptographically embeds the policy.
3. **Unknown ABI semantics:** custom/proxy calls are not guessed. Unknown meaning stays supporting/unclear unless the integration supplies bounded decode context.
4. **Post-send receipt restoration:** after the target transaction is submitted, a user may reject the wallet switch used to anchor/restore. INTENT reports receipt/restoration failure but cannot roll back or resubmit the already-sent target transaction.
5. **Studionet:** 61999 is the required GenLayer network for this project. The repository does not represent Studionet as a production settlement guarantee.
6. **Live evidence:** GenLayer fee measurements and browser-wallet E2E remain
   separate verification work. The reviewer-facing frontend is publicly
   deployed at `https://intent-beta-jade.vercel.app` and the root HTML was
   externally verified over HTTPS. The deployed Protected Account proof uses
   test-controlled 3-of-5 attestors and an actual Sepolia Safe.
7. **Single-use action hash:** one owner/action hash is adjudicated once by design. A workflow that intentionally repeats an otherwise byte-identical caller request must make the EIP-1193 request distinguishable (for example with an explicit valid transaction nonce) rather than replaying a prior semantic authorisation.

## Reviewer focus after live validation

The remaining strict-review questions are the test-controlled attestor trust
assumption, the Windows Direct Mode file-locking issue, and the absence of a
fresh current UNCLEAR protected-account result. The positive target-chain path is
real and uses the official Safe v1.4.1 hash and Guard lifecycle.
