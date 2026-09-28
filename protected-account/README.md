# Protected Account Mode

This package is the target-chain enforcement layer for INTENT Protected Account Mode.
`IntentAuthorizationRegistry` admits only threshold-attested, EIP-712 certificates
for exact one-time Safe actions. `IntentSafeGuard` requires the registry authorization
before a Safe transaction and consumes it after successful execution.

The registry is an attestation bridge, not a trustless GenLayer light client. The
certificate must bind Studionet chain 61999, the canonical INTENT contract, finalized
decision reference, protected Safe, Sepolia chain 11155111, the Safe v1.4.1 transaction
hash (including safeTxGas, baseGas, gasPrice, gasToken and refundReceiver), Safe nonce,
intent revision and expiry. Test-controlled attestor keys are an explicit trust
assumption until a native proof verifier replaces the registry.

The registry refuses activation for a Safe with enabled modules, and the Guard blocks
module/fallback configuration and delegatecall through ordinary Safe transactions.
Module execution is still an independent Safe execution path, so deployments must keep
the module set empty and preserve that invariant after activation.

The Guard uses the real Safe v1.4.1 execution order: Safe increments its nonce before
calling `checkTransaction`, so the guarded transaction is bound to `safe.nonce() - 1`.
Recovery calls are recorded by their real Safe transaction hash and require the fixed
delay before `setGuard(0)` is permitted. A failed inner transaction still consumes its
Safe nonce; the one-time authorization is therefore consumed in `checkAfterExecution`.
