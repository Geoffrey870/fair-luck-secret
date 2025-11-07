import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, hardhat } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'FHE Raffle',
  projectId: 'e08e99d213c331aa0fd00f625de06e66', // WalletConnect Project ID
  chains: [hardhat, sepolia],
  ssr: false,
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(),
  },
});

