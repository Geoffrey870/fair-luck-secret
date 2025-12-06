// Contract configuration
// ABI and addresses are imported from auto-generated files
import { FHERaffleABI } from '../../abi/FHERaffleABI';
import { FHERaffleLocalABI } from '../../abi/FHERaffleLocalABI';
import { FHERaffleAddresses } from '../../abi/FHERaffleAddresses';

// Legacy export for backward compatibility
export const CONTRACT_ADDRESS = 
  (import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`) || 
  ('0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`); // Default Hardhat local address

// Local contract address (without FHE)
export const LOCAL_CONTRACT_ADDRESS = 
  (import.meta.env.VITE_LOCAL_CONTRACT_ADDRESS as `0x${string}`) || 
  ('0x0000000000000000000000000000000000000000000' as `0x${string}`); // Default placeholder

/**
 * Get contract ABI based on network
 * @param chainId - The chain ID
 * @returns The contract ABI
 */
export function getFHERaffleABI(chainId: number | undefined) {
  if (chainId === 31337) {
    // Local network: use local contract without FHE
    return FHERaffleLocalABI.abi;
  }
  // Sepolia or other networks: use FHE contract
  return FHERaffleABI.abi;
}

/**
 * Get contract factory based on network
 * @param signer - The signer
 * @param chainId - The chain ID
 * @returns Contract instance
 */
export function getRaffleContract(signer: any, chainId: number | undefined) {
  const abi = getFHERaffleABI(chainId);
  const address = getContractAddress(chainId);
  
  if (!address) {
    throw new Error('Contract not deployed on this network');
  }
  
  // Ethers v6 Contract constructor
  const { Contract } = require('ethers');
  return new Contract(address, abi, signer);
}

/**
 * Get contract address for current chain
 * @param chainId - The chain ID
 * @returns Contract address for chain or undefined
 */
export function getContractAddress(chainId: number | undefined): `0x${string}` | undefined {
  if (!chainId) {
    return undefined;
  }

  // For local network (Hardhat), check if local contract address is set
  if (chainId === 31337) {
    const localAddress = import.meta.env.VITE_LOCAL_CONTRACT_ADDRESS;
    if (localAddress) {
      return localAddress as `0x${string}`;
    }
    // Fallback to default if not set
    return LOCAL_CONTRACT_ADDRESS;
  }

  // For other networks, use regular address mapping
  const entry = FHERaffleAddresses[chainId.toString() as keyof typeof FHERaffleAddresses];
  if (!entry || entry.address === "0x0000000000000000000000000000000000000000") {
    return undefined;
  }

  return entry.address as `0x${string}`;
}

