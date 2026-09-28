#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { createPublicClient, http, keccak256, stringToHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import {
  candidateFromDecision,
  certificateDigest,
  certificateTypedData,
  verifyFinalizedDecision,
} from './attestor.mjs';

config({ path: '.env.local', quiet: true });

const [decisionRef, index = '1'] = process.argv.slice(2);
if (!decisionRef || !/^0x[0-9a-f]{64}$/i.test(decisionRef)) {
  console.error('Usage: node scripts/run-attestor.mjs <finalized-genlayer-tx-hash> <1..5>');
  process.exit(2);
}

const canonicalIntent = process.env.NEXT_PUBLIC_INTENT_CONTRACT || '0x7b26BC39E2A6aB74A677E558FC53E8b3a3fBe6Bf';
const rpc = process.env.GENLAYER_RPC_URL || 'https://studio.genlayer.com/api';
const key = process.env[`ATTESTOR_${index}_PRIVATE_KEY`];
if (!key) throw new Error(`ATTESTOR_${index}_PRIVATE_KEY is not configured`);

const readClient = createClient({
  chain: studionet,
  endpoint: rpc,
  account: '0x0000000000000000000000000000000000000001',
});
const targetClient = createPublicClient({ chain: sepolia, transport: http(process.env.SEPOLIA_RPC_URL) });
const registry = process.env.NEXT_PUBLIC_INTENT_AUTH_REGISTRY;
if (!registry) throw new Error('NEXT_PUBLIC_INTENT_AUTH_REGISTRY is not configured');
const registryPolicyAbi = [{ type: 'function', name: 'policyForSafe', stateMutability: 'view', inputs: [{ name: 'safe', type: 'address' }], outputs: [
  { name: 'owner', type: 'address' }, { name: 'intentIdHash', type: 'bytes32' },
  { name: 'pendingOwner', type: 'address' }, { name: 'pendingIntentIdHash', type: 'bytes32' },
  { name: 'executeAfter', type: 'uint256' }, { name: 'configured', type: 'bool' },
] }];

const receipt = await readClient.getTransaction({ hash: decisionRef });
if (!receipt) throw new Error('decision transaction not found');
if (String(receipt.to_address || '').toLowerCase() !== canonicalIntent.toLowerCase()) {
  throw new Error('decision transaction target is not the canonical INTENT contract');
}
const leader = receipt.consensus_data?.leader_receipt?.[0];
const safeResult = { ...receipt, hash: receipt.hash || decisionRef };

// The SDK's human-readable calldata is the canonical decoded call. Its display
// form has a trailing comma in the args array, so normalize only that display
// artifact; no caller-supplied decision fields are accepted.
const readable = receipt.data?.calldata?.readable;
if (typeof readable !== 'string') throw new Error('finalized transaction has no decoded calldata');
const call = JSON.parse(readable.replace(/,\]/g, ']').replace(/\]"method"/g, '],"method"'));
if (call.method !== 'evaluate' || !Array.isArray(call.args) || call.args.length < 4) {
  throw new Error('decision transaction is not an evaluate call');
}
const owner = receipt.from_address;
const intentId = String(call.args[0]);
const revision = BigInt(call.args[1]);
const actionId = String(call.args[2]).toLowerCase();
const decision = JSON.parse(String(await readClient.readContract({
  address: canonicalIntent,
  functionName: 'get_decision',
  args: [owner, actionId],
  transactionHashVariant: 'latest_final',
})));
if (decision.intent_id !== intentId || BigInt(decision.intent_revision) !== revision) {
  throw new Error('canonical decision does not match the finalized evaluate call');
}

const latestRevision = await readClient.readContract({
  address: canonicalIntent,
  functionName: 'get_latest_revision',
  args: [owner, intentId],
  transactionHashVariant: 'latest_final',
});
const revoked = await readClient.readContract({
  address: canonicalIntent,
  functionName: 'is_revoked',
  args: [owner, intentId],
  transactionHashVariant: 'latest_final',
});
const intent = JSON.parse(String(await readClient.readContract({
  address: canonicalIntent,
  functionName: 'get_intent',
  args: [owner, intentId, revision],
  transactionHashVariant: 'latest_final',
})));
if (!decision.owner || String(decision.owner).toLowerCase() !== String(owner).toLowerCase()) {
  throw new Error('decision owner does not match the transaction sender');
}
const action = decision.action;
const validAfter = BigInt(process.env.INTENT_VALID_AFTER || (Math.floor(Date.now() / 1000) - 30));
const requestedUntil = BigInt(process.env.INTENT_VALID_UNTIL || (Math.floor(Date.now() / 1000) + 3600));
const intentExpiry = BigInt(intent.expires_at_unix || 0);
const validUntil = intentExpiry > 0n ? (requestedUntil < intentExpiry ? requestedUntil : intentExpiry) : requestedUntil;
const candidate = candidateFromDecision({
  decision,
  decisionRef: { txHash: decisionRef, genLayerIntent: canonicalIntent },
  authorizationNonce: process.env.INTENT_AUTHORIZATION_NONCE || '1',
  validAfter,
  validUntil,
});
verifyFinalizedDecision({
  candidate,
  finalizedReceipt: safeResult,
  decision,
  canonicalIntent,
  decisionRef,
  canonicalIntentState: {
    revoked: Boolean(revoked),
    latestRevision: BigInt(latestRevision),
    intentId,
    owner,
    expiresAt: BigInt(intent.expires_at_unix || 0),
  },
});
if (String(decision.outcome).toUpperCase() !== 'MATCHES_INTENT') throw new Error('attestor signs only MATCHES_INTENT');

// Keep the target-chain read in the verifier path: the configured Sepolia RPC
// must be live and the bound Safe must exist before a certificate is signed.
const safeCode = await targetClient.getBytecode({ address: candidate.safe });
if (!safeCode) throw new Error('bound Safe has no Sepolia bytecode');
const policy = await targetClient.readContract({ address: registry, abi: registryPolicyAbi, functionName: 'policyForSafe', args: [candidate.safe] });
const policyOwner = policy.owner ?? policy[0];
const policyIntentIdHash = policy.intentIdHash ?? policy[1];
const policyConfigured = policy.configured ?? policy[5];
if (!policyConfigured || String(policyOwner).toLowerCase() !== String(candidate.policyOwner).toLowerCase()) throw new Error('Safe policy owner binding mismatch');
if (String(policyIntentIdHash).toLowerCase() !== String(candidate.intentIdHash).toLowerCase()) throw new Error('Safe intent family binding mismatch');

const certificate = {
  protocolVersion: '1',
  genLayerChainId: candidate.genLayerChainId,
  genLayerIntent: candidate.genLayerIntent,
  policyOwner: candidate.policyOwner,
  decisionRef: candidate.decisionRef,
  targetChainId: candidate.targetChainId,
  safe: candidate.safe,
  actionHash: candidate.actionHash,
  intentIdHash: candidate.intentIdHash,
  intentRevision: candidate.intentRevision,
  safeNonce: candidate.safeNonce,
  authorizationNonce: candidate.authorizationNonce,
  validAfter: candidate.validAfter,
  validUntil: candidate.validUntil,
  outcome: keccak256(stringToHex('MATCHES_INTENT')),
};
const account = privateKeyToAccount(key);
const signature = await account.signTypedData(certificateTypedData(certificate, process.env.NEXT_PUBLIC_INTENT_AUTH_REGISTRY));
const digest = certificateDigest(certificate, process.env.NEXT_PUBLIC_INTENT_AUTH_REGISTRY);
console.log(JSON.stringify({
  attestor: account.address,
  certificate,
  digest,
  signature,
  verified: { decisionRef, owner, intentId, revision: revision.toString(), latestRevision: String(latestRevision), revoked: Boolean(revoked), safe: candidate.safe },
}, (_key, value) => typeof value === 'bigint' ? value.toString() : value));
