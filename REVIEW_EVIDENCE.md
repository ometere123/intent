# INTENT reviewer evidence map

## Originality

INTENT is not an escrow, market, registry, generic moderation bot or standalone “paste text and judge” page. It is a reusable wallet authorisation primitive. The primary runtime surface is the EIP-1193 provider used by an existing dapp/agent.

## GenLayer necessity

Deterministic constraints are intentionally handled without consensus. GenLayer is invoked only for the bounded semantic classification between an immutable human mandate and an exact proposed wallet action.

## Real consequence

An accepted decision changes whether the original wallet transaction is sent. `DOES_NOT_MATCH`, `UNCLEAR` and adjudication failures are unconditionally fail-closed.

## State integrity

- owner-bound intent families;
- immutable revisions;
- revocation;
- expiry;
- duplicate action prevention;
- exact revision stored in every decision and only the latest revision may authorise new actions;
- contract-side recomputation of the canonical SHA-256 action ID;
- receipt only after `MATCHES_INTENT` and only for the adjudicated target chain;
- 61999 checks on deployment/writes.

## Trust boundary

- exact transaction fields are authoritative;
- natural-language summaries are supporting evidence only;
- prompt injection is explicitly excluded from authority;
- action hash binds the complete EIP-1193 request, is recomputed by the contract during adjudication and rechecked in the SDK before execution;
- account and target chain are rechecked after Studionet adjudication;
- raw-provider bypass is documented as an integration boundary, not hand-waved away.

## UX

The control plane exposes:

- dashboard;
- new intent creation;
- intent detail/revision route;
- transaction analyser;
- activity/decision route;
- integration route;
- settings/network route.

The product can still be used without this UI through the SDK.

## Network

This build intentionally targets only:

- GenLayer Studionet
- chain ID `61999`
- RPC `https://studio.genlayer.com/api`

No Studio Dev / 61997 constants are present in executable source.

## Finality

Wallet-facing contract writes wait for finalized GenLayer state and verify successful GenVM execution before the target transaction can be released.
