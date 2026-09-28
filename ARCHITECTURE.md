# INTENT architecture

## Product boundary

INTENT is a semantic authorisation layer. It is not a wallet, custody service, transaction simulator or universal malware detector. It answers one bounded question against a user-authored mandate, then allows a wrapped wallet provider to enforce the answer.

## Components

### 1. IntentGuard Intelligent Contract

Authoritative responsibilities:

- store immutable versions of user-authored intents;
- preserve the exact revision used by each decision;
- reject revoked or expired mandates;
- accept only owner-submitted evaluations;
- run validator consensus over the exact mandate and exact proposed action;
- store a small decision-bearing result;
- prevent duplicate action IDs for one owner;
- allow the owner to anchor a target-chain execution receipt only after `MATCHES_INTENT`.

The contract deliberately does not execute arbitrary target-chain transactions from GenLayer Studionet. Studio does not provide the cross-chain wallet semantics INTENT needs, and pretending otherwise would create a false trust boundary.

### 2. Wallet guard SDK

The SDK owns transaction interception and binding:

1. capture the transaction passed to `eth_sendTransaction`;
2. query the target `eth_chainId` and selected wallet account;
3. normalise transaction fields into a canonical action;
4. perform hard deterministic checks;
5. derive `actionId = sha256(canonicalAction)`;
6. request GenLayer adjudication only if the hard checks did not reject;
7. wait for a finalized GenLayer decision and verify successful GenVM execution;
8. restore the original target chain even on denial or adjudication failure;
9. require `MATCHES_INTENT`;
10. re-read account and chain;
11. re-canonicalise and compare the original action object;
12. forward the exact captured transaction through the base provider.

The module never stores private keys.

### 3. Control plane

The Next.js app is not in the critical execution path. It exists to:

- connect a Studionet wallet;
- create and revise intents;
- revoke intents;
- inspect decisions and execution receipts;
- run an interactive transaction-analysis demo;
- generate the SDK integration snippet.

A protected dapp can integrate the SDK without hosting the control plane.

## Why consensus belongs here

A deterministic policy can express `maxValueWei`, allowed destinations or forbidden selectors. It cannot reliably express every bounded natural-language condition a human may use, for example:

> Buy the annual plan, but do not create any recurring authority or unrelated transfer.

A single backend LLM could interpret that sentence, but then the wallet's authorisation boundary depends on one operator and one model response. INTENT moves only that semantic decision into the Intelligent Contract.

## Decision model

Each decision contains:

- intent ID and immutable revision;
- action ID;
- exact canonical action JSON;
- decoded summary (supporting only);
- deterministic check results;
- `outcome`;
- `reason_code`;
- concise rationale;
- transaction timestamp.

`actionId` is produced by the SDK from the complete canonical EIP-1193 request. The contract independently recomputes the same SHA-256 from canonical action JSON before it will adjudicate, and the SDK rechecks the action immediately before execution.

## Intent versioning

`create_intent` creates revision 1.

`revise_intent` creates a new immutable revision while leaving old revisions readable. Old decisions keep pointing at the revision they actually used, but only the latest revision may authorise a new action.

`revoke_intent` disables the whole intent family. Historical records remain available.

## Consensus strategy

The contract uses a custom non-deterministic leader/validator pattern.

Leader output is constrained to JSON:

```json
{
  "outcome": "MATCHES_INTENT | DOES_NOT_MATCH | UNCLEAR",
  "reason_code": "short_stable_code",
  "rationale": "short explanation"
}
```

Validators independently run the same bounded classification and require agreement on both decision-bearing `outcome` and coarse `reason_code`. The reason code is constrained to an outcome-compatible enum. Free-form rationale is bounded audit metadata and is explicitly non-authoritative; it cannot change whether a transaction is released. Malformed or non-object model output collapses to `UNCLEAR / insufficient_evidence` rather than becoming permission or crashing the semantic path.

## Chain separation

GenLayer adjudication network:

- alias: `studionet`
- chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`

Target transactions may be on another EVM network. The wallet SDK temporarily switches the signing wallet to Studionet for the adjudication transaction, restores the original target chain, and then performs a full pre-forward recheck.

This is deliberately visible rather than hidden. If an integration needs seamless multi-chain signing, it can provide a separate GenLayer-compatible signer through the evaluator interface.
