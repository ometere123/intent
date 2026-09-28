import { concatHex, encodeAbiParameters, keccak256, type Hex } from 'viem';

const SAFE_DOMAIN_TYPEHASH = '0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218' as Hex;
const SAFE_TX_TYPEHASH = '0xbb8310d486368db6bd6f849402fdd73ad53d316b5a4b2644ad6efe0f941286d8' as Hex;

/** Safe v1.4.1 getTransactionHash, including every Safe transaction field. */
export function protectedActionHash(input: {
  targetChainId: bigint;
  safe: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  data: Hex;
  operation: number;
  safeTxGas: bigint;
  baseGas: bigint;
  gasPrice: bigint;
  gasToken: `0x${string}`;
  refundReceiver: `0x${string}`;
  safeNonce: bigint;
}): Hex {
  const safeTxHash = keccak256(encodeAbiParameters(
    [
      { type: 'bytes32' }, { type: 'address' }, { type: 'uint256' },
      { type: 'bytes32' }, { type: 'uint8' }, { type: 'uint256' },
      { type: 'uint256' }, { type: 'uint256' }, { type: 'address' },
      { type: 'address' }, { type: 'uint256' },
    ],
    [
      SAFE_TX_TYPEHASH, input.to, input.value, keccak256(input.data), input.operation,
      input.safeTxGas, input.baseGas, input.gasPrice, input.gasToken,
      input.refundReceiver, input.safeNonce,
    ],
  ));
  const domain = keccak256(encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
    [SAFE_DOMAIN_TYPEHASH, input.targetChainId, input.safe],
  ));
  return keccak256(concatHex(['0x1901', domain, safeTxHash]));
}
