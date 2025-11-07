import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, hardhat } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'FHE Raffle',
  projectId: 'e08e99d213c331aa0fd00f625de06e66', // WalletConnect Project ID
  chains: [hardhat, sepolia],
  ssr: false,
});

