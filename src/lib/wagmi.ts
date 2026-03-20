// ─────────────────────────────────────────────────────────────
//  Wagmi + RainbowKit configuration for HyperVault
//  Defines the Passet Hub testnet chain and wallet connectors.
// ─────────────────────────────────────────────────────────────

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

// ── Passet Hub (Polkadot Hub TestNet) ─────────────────────────
export const passetHub = defineChain({
  id: 420420422,
  name: 'Passet Hub',
  nativeCurrency: {
    name: 'PAS',
    symbol: 'PAS',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-passet-hub-eth-rpc.polkadot.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://blockscout-passet-hub.parity-testnet.parity.io',
    },
  },
  testnet: true,
});

// ── Wagmi + RainbowKit config ────────────────────────────────
export const config = getDefaultConfig({
  appName: 'HyperVault',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'hypervault-hackathon',
  chains: [passetHub],
  ssr: false,
});
