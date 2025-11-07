// Contract address will be set after deployment
// For local development, update this after running: npx hardhat deploy --network hardhat
export const CONTRACT_ADDRESS = 
  (import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`) || 
  ('0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`); // Default Hardhat local address

// Contract ABI will be imported from types after compilation
// Note: These imports will work after running: npx hardhat compile
// Using dynamic imports to handle cases where types haven't been generated yet
export async function getFHERaffleFactory() {
  try {
    const module = await import('../../../types/factories/contracts/FHERaffle__factory');
    return module.FHERaffle__factory;
  } catch (e) {
    console.warn('Contract types not found. Run: npx hardhat compile');
    throw new Error('Contract types not found. Please compile contracts first.');
  }
}

// For synchronous access, we'll export a getter function
// Components should use getFHERaffleFactory() for async access
export const FHERaffle__factory = {
  abi: [] as any[], // Will be populated after compilation
};

