# INTENT submission

INTENT is a semantic wallet authorisation layer for humans and autonomous agents.

A protected dapp or agent does not send an `eth_sendTransaction` request directly to the raw wallet provider. It sends through INTENT's reusable EIP-1193 wallet guard. The guard canonicalises the exact request, rejects deterministic violations locally, and asks the INTENT Intelligent Contract for GenLayer consensus only where authority depends on the meaning of a human-written mandate.

The semantic output is deliberately narrow:

- `MATCHES_INTENT`
- `DOES_NOT_MATCH`
- `UNCLEAR`

Only a **finalized, successfully executed `MATCHES_INTENT`** bound to the exact owner, latest immutable intent revision and exact canonical action ID may release the captured target transaction.

The guard then restores the original target chain and independently rechecks the selected account, chain, complete request and action hash immediately before forwarding.

## Why GenLayer

Deterministic restrictions such as chain allowlists, address rules, calldata-size limits and unlimited ERC-20 approvals do not need an LLM and are handled locally.

GenLayer is used only for the semantic boundary conventional wallet permissions cannot express safely, for example:

> Purchase one annual Pro subscription from ExampleCloud for no more than 200 USDC. Do not create recurring authority or any unrelated transfer.

INTENT does not ask one application backend to decide whether an ambiguous transaction fits that mandate. GenLayer validators independently evaluate the exact mandate and exact canonical action.

## Product surfaces

- reusable EIP-1193 wallet module in `packages/wallet-guard`;
- Intelligent Contract in `contracts/intent_guard.py`;
- Next.js control plane for mandate creation, revision, revocation, analysis, activity and integration;
- reviewer-focused Direct Mode, hash-parity and SDK security tests.

## Network

The submission targets stable GenLayer Studionet only:

- chain ID `61999`;
- RPC `https://studio.genlayer.com/api`;
- repository-local GenLayer CLI `0.39.1`.

## Bounded claims

INTENT does not claim to decode every custom ABI, prove merchant delivery, replace target-chain simulation, stop a user who intentionally bypasses the guarded provider, or turn Studionet into a production settlement network.

The protocol proves a narrower statement: against one immutable human mandate revision, GenLayer validators reached a bounded semantic decision about one content-addressed wallet action, and the EIP-1193 guard only releases the same request after that decision is finalized, successful and positively bound.

## Live evidence

Deployment address, final source commit, transaction IDs, fee measurements and real validator outcomes remain in `LIVE_EVIDENCE.md` and must only be populated from actual finalized Studionet 61999 runs.
