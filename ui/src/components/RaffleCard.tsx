import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, Trophy, Clock, Users, Unlock, Eye } from "lucide-react";
import { useAccount, useChainId, useWalletClient } from "wagmi";
import { toast } from "sonner";
import { hasEntered, getUserEntryAmount } from "@/lib/contractUtils";
import { useZamaInstance } from "@/hooks/useZamaInstance";
import { getContractAddress } from "@/config/contracts";

interface RaffleCardProps {
  id: number;
  name: string;
  prize: string;
  totalEntries: number;
  timeRemaining: string;
  isActive: boolean;
  onEnter: () => void;
}

const RaffleCard = ({
  id,
  name,
  prize,
  totalEntries,
  timeRemaining,
  isActive,
  onEnter,
}: RaffleCardProps) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { instance: zamaInstance } = useZamaInstance();
  const { data: walletClient } = useWalletClient();
  const [userHasEntered, setUserHasEntered] = useState<boolean | null>(null);
  const [decryptedAmount, setDecryptedAmount] = useState<number | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Decrypt user's entry amount
  const decryptUserEntryAmount = async () => {
    if (!address || !chainId) {
      toast.error("Please connect your wallet");
      return;
    }

    const contractAddress = getContractAddress(chainId);
    if (!contractAddress) {
      toast.error("Contract not deployed on current network");
      return;
    }

    setIsDecrypting(true);

    try {
      // First check if user has entered
      const entered = await hasEntered(id, address, chainId);
      if (!entered) {
        toast.error("You haven't entered this raffle yet");
        setUserHasEntered(false);
        setIsDecrypting(false);
        return;
      }
      setUserHasEntered(true);

      // Get encrypted amount
      const encryptedAmount = await getUserEntryAmount(id, address, chainId);
      
      if (!encryptedAmount) {
        toast.error("Could not find your entry");
        setIsDecrypting(false);
        return;
      }

      // Both local and Sepolia: send signature request with public key
      {
        if (!zamaInstance) {
          toast.error("FHE service not available");
          setIsDecrypting(false);
          return;
        }

        if (!walletClient) {
          toast.error("Wallet not ready for signing");
          setIsDecrypting(false);
          return;
        }

        const hex = typeof encryptedAmount === 'string' ? encryptedAmount : encryptedAmount.toString(16);
        let handleHex = hex;
        if (typeof encryptedAmount === 'bigint') {
          handleHex = encryptedAmount.toString(16).padStart(64, '0');
        }
        const handle = '0x' + handleHex;

        try {
          // Generate keypair and create EIP712 signature request
          const keypair = zamaInstance.generateKeypair();
          console.log('Generated keypair with publicKey:', keypair.publicKey);
          
          const eip712 = zamaInstance.createEIP712(
            keypair.publicKey,
            [contractAddress],
            Math.floor(Date.now() / 1000),
            "10"
          );
          console.log('Created EIP712 request:', eip712);

          // Request signature from MetaMask with public key
          toast.info("Please sign the decryption request in MetaMask");
          const signature = await walletClient.signTypedData({
            account: address,
            domain: eip712.domain,
            types: eip712.types,
            primaryType: eip712.primaryType,
            message: eip712.message,
          } as any);
          console.log('Got signature:', signature);

          // Decrypt using the signature
          const result = await zamaInstance.userDecrypt(
            [{ handle: handle, contractAddress: contractAddress }],
            keypair.privateKey,
            keypair.publicKey,
            signature.replace('0x', ''),
            [contractAddress],
            address,
            Math.floor(Date.now() / 1000).toString(),
            "10"
          );
          console.log('Decryption result:', result);

          const decryptedValue = result[handle];
          if (decryptedValue !== undefined) {
            const amountInEth = Number(decryptedValue) / 1e18;
            setDecryptedAmount(amountInEth);
            toast.success(`Your entry: ${amountInEth.toFixed(4)} ETH`);
          } else {
            toast.error("Decryption failed");
          }
        } catch (decryptError: any) {
          console.error('FHE decryption failed:', decryptError);
          toast.error("Failed to decrypt. Please try again.");
        }
      }
    } catch (error: any) {
      console.error('Error decrypting:', error);
      toast.error(error.message || "Failed to decrypt entry");
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-glow)] animate-fade-in">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-bold text-foreground">{name}</h3>
          {isActive && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
              <Lock className="h-4 w-4 text-primary animate-pulse-glow" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-2xl font-bold text-accent">
          <Trophy className="h-6 w-6" />
          <span>{prize}</span>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{totalEntries} Encrypted Entries</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{timeRemaining}</span>
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <Button 
            onClick={onEnter}
            disabled={!isActive}
            className="w-full"
          >
            {isActive ? "Enter Raffle" : "Ended"}
          </Button>

          {/* Decrypt Button - Always visible when connected */}
          {isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={decryptUserEntryAmount}
              disabled={isDecrypting || !zamaInstance}
              className="w-full gap-2"
            >
              {isDecrypting ? (
                <>
                  <Lock className="h-3 w-3 animate-spin" />
                  Decrypting...
                </>
              ) : decryptedAmount !== null ? (
                <>
                  <Eye className="h-3 w-3" />
                  My Entry: {decryptedAmount.toFixed(4)} ETH
                </>
              ) : (
                <>
                  <Unlock className="h-3 w-3" />
                  Decrypt My Entry
                </>
              )}
            </Button>
          )}
        </div>

        {isActive && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Your entry amount is encrypted and private</span>
          </div>
        )}

        {/* Show decrypted result */}
        {decryptedAmount !== null && (
          <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Unlock className="h-4 w-4" />
              <span className="font-medium">Your entry: {decryptedAmount.toFixed(4)} ETH</span>
            </div>
          </div>
        )}

        {/* Show if user hasn't entered */}
        {userHasEntered === false && (
          <div className="text-xs text-muted-foreground text-center">
            You haven't entered this raffle yet
          </div>
        )}
      </div>
    </Card>
  );
};

export // Refactored component structure default RaffleCard;
