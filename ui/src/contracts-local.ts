// Local network contract configuration
import { FHERaffleLocal__factory } from '../abi/FHERaffleLocal';

// Local contract address (will be updated after deployment)
const LOCAL_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000000';

/**
 * Get local contract factory
 */
export function getLocalContractFactory(signer: any) {
  return new FHERaffleLocal__factory(signer);
}

/**
 * Get contract address for local network
 */
export function getLocalContractAddress(): string {
  // Check if environment variable is set
  if (import.meta.env.VITE_LOCAL_CONTRACT_ADDRESS) {
    return import.meta.env.VITE_LOCAL_CONTRACT_ADDRESS as `0x${string}`;
  }
  return LOCAL_CONTRACT_ADDRESS;
}

/**
 * Get local contract instance
 */
export function getLocalContract(signer: any, address?: string) {
  const factory = getLocalContractFactory(signer);
  const contractAddress = address || getLocalContractAddress();
  return factory.attach(contractAddress);
}

