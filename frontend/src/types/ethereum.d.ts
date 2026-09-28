import type { EIP1193Provider } from '@intent/wallet-guard';

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export {};
