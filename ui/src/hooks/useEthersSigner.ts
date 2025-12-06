import { useAccount } from 'wagmi';
import { useMemo } from 'react';
import { BrowserProvider } from 'ethers';

export function useEthersSigner() {
  const { address, isConnected, chainId } = useAccount();

  return useMemo(() => {
    if (!isConnected || !address || typeof window === 'undefined' || !window.ethereum) {
      return undefined;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      return provider.getSigner();
    } catch (error) {
      console.error('Failed to create signer:', error);
      return undefined;
    }
  }, [address, isConnected, chainId]);
}

