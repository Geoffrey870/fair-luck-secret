import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { createInstance, initSDK, SepoliaConfig } from '@zama-fhe/relayer-sdk/bundle';

// Mock chains configuration for local development
const MOCK_CHAINS: Record<number, string> = {
  31337: 'http://localhost:8545', // Hardhat local network
};

// Local FHEVM configuration using deployed contract addresses
// These addresses are from fhevmTemp/precompiled-fhevm-core-contracts-addresses.json
const HardhatConfig = {
  // Local FHEVM core contract addresses
  aclContractAddress: '0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D',
  kmsContractAddress: '0xCD3ab3bd6bcc0c0bf3E27912a92043e817B1cf69',
  inputVerifierContractAddress: '0x901F8942346f7AB3a01F6D7613119Bca447Bb030',
  // Using same addresses for verification (need to deploy these contracts to local network)
  verifyingContractAddressDecryption: '0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D',
  verifyingContractAddressInputVerification: '0x901F8942346f7AB3a01F6D7613119Bca447Bb030',
  // Local network configuration
  chainId: 31337,
  gatewayChainId: 55815, // Using same gateway chain id as Sepolia for now
  // Note: A local relayer needs to be set up for full FHE functionality
  // For development, we can use testnet relayer (may not work perfectly)
  relayerUrl: 'https://relayer.testnet.zama.cloud',
};

// Mock encrypted input for local development
class MockEncryptedInput {
  private values: number[] = [];
  private contractAddress: string;
  private userAddress: string;

  constructor(contractAddress: string, userAddress: string) {
    this.contractAddress = contractAddress;
    this.userAddress = userAddress;
  }

  add32(value: number): MockEncryptedInput {
    this.values.push(value);
    return this;
  }

  async encrypt(): Promise<{ handles: string[]; inputProof: string }> {
    // Mock encryption: just return the value as a hex string
    const hexValue = '0x' + this.values[0].toString(16).padStart(64, '0');
    console.log('[MOCK] Encrypting value:', this.values[0], '->', hexValue);
    return {
      handles: [hexValue],
      inputProof: '0x' + '0'.repeat(512) // Mock proof
    };
  }
}

// Mock FHE instance for local development
const createMockInstance = () => {
  console.log('[MOCK] Creating mock FHE instance for local development');
  console.log('[MOCK] Note: This is a mock implementation for development only.');
  console.log('[MOCK] Data is NOT actually encrypted - use Sepolia for real FHE.');
  return {
    createEncryptedInput: (contractAddress: string, userAddress: string) => {
      console.log('[MOCK] Creating encrypted input for', contractAddress, userAddress);
      return new MockEncryptedInput(contractAddress, userAddress);
    },
    generateKeypair: () => {
      console.log('[MOCK] Generating keypair');
      return {
        publicKey: '0x' + 'a'.repeat(128),
        privateKey: '0x' + 'b'.repeat(128)
      };
    },
    createEIP712: (publicKey: string, contractAddresses: string[], startTimestamp: number, durationDays: number) => {
      console.log('[MOCK] Creating EIP712 signature');
      return {
        domain: {
          chainId: 31337,
          name: 'MockFHE',
          verifyingContract: contractAddresses[0],
          version: '1'
        },
        message: {
          publicKey,
          contractAddresses,
          startTimestamp,
          durationDays
        },
        primaryType: 'UserDecryptRequestVerification',
        types: {
          UserDecryptRequestVerification: [
            { name: 'publicKey', type: 'string' },
            { name: 'contractAddresses', type: 'string[]' },
            { name: 'startTimestamp', type: 'uint256' },
            { name: 'durationDays', type: 'uint256' }
          ]
        }
      };
    },
    publicDecrypt: async (handles: (string | Uint8Array)[]) => {
      console.log('[MOCK] Public decrypt:', handles);
      const result: any = {};
      handles.forEach(handle => {
        const hex = typeof handle === 'string' ? handle : Buffer.from(handle).toString('hex');
        const value = BigInt(parseInt(hex.slice(2), 16));
        result[hex] = value;
      });
      return result;
    },
    userDecrypt: async (
      handles: any[],
      privateKey: string,
      publicKey: string,
      signature: string,
      contractAddresses: string[],
      userAddress: string,
      startTimestamp: string,
      durationDays: string
    ) => {
      console.log('[MOCK] User decrypt:', handles);
      const result: any = {};
      handles.forEach(item => {
        const hex = item.handle;
        const value = BigInt(parseInt(hex.slice(2), 16));
        result[hex] = value;
      });
      return result;
    },
    getPublicKey: () => {
      console.log('[MOCK] Getting public key');
      return {
        publicKey: new Uint8Array(32).fill(1),
        publicKeyId: 'mock-pubkey-12345'
      };
    },
    getPublicParams: (bits: any) => {
      console.log('[MOCK] Getting public params for bits:', bits);
      return {
        publicParams: new Uint8Array(256).fill(2),
        publicParamsId: 'mock-params-67890'
      };
    }
  };
};

export function useZamaInstance() {
  const [instance, setInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { chainId } = useAccount();

  useEffect(() => {
    let mounted = true;

    const initZama = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if this is a mock chain (local development)
        const isMockChain = chainId && MOCK_CHAINS[chainId];

        console.log('Creating FHE instance...');
        
        let zamaInstance;
        
        // For local network (Hardhat), use mock instance
        if (isMockChain) {
          zamaInstance = createMockInstance();
        } else {
          // For Sepolia or other networks, use standard config
          // Wait for CDN script to load if needed
          if (typeof window !== 'undefined' && !(window as any).relayerSDK) {
            console.warn('FHE SDK CDN script not loaded, waiting...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (!(window as any).relayerSDK) {
              throw new Error('FHE SDK CDN script not loaded. Please check network connection and ensure the CDN script is included in index.html');
            }
          }

          console.log('Initializing FHE SDK...');
          await initSDK();
          console.log('FHE SDK initialized successfully');

          const config = {
            ...SepoliaConfig,
            network: typeof window !== 'undefined' && (window as any).ethereum 
              ? (window as any).ethereum 
              : SepoliaConfig.network
          };
          console.log('Using SepoliaConfig for testnet');
          zamaInstance = await createInstance(config);
        }
        
        console.log('FHE instance created successfully');
        
        if (mounted) {
          setInstance(zamaInstance);
        }
      } catch (err: any) {
        console.error('Failed to initialize Zama instance:', err);
        console.error('Error details:', {
          name: err?.name,
          message: err?.message,
          stack: err?.stack
        });
        
        // Show error to user
        if (mounted) {
          setError(err?.message || 'Failed to initialize encryption service. Please refresh the page.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initZama();

    return () => {
      mounted = false;
    };
  }, [chainId]);

  return { instance, isLoading, error };
}
