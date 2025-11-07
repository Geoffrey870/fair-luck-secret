import { BrowserProvider, Contract } from 'ethers';
import { CONTRACT_ADDRESS, getFHERaffleFactory } from '@/config/contracts';

export async function getRaffleMeta(raffleId: number): Promise<any> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No ethereum provider found');
  }

  const Factory = await getFHERaffleFactory();
  const provider = new BrowserProvider(window.ethereum);
  const contract = new Contract(
    CONTRACT_ADDRESS,
    Factory.abi,
    provider
  );

  const meta = await contract.getRaffleMeta(raffleId);
  return {
    creator: meta[0],
    title: meta[1],
    description: meta[2],
    maxEntries: meta[3],
    currentEntries: meta[4],
    expireAt: meta[5],
    isActive: meta[6],
    isDrawn: meta[7],
    winner: meta[8],
    createdAt: meta[9],
  };
}

export async function getRaffleCount(): Promise<number> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return 0;
  }

  const Factory = await getFHERaffleFactory();
  const provider = new BrowserProvider(window.ethereum);
  const contract = new Contract(
    CONTRACT_ADDRESS,
    Factory.abi,
    provider
  );

  const count = await contract.getRaffleCount();
  return Number(count);
}

