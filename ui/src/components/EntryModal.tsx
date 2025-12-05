import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Contract } from "ethers";
import { useZamaInstance } from "@/hooks/useZamaInstance";
import { useEthersSigner } from "@/hooks/useEthersSigner";
import { getFHERaffleABI, getContractAddress } from "@/config/contracts";
import { FHERaffleLocalABI } from "../../abi/FHERaffleLocalABI";
import { useChainId } from "wagmi";

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  raffle: any;
}

const EntryModal = ({ isOpen, onClose, raffle }: EntryModalProps) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { instance, isLoading: zamaLoading } = useZamaInstance();
  const signerPromise = useEthersSigner();
  const [entryAmount, setEntryAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  
  const contractAddress = getContractAddress(chainId);
  const isLocalNetwork = chainId === 31337;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!signerPromise) {
      toast.error("Wallet not ready");
      return;
    }

    if (!instance) {
      toast.error("Encryption service not ready");
      return;
    }

    setIsSubmitting(true);

    try {
      const entryAmountWei = BigInt(Math.floor(parseFloat(entryAmount) * 1e18));

      if (!contractAddress) {
        toast.error("Contract not deployed on current network");
        setIsSubmitting(false);
        return;
      }

      // Submit to contract
      const signer = await signerPromise;
      
      // Use correct ABI based on network
      const abi = isLocalNetwork ? FHERaffleLocalABI.abi : getFHERaffleABI();
      
      const contract = new Contract(
        contractAddress,
        abi,
        signer
      );

      console.log('Entering raffle with amount:', entryAmountWei.toString(), 'local network:', isLocalNetwork);

      if (isLocalNetwork) {
        // Local network: use plain value (no encryption)
        console.log('[LOCAL] Entering with plain amount on local network');
        
        const tx = await contract.enterRaffle(raffle.id, entryAmountWei);
        
        await tx.wait();
        toast.success("Entry submitted! (Local mode - not encrypted)");
        setEntryAmount("");
        onClose();
      } else {
        // Sepolia: use FHE encryption
        console.log('[SEPOLIA] Encrypting entry amount...');
        const encryptedAmount = await instance
          .createEncryptedInput(contractAddress, address)
          .add32(entryAmountWei)
          .encrypt();

        const tx = await contract.enterRaffle(
          raffle.id,
          encryptedAmount.handles[0],
          encryptedAmount.inputProof
        );

        setIsConfirming(true);
        await tx.wait();
        setIsConfirming(false);
        toast.success("Entry submitted! Your amount is encrypted and secure.");
        setEntryAmount("");
        onClose();
      }
    } catch (error: any) {
      console.error("Error entering raffle:", error);
      if (error.message?.includes("Already entered")) {
        toast.error("You have already entered this raffle");
      } else {
        toast.error(error.message || "Failed to submit entry");
      }
    } finally {
      setIsSubmitting(false);
      setIsConfirming(false);
    }
  };

  if (!raffle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Enter {raffle.name}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Prize: {Number(raffle.prize) / 1e18} ETH
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-foreground">
              Entry Amount (ETH)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              min={raffle.entryFee ? (Number(raffle.entryFee) / 1e18).toString() : "0.001"}
              placeholder={raffle.entryFee ? (Number(raffle.entryFee) / 1e18).toString() : "0.1"}
              value={entryAmount}
              onChange={(e) => setEntryAmount(e.target.value)}
              required
              className="border-border bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Entry fee: {raffle.entryFee ? Number(raffle.entryFee) / 1e18 : '0.001'} ETH
            </p>
          </div>

          {isLocalNetwork ? (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
                <Shield className="h-4 w-4" />
                <span>Local Network Mode</span>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                Entry amounts are stored as plain values (not encrypted) for development only.
                Switch to Sepolia testnet for real FHE encryption.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span>Privacy Protected</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your entry amount will be encrypted using Fully Homomorphic Encryption (FHE).
                Other participants cannot see your entry amount until the draw is
                completed.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting || isConfirming}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={isSubmitting || isConfirming || !entryAmount || zamaLoading || !isConnected}
            >
              {zamaLoading ? (
                <>
                  <Lock className="h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : isSubmitting ? (
                <>
                  <Lock className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : isConfirming ? (
                <>
                  <Lock className="h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Submit Entry
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EntryModal;
