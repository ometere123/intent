export const STUDIONET = {
  name: 'GenLayer Studionet',
  chainId: 61999,
  chainIdHex: '0xf22f',
  rpcUrl: 'https://studio.genlayer.com/api',
  explorerUrl: 'https://explorer-studio.genlayer.com',
} as const;

export function assertStudionet(chainId: number): void {
  if (chainId !== STUDIONET.chainId) throw new Error(`INTENT requires GenLayer Studionet 61999, got ${chainId}`);
}
