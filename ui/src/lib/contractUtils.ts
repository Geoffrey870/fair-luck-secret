import { Contract, JsonRpcProvider } from 'ethers';
import { FHERaffleABI } from '../../abi/FHERaffleABI';
import { FHERaffleLocalABI } from '../../abi/FHERaffleLocalABI';
import { FHERaffleAddresses } from '../../abi/FHERaffleAddresses';

/**
 * Get provider based on chain ID
 * @param chainId - The chain ID
 * @returns JsonRpcProvider instance
 */
function getProvider(chainId: number): JsonRpcProvider {
  if (chainId === 31337) {
    // Local Hardhat network
    return new JsonRpcProvider('http://127.0.0.1:8545');
  }
  if (chainId === 11155111) {
    // Sepolia testnet - use public RPC
    return new JsonRpcProvider('https://rpc.sepolia.org');
  }
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

/**
 * Get contract ABI based on network
 * @param chainId - The chain ID
 * @returns The contract ABI
 */
export function getFHERaffleABI(chainId: number) {
  if (chainId === 31337) {
    // Local network: use local contract without FHE
    return FHERaffleLocalABI.abi;
  }
  // Sepolia or other networks: use FHE contract
  return FHERaffleABI.abi;
}

/**
 * Get raffle count
 * @param chainId - The chain ID
 * @returns Total number of raffles
 */
export async function getRaffleCount(chainId: number) {
  const abi = getFHERaffleABI(chainId);
  const address = getContractAddress(chainId);
  
  if (!address) {
    throw new Error(`Contract not deployed on chain ${chainId}`);
  }

  // Create a read-only contract with provider
  const provider = getProvider(chainId);
  const contract = new Contract(address, abi, provider);

  try {
    const count = await contract.getRaffleCount();
    return Number(count);
  } catch (error: any) {
    console.error('Error getting raffle count:', error);
    throw error;
  }
}

/**
 * Get raffle metadata
 * @param raffleId - The raffle ID
 * @param chainId - The chain ID
 * @returns Raffle metadata
 */
export async function getRaffleMeta(raffleId: number, chainId: number) {
  const abi = getFHERaffleABI(chainId);
  const address = getContractAddress(chainId);
  
  if (!address) {
    throw new Error(`Contract not deployed on chain ${chainId}`);
  }

  const provider = getProvider(chainId);
  const contract = new Contract(address, abi, provider);

  try {
    const meta = await contract.getRaffleMeta(raffleId);
    console.log('Raw meta from contract:', meta);
    
    // FHERaffleLocal returns: creator, title, description, prizeAmount, entryFee, maxEntries, currentEntries, expireAt, isActive, isDrawn, winner, createdAt
    // FHERaffle returns: creator, title, description, prizeAmount, entryFee, maxEntries, expireAt, currentEntries, isActive, isDrawn, winner, createdAt
    if (chainId === 31337) {
      // Local network - FHERaffleLocal order
      return {
        creator: meta[0],
        title: meta[1],
        description: meta[2],
        prizeAmount: meta[3],
        entryFee: meta[4],
        maxEntries: Number(meta[5]),
        currentEntries: Number(meta[6]),
        expireAt: Number(meta[7]),
        isActive: meta[8],
        isDrawn: meta[9],
        winner: meta[10],
        createdAt: Number(meta[11]),
      };
    } else {
      // Sepolia - FHERaffle order
      return {
        creator: meta[0],
        title: meta[1],
        description: meta[2],
        prizeAmount: meta[3],
        entryFee: meta[4],
        maxEntries: Number(meta[5]),
        expireAt: Number(meta[6]),
        currentEntries: Number(meta[7]),
        isActive: meta[8],
        isDrawn: meta[9],
        winner: meta[10],
        createdAt: Number(meta[11]),
      };
    }
  } catch (error: any) {
    console.error('Error getting raffle metadata:', error);
    throw error;
  }
}

/**
 * Check if address has entered a raffle
 * @param raffleId - The raffle ID
 * @param participant - The participant address
 * @param chainId - The chain ID
 * @returns Whether address has entered
 */
export async function hasEntered(raffleId: number, participant: string, chainId: number) {
  const abi = getFHERaffleABI(chainId);
  const address = getContractAddress(chainId);
  
  if (!address) {
    throw new Error(`Contract not deployed on chain ${chainId}`);
  }

  const provider = getProvider(chainId);
  const contract = new Contract(address, abi, provider);

  try {
    const entered = await contract.hasEntered(raffleId, participant);
    return entered;
  } catch (error: any) {
    console.error('Error checking if entered:', error);
    throw error;
  }
}

/**
 * Get entry count for a raffle
 * @param raffleId - The raffle ID
 * @param chainId - The chain ID
 * @returns Number of entries
 */
export async function getEntryCount(raffleId: number, chainId: number) {
  const abi = getFHERaffleABI(chainId);
  const address = getContractAddress(chainId);
  
  if (!address) {
    throw new Error(`Contract not deployed on chain ${chainId}`);
  }

  const provider = getProvider(chainId);
  const contract = new Contract(address, abi, provider);

  try {
    const count = await contract.getEntryCount(raffleId);
    return Number(count);
  } catch (error: any) {
    console.error('Error getting entry count:', error);
    throw error;
  }
}

/**
 * Get encrypted/plain entry amount for a specific user
 * @param raffleId - The raffle ID
 * @param userAddress - The user address
 * @param chainId - The chain ID
 * @returns Entry amount (bigint) or null if not found
 */
export async function getUserEntryAmount(raffleId: number, userAddress: string, chainId: number) {
  const abi = getFHERaffleABI(chainId);
  const address = getContractAddress(chainId);
  
  if (!address) {
    throw new Error(`Contract not deployed on chain ${chainId}`);
  }

  const provider = getProvider(chainId);
  const contract = new Contract(address, abi, provider);

  try {
    // Get entry count first
    const entryCount = await contract.getEntryCount(raffleId);
    const count = Number(entryCount);
    
    // Iterate through all entries to find the user's entry
    for (let i = 0; i < count; i++) {
      const result = await contract.getEntry(raffleId, i);
      // result[0] = amount (uint256 or euint32)
      // result[1] = participant address
      // result[2] = createdAt
      
      const participant = result[1];
      if (participant.toLowerCase() === userAddress.toLowerCase()) {
        // Found user's entry
        return result[0]; // Return the amount
      }
    }
    
    // User not found in entries
    return null;
  } catch (error: any) {
    console.error('Error getting user entry amount:', error);
    throw error;
  }
}

/**
 * Get contract address
 * @param chainId - The chain ID
 * @returns Contract address or undefined
 */
export function getContractAddress(chainId: number): string | undefined {
  // Check if environment variable is set for local contract
  if (chainId === 31337 && import.meta.env.VITE_LOCAL_CONTRACT_ADDRESS) {
    return import.meta.env.VITE_LOCAL_CONTRACT_ADDRESS as string;
  }

  const entry = FHERaffleAddresses[chainId.toString() as keyof typeof FHERaffleAddresses];
  if (!entry || entry.address === "0x0000000000000000000000000000000000000000") {
    return undefined;
  }

  return entry.address;
}
