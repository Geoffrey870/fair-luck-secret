import { BrowserProvider, Contract } from 'ethers';
import { getFHERaffleABI, getContractAddress } from '@/config/contracts';

export async function getRaffleMeta(raffleId: number, chainId?: number): Promise<any> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No ethereum provider found');
  }

  const contractAddress = chainId ? getContractAddress(chainId) : undefined;
  if (!contractAddress) {
    throw new Error('Contract not deployed on current network');
  }

  const provider = new BrowserProvider(window.ethereum);
  const contract = new Contract(
    contractAddress,
    getFHERaffleABI(),
    provider
  );

  const meta = await contract.getRaffleMeta(raffleId);
  return {
    creator: meta[0],
    title: meta[1],
    description: meta[2],
    prizeAmount: meta[3],
    entryFee: meta[4],
    maxEntries: meta[5],
    currentEntries: meta[6],
    expireAt: meta[7],
    isActive: meta[8],
    isDrawn: meta[9],
    winner: meta[10],
    createdAt: meta[11],
  };
}

export async function getRaffleCount(chainId?: number): Promise<number> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return 0;
  }

  const contractAddress = chainId ? getContractAddress(chainId) : undefined;
  if (!contractAddress) {
    return 0;
  }

  const provider = new BrowserProvider(window.ethereum);
  const contract = new Contract(
    contractAddress,
    getFHERaffleABI(),
    provider
  );

  const count = await contract.getRaffleCount();
  return Number(count);
}

export async function hasEntered(raffleId: number, participant: string, chainId?: number): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return false;
  }

  const contractAddress = chainId ? getContractAddress(chainId) : undefined;
  if (!contractAddress) {
    return false;
  }

  const provider = new BrowserProvider(window.ethereum);
  const contract = new Contract(
    contractAddress,
    getFHERaffleABI(),
    provider
  );

  const entered = await contract.hasEntered(raffleId, participant);
  return entered;
}

export async function getUserEntryAmount(raffleId: number, participant: string, chainId?: number): Promise<number | null> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  const contractAddress = chainId ? getContractAddress(chainId) : undefined;
  if (!contractAddress) {
    return null;
  }

  const provider = new BrowserProvider(window.ethereum);
  const contract = new Contract(
    contractAddress,
    getFHERaffleABI(),
    provider
  );

  try {
    // Get entry count for this raffle
    const entryCount = await contract.getEntryCount(raffleId);

    // Find the user's entry by iterating through all entries
    for (let i = 0; i < Number(entryCount); i++) {
      const entry = await contract.getEntry(raffleId, i);
      if (entry.participant.toLowerCase() === participant.toLowerCase()) {
        // Found user's entry, return the encrypted amount
        // Note: This returns the raw encrypted value, frontend needs to decrypt it
        return entry.encAmount;
      }
    }

    return null; // User hasn't entered this raffle
  } catch (error) {
    console.error('Error getting user entry amount:', error);
    return null;
  }
}

