import { encodeAbiParameters, keccak256, type Hex } from 'viem';

/** Canonical action commitment shared with IntentSafeGuard.actionHash. */
export function protectedActionHash(input: {
  targetChainId: bigint;
  safe: `0x${string}`;
  safeNonce: bigint;
  to: `0x${string}`;
  value: bigint;
  data: Hex;
  operation: number;
}): Hex {
  return keccak256(encodeAbiParameters(
    [
      { type: 'uint256' },
      { type: 'address' },
      { type: 'uint256' },
      { type: 'address' },
      { type: 'uint256' },
      { type: 'bytes32' },
      { type: 'uint8' },
    ],
    [input.targetChainId, input.safe, input.safeNonce, input.to, input.value, keccak256(input.data), input.operation],
  ));
}
