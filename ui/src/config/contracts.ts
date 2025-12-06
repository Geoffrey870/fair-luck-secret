// Contract configuration
// ABI and addresses are imported from auto-generated files
import { FHERaffleABI } from '../../abi/FHERaffleABI';
import { FHERaffleAddresses } from '../../abi/FHERaffleAddresses';

// Legacy export for backward compatibility
export const CONTRACT_ADDRESS = 
  (import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`) || 
  ('0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`); // Default Hardhat local address

/**
 * Get contract ABI
 * @returns The contract ABI
 */
export function getFHERaffleABI() {
  return FHERaffleABI.abi;
}

/**
 * Get contract address for current chain
 * @param chainId - The chain ID
 * @returns Contract address for the chain or undefined
 */
export function getContractAddress(chainId: number | undefined): `0x${string}` | undefined {
  if (!chainId) {
    return undefined;
  }

  const entry = FHERaffleAddresses[chainId.toString() as keyof typeof FHERaffleAddresses];
  if (!entry || entry.address === "0x0000000000000000000000000000000000000000") {
    return undefined;
  }

  return entry.address as `0x${string}`;
}
