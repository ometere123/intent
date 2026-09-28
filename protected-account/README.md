# Protected Account Mode

This package is the target-chain enforcement layer for INTENT Protected Account Mode.
`IntentAuthorizationRegistry` admits only threshold-attested, EIP-712 certificates
for exact one-time Safe actions. `IntentSafeGuard` requires the registry authorization
before a Safe transaction and consumes it after successful execution.

The registry is an attestation bridge, not a trustless GenLayer light client. The
certificate must bind Studionet chain 61999, the deployed INTENT contract, finalized
decision reference, protected Safe, Sepolia chain 11155111, Safe nonce, recipient,
value, calldata hash, operation, intent revision and expiry. Test-controlled attestor
keys are an explicit trust assumption until a native proof verifier replaces the registry.

The Safe must have no enabled modules that bypass the Safe Guard. Module execution is
an independent Safe execution path and is not secured by `checkTransaction` alone.
