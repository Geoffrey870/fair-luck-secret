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

export async function getUserEntryAmount(raffleId: number, participant: string, chainId?: number): Promise<any | null> {
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
    // Since we don't have getEntryCount in ABI, we'll try a different approach
    // We'll try to call getEntry with increasing indices until we find the user's entry
    // or hit an error (which likely means we've exceeded the array bounds)

    let entryIndex = 0;
    const maxAttempts = 1000; // Reasonable limit to prevent infinite loops

    while (entryIndex < maxAttempts) {
      try {
        const entry = await contract.getEntry(raffleId, entryIndex);
        if (entry.participant.toLowerCase() === participant.toLowerCase()) {
          // Found user's entry, return the encrypted amount
          return entry.encAmount; // This is euint32
        }
        entryIndex++;
      } catch (entryError) {
        // If we get an error calling getEntry, it likely means we've exceeded the array bounds
        // This is our way of detecting when we've checked all entries
        break;
      }
    }

    return null; // User hasn't entered this raffle
  } catch (error) {
    console.error('Error getting user entry amount:', error);
    return null;
  }
}

