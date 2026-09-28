# INTENT security model

## Protected assets

- the user's authority to send a target-chain transaction;
- the exact natural-language mandate revision;
- the exact target transaction that was judged;
- the integrity of the GenLayer decision used by the guard;
- the association between a decision and a later execution receipt.

## Threats and controls

### Dapp changes the transaction after adjudication

**Control:** the guard captures and canonicalises the proposed transaction before adjudication, hashes it, then re-canonicalises and compares it before forwarding. Integrations must forward through the guarded provider only.

### Unlimited token approval hidden inside calldata

**Control:** the SDK recognises the standard ERC-20 `approve(address,uint256)` selector and rejects `uint256.max` locally when `forbidUnlimitedApprovals` is active. This does not claim to decode arbitrary proxy or custom-contract semantics.

### Prompt injection inside calldata descriptions or evidence

**Control:** the contract prompt explicitly treats mandate metadata, action JSON, summaries and evidence as inert quoted data. Decision output is schema-bounded. The canonical action fields, not prose supplied by a dapp, are the authoritative transaction evidence.

### Reusing one favourable decision for another transaction

**Control:** action IDs are SHA-256 hashes of canonical action objects containing the complete EIP-1193 request. The contract independently recomputes that hash, the guard requires exact binding before forwarding, and contract storage prevents duplicate owner/action decision keys.

### Old policy silently used after edits

**Control:** intents are immutable by revision. Every decision records its exact revision. Revising an intent creates a new record, and the contract permits new authorisations only against the latest revision.

### Revoked intent used after revocation

**Control:** the contract checks the family-level revoked flag before evaluation. The SDK should also refresh intent state before requesting adjudication.

### Expired mandate

**Control:** an optional Unix expiry is checked against GenVM transaction time before adjudication.

### Wrong GenLayer network

**Control:** the contract constructor and every write method require `gl.message.chain_id == 61999`. Frontend and evaluator also verify `0xf22f` before sending.

### Wallet/account changed during network switching

**Control:** the guard re-reads `eth_accounts` after returning to the target chain and aborts if the selected account differs.

### Raw provider bypass

**Control:** Compatibility Mode is application-level fail-closed enforcement, not cryptographic wallet enforcement. Protected code must receive only the guarded provider. If the same application exposes `window.ethereum` directly to arbitrary code, that code can bypass INTENT. Protected Account Mode is the separate target-chain enforcement path under `protected-account/`; its Safe must keep all module execution paths disabled or separately guarded.

### Compromised frontend

**Control:** the contract stores user-signed intent and decision state independently of the frontend. However, a compromised frontend can propose misleading transactions. Wallet users should still inspect wallet prompts, and production integrations should pin frontend releases and use standard supply-chain controls.

### Malformed deterministic policy configuration

**Control:** hard-rule configuration is validated before semantic adjudication. Invalid chain IDs, addresses, selectors, calldata limits or native-value limits return a local `BLOCK` rather than silently dropping the intended restriction.

### Oversized evidence used to exhaust or diverge the contract path

**Control:** the guard preflights the exact contract evidence bounds before consensus: canonical action JSON <= 14,000 characters, deterministic checks <= 6,000, and decoded summary 1–8,000. The contract independently enforces the same bounds.

### Two simultaneous sends race wallet chain switching

**Control:** guarded `eth_sendTransaction` authorisations are serialised per provider. Only one authorisation owns the mutable wallet chain/account lifecycle at a time.

### Multiple INTENT wrappers race the same injected wallet

**Control:** send authorisation uses a module-level `WeakMap` queue keyed by the underlying EIP-1193 provider, so separate INTENT wrapper instances around the same wallet are serialised together. Optional telemetry callbacks are exception-isolated and cannot poison or deadlock this queue.

### Wallet event listeners disappear behind the wrapper

**Control:** the guarded provider forwards EIP-1193 `on` and `removeListener` hooks when the underlying wallet exposes them, preserving normal `accountsChanged` / `chainChanged` integration behaviour while send requests remain guarded.

### Action-ID case variant replay

**Control:** the contract validates a 64-character SHA-256 hex digest and normalises it to lowercase for storage and lookup. Upper/lowercase variants cannot create separate decision keys.

### Receipt recorder leaves the wallet on Studionet

**Control:** receipt anchoring occurs only after the target transaction has already been submitted. The guard itself best-effort restores the original target chain after the receipt recorder returns or throws, even when a custom evaluator does not clean up its network switch. Receipt failure never resubmits the target transaction.

### Malformed model/provider output

**Control:** malformed JSON, non-object output, unknown outcomes or incompatible reason codes never become permission. The contract normalises these cases to the fail-closed `UNCLEAR / insufficient_evidence` class. Validator consensus is required on both `outcome` and coarse `reason_code`; rationale is non-authoritative.

### Read-only control-plane activity changes the user's selected chain

**Control:** public reads use a wallet-free GenLayer read client. Only explicit control-plane writes switch the injected wallet to 61999, and those writes best-effort restore the previously selected chain after the finalized write.

### Signer identity omitted by the dapp

**Control:** canonicalisation requires a real 20-byte signer identity. When `from` is omitted, the guard binds the wallet's currently selected account into the canonical request; standalone canonicalisation without either a transaction `from` or trusted fallback signer is rejected.

## Non-goals

INTENT does not claim to:

- prove a merchant will deliver after payment;
- decode every possible smart-contract proxy or custom ABI;
- replace target-chain transaction simulation;
- prevent a user from deliberately bypassing their own policy;
- provide legal interpretation;
- make Studionet a production settlement network.

### Optimistic decision used before finality

**Control:** wallet-facing writes use the shared lifecycle verifier and require `FINALIZED` plus `FINISHED_WITH_RETURN` before a decision is consumed. `ACCEPTED` and `FINALIZED` without successful execution are not authorization. Target transaction hashes are submission/anchor metadata unless an independent target-chain receipt verifier is used; they are not execution proof by themselves.

### Protected Account Mode trust boundary

The Sepolia registry accepts EIP-712 certificates from a configured threshold of
attestors who independently inspect finalized Studionet 61999 decisions. This is
threshold-attested finalized GenLayer authorization, not a trustless cross-chain
light client. The Safe Guard binds one exact Safe action (chain, Safe, nonce,
recipient, value, calldata hash and operation) and consumes the authorization after
successful execution. Safe modules remain a separate execution path: the protected
deployment must keep the module set empty unless every enabled module is explicitly
covered by equivalent enforcement. Guard removal is delayed and observable.
